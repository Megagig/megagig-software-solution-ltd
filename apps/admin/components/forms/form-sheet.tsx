"use client";

import { useState } from "react";
import type { ResourceDefinition } from "@/lib/resource";
import { FormBuilder } from "./form-builder";
import { useCreateResource, useUpdateResource } from "@/hooks/use-resource";
import { X, Maximize2, Minimize2 } from "@/lib/icons";

interface FormSheetProps {
  resource: ResourceDefinition;
  item: Record<string, unknown> | null;
  // Pre-fill values for CREATE mode (item === null) — scopes a new child to its
  // parent (e.g. { customer_id: "…" }).
  defaults?: Record<string, unknown>;
  onClose: () => void;
}

export function FormSheet({ resource, item, defaults, onClose }: FormSheetProps) {
  const isEdit = item !== null;
  // The drawer opens at half the viewport width; the maximize toggle widens it
  // to 80% for forms with wide content (inline line-item tables, two-column
  // layouts). A resource can override the default via form.sheetWidth.
  const defaultWidth = resource.form?.sheetWidth === "wide" ? "md:w-[80vw]" : "md:w-1/2";
  const [expanded, setExpanded] = useState(resource.form?.sheetWidth === "wide");
  const widthClass = expanded ? "md:w-[80vw]" : defaultWidth;
  const { mutate: create, isPending: isCreating } = useCreateResource(resource.endpoint, resource.label?.singular ?? resource.name);
  const { mutate: update, isPending: isUpdating } = useUpdateResource(resource.endpoint, resource.label?.singular ?? resource.name);

  const handleSubmit = (data: Record<string, unknown>) => {
    if (isEdit) {
      update(
        { id: String(item.id), body: data },
        { onSuccess: () => onClose() }
      );
    } else {
      create(data, { onSuccess: () => onClose() });
    }
  };

  return (
    // Right drawer on desktop, bottom sheet on mobile. Half-width by default,
    // square edges (no rounded corners on desktop), maximizes to 80%.
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-stretch md:justify-end">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={
          "relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-2xl transition-[width] duration-200 md:max-h-none md:h-full md:max-w-none md:rounded-none " +
          widthClass
        }
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? "Edit" : "Create"} {resource.label?.singular ?? resource.name}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="hidden rounded-lg p-1 text-foreground-muted transition-colors hover:bg-foreground/5 hover:text-foreground md:block"
              title={expanded ? "Restore width" : "Maximize"}
              aria-label={expanded ? "Restore width" : "Maximize"}
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-foreground-muted hover:bg-foreground/5 hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <FormBuilder
            form={resource.form}
            defaultValues={isEdit ? (item as Record<string, unknown>) : defaults}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isSubmitting={isCreating || isUpdating}
            submitLabel={isEdit ? "Update" : "Create"}
          />
        </div>
      </div>
    </div>
  );
}
