"use client";

import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { getResourceByEndpoint } from "@/resources";
import { usePermissions } from "@/hooks/use-permissions";
import type { FieldDefinition } from "@/lib/resource";
import { Plus } from "@/lib/icons";

// Lazy on purpose — see the note on adminInlineCreateDialog. A static import
// here closes a cycle back through form-builder and the nested form silently
// renders as nothing.
const InlineCreateDialog = lazy(() =>
  import("./inline-create-dialog").then((m) => ({ default: m.InlineCreateDialog }))
);

interface RelationshipSelectFieldProps {
  field: FieldDefinition;
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
}

export function RelationshipSelectField({ field, value, onChange, error }: RelationshipSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  // The record just created inline. Held locally so its label shows the instant
  // it is selected: the options query is refetching at that moment, and without
  // this the field displays a raw UUID until the network settles.
  const [justCreated, setJustCreated] = useState<Record<string, unknown> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const { data: options = [], isLoading } = useQuery({
    queryKey: [field.relatedEndpoint, "options"],
    queryFn: async () => {
      const { data } = await apiClient.get(`${field.relatedEndpoint}?page_size=100`);
      return data.data || data || [];
    },
    enabled: !!field.relatedEndpoint,
  });

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleScroll() { updatePosition(); }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, updatePosition]);

  const displayField = field.displayField || "name";

  // Options plus anything created inline that the refetch has not returned yet.
  const allOptions = useMemo(() => {
    const list = options as Record<string, unknown>[];
    if (!justCreated) return list;
    const id = String(justCreated.id ?? "");
    if (!id || list.some((o) => String(o.id) === id)) return list;
    return [justCreated, ...list];
  }, [options, justCreated]);

  // The related resource, looked up by the endpoint the field already points
  // at. Undefined when the related model has no registered admin resource — in
  // which case there is no form to open and the button must not appear.
  const relatedResource = useMemo(
    () => (field.relatedEndpoint ? getResourceByEndpoint(field.relatedEndpoint) : undefined),
    [field.relatedEndpoint]
  );

  // can() is false while permissions load, which is the right default here:
  // a button that appears and then vanishes reads as a bug, and this one opens
  // a form the API would reject anyway.
  const { can } = usePermissions();
  const canCreate =
    field.allowCreate !== false && !!relatedResource && can(relatedResource.slug + ".create");

  // Carry the typed search into the new record, but only when the related form
  // actually has that field. Guessing at the first field instead would drop the
  // text into whatever happens to be declared first.
  const prefill = useMemo(() => {
    const typed = search.trim();
    if (!typed || !relatedResource) return undefined;
    return relatedResource.form.fields.some((f) => f.key === displayField)
      ? { [displayField]: typed }
      : undefined;
  }, [search, relatedResource, displayField]);

  const filtered = useMemo(() =>
    allOptions.filter((item) => {
      if (!search) return true;
      const label = String(item[displayField] || item.name || item.title || item.id || "");
      return label.toLowerCase().includes(search.toLowerCase());
    }),
    [allOptions, search, displayField]
  );

  const selectedLabel = useMemo(() => {
    if (!value) return "";
    const found = allOptions.find((item) => String(item.id) === String(value));
    if (!found) return String(value);
    return String(found[displayField] || found.name || found.title || found.id || "");
  }, [value, allOptions, displayField]);

  const dropdown = open ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] rounded-md border border-border bg-surface-raised shadow-lg"
      style={{ top: pos.top, left: pos.left, width: pos.width, backgroundColor: "var(--color-surface-raised, #22222e)" }}
    >
      <div className="p-2">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground outline-none placeholder:text-foreground-muted"
          style={{ backgroundColor: "var(--color-surface, #111118)" }}
          autoFocus
        />
      </div>
      <div className="max-h-60 overflow-y-auto p-1">
        {isLoading ? (
          <div className="px-3 py-2 text-sm text-foreground-muted">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-2 text-sm text-foreground-muted">No results found</div>
        ) : (
          <>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false); setSearch(""); }}
                className="flex w-full items-center rounded-sm px-3 py-2 text-sm text-foreground-muted hover:bg-foreground/5"
              >
                Clear selection
              </button>
            )}
            {filtered.map((item) => {
              const id = String(item.id);
              const label = String(item[displayField] || item.name || item.title || item.id || "");
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => { onChange(id); setOpen(false); setSearch(""); }}
                  className={`flex w-full items-center rounded-sm px-3 py-2 text-sm text-foreground hover:bg-foreground/5
                    ${value === id ? "bg-foreground/5 font-medium" : ""}`}
                >
                  {label}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Deliberately OUTSIDE the empty/loading branch above. "No results
          found" is exactly the moment someone needs to create the record, and
          nesting this inside the populated branch would hide it precisely
          then. */}
      {canCreate && relatedResource && (
        <div className="border-t border-border p-1">
          <button
            type="button"
            onClick={() => { setOpen(false); setCreating(true); }}
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium text-brand hover:bg-foreground/5"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="truncate">
              New {relatedResource.label?.singular ?? field.label}
              {search.trim() ? ' “' + search.trim() + '”' : ""}
            </span>
          </button>
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { if (!open) updatePosition(); setOpen(!open); }}
        className={`flex h-10 w-full items-center justify-between rounded-md border bg-surface px-3 py-2 text-sm text-foreground transition-colors
          ${error ? "border-red-500" : "border-border"}
          ${open ? "ring-2 ring-brand" : ""}`}
      >
        <span className={value ? "text-foreground" : "text-foreground-muted"}>
          {value ? selectedLabel : `Select ${field.label}...`}
        </span>
        <svg className="h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {dropdown}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {creating && relatedResource && (
        <Suspense fallback={null}>
          <InlineCreateDialog
            resource={relatedResource}
            defaults={prefill}
            onCreated={(record) => {
              const id = record?.id;
              if (id !== undefined && id !== null) {
                setJustCreated(record);
                onChange(String(id));
              }
              setCreating(false);
              setSearch("");
            }}
            onClose={() => setCreating(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
