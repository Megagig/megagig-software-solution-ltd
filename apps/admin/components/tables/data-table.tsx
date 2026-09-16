"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import type { ColumnDefinition, RowActionDefinition } from "@/lib/resource";
import { ColumnHeader } from "./column-header";
import { renderCell } from "./cell-renderers";
import { TableSkeleton } from "./table-skeleton";
import { TableEmptyState } from "./table-empty-state";
import { Eye, ArrowUpRight, Copy, Check } from "@/lib/icons";

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  if (!path.includes(".")) return obj[path];
  return path.split(".").reduce<unknown>(
    (acc, key) => acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined,
    obj
  );
}

// ClickableCell wraps a rendered cell when the column defines onClick. The two
// built-ins ("link" → open the row, "copy" → copy the value) get an affordance
// icon on hover; a custom function is called with (value, row). stopPropagation
// keeps the cell click from bubbling to the row.
function ClickableCell({
  column,
  value,
  row,
  onView,
  children,
}: {
  column: ColumnDefinition;
  value: unknown;
  row: Record<string, unknown>;
  onView?: (item: Record<string, unknown>) => void;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const behavior = column.onClick;
  if (!behavior) return <>{children}</>;

  const handle = (e: MouseEvent) => {
    e.stopPropagation();
    if (behavior === "link") {
      onView?.(row);
    } else if (behavior === "copy") {
      const text = value == null ? "" : String(value);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }
    } else if (typeof behavior === "function") {
      behavior(value, row);
    }
  };

  const title =
    behavior === "link" ? "Open" : behavior === "copy" ? "Copy" : undefined;

  return (
    <button
      type="button"
      onClick={handle}
      title={title}
      className="group/cell inline-flex max-w-full items-center gap-1.5 text-left hover:text-accent transition-colors"
    >
      <span className="truncate">{children}</span>
      {behavior === "link" && (
        <ArrowUpRight className="h-3 w-3 shrink-0 opacity-0 group-hover/cell:opacity-60 transition-opacity" />
      )}
      {behavior === "copy" &&
        (copied ? (
          <Check className="h-3 w-3 shrink-0 text-success" />
        ) : (
          <Copy className="h-3 w-3 shrink-0 opacity-0 group-hover/cell:opacity-60 transition-opacity" />
        ))}
    </button>
  );
}

interface DataTableProps {
  columns: ColumnDefinition[];
  data: Record<string, unknown>[];
  isLoading?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
  selectedRows?: string[];
  onSelectRows?: (rows: string[]) => void;
  onView?: (item: Record<string, unknown>) => void;
  onEdit?: (item: Record<string, unknown>) => void;
  onDelete?: (id: string) => void;
  /** Extra per-row actions from the resource's table.rowActions. */
  rowActions?: RowActionDefinition[];
}

export function DataTable({
  columns,
  data,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  selectedRows = [],
  onSelectRows,
  onView,
  onEdit,
  onDelete,
  rowActions,
}: DataTableProps) {
  if (isLoading) {
    return <TableSkeleton columns={columns.length + (onSelectRows ? 1 : 0) + (onView || onEdit || onDelete || (rowActions && rowActions.length) ? 1 : 0)} />;
  }

  if (data.length === 0) {
    return <TableEmptyState />;
  }

  const allIds = data.map((row) => String(row.id));
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedRows.includes(id));

  const toggleAll = () => {
    if (!onSelectRows) return;
    onSelectRows(allSelected ? [] : allIds);
  };

  const toggleRow = (id: string) => {
    if (!onSelectRows) return;
    onSelectRows(
      selectedRows.includes(id)
        ? selectedRows.filter((r) => r !== id)
        : [...selectedRows, id]
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {onSelectRows && (
              <th className="w-[48px] px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-border bg-bg-tertiary accent-accent"
                />
              </th>
            )}
            {columns.map((col) => (
              <ColumnHeader
                key={col.key}
                column={col}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            ))}
            {(onView || onEdit || onDelete || (rowActions && rowActions.length > 0)) && (
              <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider w-[140px]">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const id = String(row.id);
            const isSelected = selectedRows.includes(id);

            return (
              <tr
                key={id || idx}
                className={`border-b border-border/50 transition-colors ${
                  isSelected ? "bg-accent/5" : "hover:bg-bg-hover/50"
                }`}
              >
                {onSelectRows && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(id)}
                      className="h-4 w-4 rounded border-border bg-bg-tertiary accent-accent"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-sm text-foreground"
                    style={col.width ? { width: col.width } : undefined}
                  >
                    <ClickableCell
                      column={col}
                      value={getNestedValue(row, col.key)}
                      row={row}
                      onView={onView}
                    >
                      {renderCell(col, getNestedValue(row, col.key), row)}
                    </ClickableCell>
                  </td>
                ))}
                {(onView || onEdit || onDelete || (rowActions && rowActions.length > 0)) && (
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      {onView && (
                        <button
                          onClick={() => onView(row)}
                          className="rounded-md p-1.5 text-text-secondary hover:text-info hover:bg-info/10 transition-colors"
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="text-xs text-text-secondary hover:text-accent transition-colors"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(id)}
                          className="text-xs text-text-secondary hover:text-danger transition-colors"
                        >
                          Delete
                        </button>
                      )}
                      {(rowActions ?? [])
                        .filter((a) => !a.visible || a.visible(row))
                        .map((a) =>
                          a.href ? (
                            <Link
                              key={a.label}
                              href={a.href(row)}
                              className={
                                "text-xs transition-colors " +
                                (a.variant === "danger"
                                  ? "text-text-secondary hover:text-danger"
                                  : "text-text-secondary hover:text-accent")
                              }
                            >
                              {a.label}
                            </Link>
                          ) : (
                            <button
                              key={a.label}
                              onClick={() => a.onClick?.(row)}
                              className={
                                "text-xs transition-colors " +
                                (a.variant === "danger"
                                  ? "text-text-secondary hover:text-danger"
                                  : "text-text-secondary hover:text-accent")
                              }
                            >
                              {a.label}
                            </button>
                          )
                        )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
