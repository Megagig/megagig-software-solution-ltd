"use client";

import type { ResourceDefinition } from "@/lib/resource";
import { renderCell } from "@/components/tables/cell-renderers";
import { X, Pencil } from "@/lib/icons";

interface ViewModalProps {
  resource: ResourceDefinition;
  item: Record<string, unknown>;
  onClose: () => void;
  onEdit?: (item: Record<string, unknown>) => void;
}

export function ViewModal({ resource, item, onClose, onEdit }: ViewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-bg-secondary shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {resource.label?.singular ?? resource.name} Details
          </h2>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => { onClose(); onEdit(item); }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {resource.table.columns.map((col) => {
              const value = item[col.key];

              return (
                <div key={col.key} className="space-y-1.5">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                    {col.label}
                  </p>
                  <div className="text-sm text-foreground">
                    {value !== null && value !== undefined
                      ? renderCell(col, value, item)
                      : <span className="text-text-muted">—</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
