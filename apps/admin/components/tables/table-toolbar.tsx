"use client";

import { useState } from "react";
import type { ResourceDefinition, ColumnDefinition } from "@/lib/resource";
import { Search, Plus, Trash2, Download, Upload, Columns3 } from "@/lib/icons";
import { DateFilter, type DateRange } from "./date-filter";
import { ExportMenu } from "./export-menu";
import { exportToFile } from "@/lib/excel-utils";

interface TableToolbarProps {
  resource: ResourceDefinition;
  search: string;
  onSearch: (value: string) => void;
  selectedCount: number;
  onBulkDelete?: () => void;
  onCreate?: () => void;
  allColumns: ColumnDefinition[];
  hiddenColumns: string[];
  onToggleColumn: (key: string) => void;
  data?: Record<string, unknown>[];
  // v3.31.34 — date filter state lifted from the parent page so
  // it can persist to URL search params and feed both the list
  // and stats queries.
  dateRange?: DateRange;
  onDateRangeChange?: (next: DateRange) => void;
  // v3.31.35 — same URLSearchParams the list query uses, so the
  // ExportMenu's all-pages loop applies the same filters/sort the
  // user is looking at.
  apiSearchParams?: URLSearchParams;
  // v3.31.35 — opens the Excel import modal. Hidden when the
  // resource opts out via table.import = false.
  onImport?: () => void;
}

export function TableToolbar({
  resource,
  search,
  onSearch,
  selectedCount,
  onBulkDelete,
  onCreate,
  allColumns,
  hiddenColumns,
  onToggleColumn,
  data,
  dateRange,
  onDateRangeChange,
  apiSearchParams,
  onImport,
}: TableToolbarProps) {
  const [columnsOpen, setColumnsOpen] = useState(false);

  // Date filter is on by default; opt-out via { enabled: false }.
  const dateFilterCfg = resource.table.dateFilter;
  const showDateFilter = dateFilterCfg?.enabled !== false && onDateRangeChange;

  // v3.31.35 — bulk Export still operates on the rows the user has
  // selected, which by definition fit on the current page. Uses the
  // visible columns so it matches the toolbar Export's behaviour.
  const handleBulkExport = () => {
    if (!data || data.length === 0) return;
    const visible = allColumns.filter((c) => !hiddenColumns.includes(c.key));
    exportToFile(data, visible, resource.slug, "csv");
  };

  const visibleColumns = allColumns.filter((c) => !hiddenColumns.includes(c.key));

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
      {/* Search */}
      {resource.table.searchable && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary px-3 py-2">
          <Search className="h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={resource.table.searchPlaceholder ?? "Search..."}
            className="w-48 bg-transparent text-sm text-foreground placeholder:text-text-muted focus:outline-none"
          />
        </div>
      )}

      {/* v3.31.34 — date-window filter */}
      {showDateFilter && (
        <DateFilter
          value={dateRange ?? {}}
          onChange={onDateRangeChange!}
          label={dateFilterCfg?.label ?? "Created"}
        />
      )}

      <div className="flex-1" />

      {/* Bulk actions */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">
            {selectedCount} selected
          </span>
          {resource.table.bulkActions?.includes("delete") && onBulkDelete && (
            <button
              onClick={onBulkDelete}
              className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-1.5 text-sm text-danger hover:bg-danger/20 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
          {resource.table.bulkActions?.includes("export") && (
            <button
              onClick={handleBulkExport}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export selection
            </button>
          )}
        </div>
      )}

      {/* Column visibility */}
      <div className="relative">
        <button
          onClick={() => setColumnsOpen(!columnsOpen)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover transition-colors"
          title="Toggle columns"
        >
          <Columns3 className="h-3.5 w-3.5" />
        </button>

        {columnsOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setColumnsOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-bg-elevated shadow-lg z-50 p-2">
              {allColumns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-bg-hover cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!hiddenColumns.includes(col.key)}
                    onChange={() => onToggleColumn(col.key)}
                    className="h-3.5 w-3.5 rounded border-border bg-bg-tertiary accent-accent"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {/* v3.31.35 — Excel import button. Hidden when the resource
          opts out via table.import = false. */}
      {onImport && resource.table.import !== false && (
        <button
          onClick={onImport}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover transition-colors"
          title="Import from Excel"
        >
          <Upload className="h-3.5 w-3.5" />
          Import
        </button>
      )}

      {/* v3.31.35 — Export menu (CSV / Excel / JSON). Replaces the
          v3.31.34 one-shot CSV button. Hidden when table.export = false. */}
      {apiSearchParams && (
        <ExportMenu
          resource={resource}
          columns={visibleColumns}
          currentPageData={data}
          apiSearchParams={apiSearchParams}
        />
      )}

      {/* Create button */}
      {onCreate && (
        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New {resource.label?.singular ?? resource.name}
        </button>
      )}
    </div>
  );
}
