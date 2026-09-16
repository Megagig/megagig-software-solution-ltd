"use client";

import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { getResourceByEndpoint } from "@/resources";
import { usePermissions } from "@/hooks/use-permissions";
import type { FieldDefinition } from "@/lib/resource";
import { Plus } from "@/lib/icons";

// Lazy for the same reason as the single select — see adminInlineCreateDialog.
const InlineCreateDialog = lazy(() =>
  import("./inline-create-dialog").then((m) => ({ default: m.InlineCreateDialog }))
);

interface MultiRelationshipSelectFieldProps {
  field: FieldDefinition;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

export function MultiRelationshipSelectField({ field, value = [], onChange, error }: MultiRelationshipSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  // Records created inline, kept until the refetch returns them — otherwise a
  // freshly added tag shows as a raw UUID chip for as long as the request takes.
  const [justCreated, setJustCreated] = useState<Record<string, unknown>[]>([]);
  const triggerRef = useRef<HTMLDivElement>(null);
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
    if (justCreated.length === 0) return list;
    const known = new Set(list.map((o) => String(o.id)));
    const extra = justCreated.filter((r) => !known.has(String(r.id ?? "")));
    return extra.length > 0 ? [...extra, ...list] : list;
  }, [options, justCreated]);

  // The related resource, looked up by the endpoint the field already points
  // at. Undefined when the related model has no registered admin resource — in
  // which case there is no form to open and the button must not appear.
  const relatedResource = useMemo(
    () => (field.relatedEndpoint ? getResourceByEndpoint(field.relatedEndpoint) : undefined),
    [field.relatedEndpoint]
  );

  // can() is false while permissions load, which is the right default here: a
  // button that appears and then vanishes reads as a bug.
  const { can } = usePermissions();
  const canCreate =
    field.allowCreate !== false && !!relatedResource && can(relatedResource.slug + ".create");

  // Carry the typed search into the new record, but only when the related form
  // actually declares that field.
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

  const selectedLabels = useMemo(() => {
    return value.map((id) => {
      const found = allOptions.find((item) => String(item.id) === String(id));
      if (!found) return { id, label: String(id) };
      return { id, label: String(found[displayField] || found.name || found.title || found.id || "") };
    });
  }, [value, allOptions, displayField]);

  const toggleItem = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const removeItem = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  const dropdown = open ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] rounded-md border border-border bg-bg-elevated shadow-lg"
      style={{ top: pos.top, left: pos.left, width: pos.width, backgroundColor: "var(--bg-elevated, #22222e)" }}
    >
      <div className="p-2">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-9 w-full rounded-md border border-border bg-bg-secondary px-3 py-1 text-sm text-foreground outline-none placeholder:text-text-secondary"
          style={{ backgroundColor: "var(--bg-secondary, #111118)" }}
          autoFocus
        />
      </div>
      <div className="max-h-60 overflow-y-auto p-1">
        {isLoading ? (
          <div className="px-3 py-2 text-sm text-text-secondary">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-2 text-sm text-text-secondary">No results found</div>
        ) : (
          <>
            {value.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="flex w-full items-center rounded-sm px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Clear all
              </button>
            )}
            {filtered.map((item) => {
              const id = String(item.id);
              const label = String(item[displayField] || item.name || item.title || item.id || "");
              const isSelected = value.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleItem(id)}
                  className={`flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-foreground hover:bg-bg-hover
                    ${isSelected ? "bg-bg-hover" : ""}`}
                >
                  <div className={`flex h-4 w-4 items-center justify-center rounded border
                    ${isSelected ? "border-accent bg-accent text-white" : "border-border"}`}>
                    {isSelected && (
                      <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  {label}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Outside the empty branch on purpose: "No results found" is exactly
          when someone needs to create the record. */}
      {canCreate && relatedResource && (
        <div className="border-t border-border p-1">
          <button
            type="button"
            onClick={() => { setOpen(false); setCreating(true); }}
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium text-accent hover:bg-bg-hover"
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
      <div
        ref={triggerRef}
        onClick={() => { if (!open) updatePosition(); setOpen(!open); }}
        className={`flex min-h-10 w-full cursor-pointer flex-wrap items-center gap-1 rounded-md border bg-bg-secondary px-3 py-2 text-sm text-foreground transition-colors
          ${error ? "border-red-500" : "border-border"}
          ${open ? "ring-2 ring-accent" : ""}`}
      >
        {selectedLabels.length > 0 ? (
          selectedLabels.map(({ id, label }) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-md bg-accent/20 text-accent px-2 py-0.5 text-xs font-medium"
            >
              {label}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeItem(id); }}
                className="ml-0.5 rounded-full hover:bg-red-500/20 hover:text-red-400"
              >
                <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </span>
          ))
        ) : (
          <span className="text-text-secondary">
            {`Select ${field.label}...`}
          </span>
        )}
      </div>
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
                setJustCreated((prev) => [record, ...prev]);
                // Append rather than replace: this select holds a list, and the
                // whole point of creating inline is to add to what is already
                // picked.
                const next = String(id);
                if (!value.includes(next)) onChange([...value, next]);
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
