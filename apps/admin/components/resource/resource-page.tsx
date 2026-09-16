"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname, type ReadonlyURLSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { ResourceDefinition } from "@/lib/resource";
import { useResource, useDeleteResource, useBulkDeleteResource } from "@/hooks/use-resource";
import { PageHeader, type StatCard } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { TablePagination } from "@/components/tables/table-pagination";
import { TableFilters } from "@/components/tables/table-filters";
// grit:resource:imports
import { dateRangeToQueryParams, type DateRange } from "@/components/tables/date-filter";

// v3.31.34 -- read date filter state from URL search params so a
// refresh or shared link rehydrates the same view.
function readDateRangeFromURL(sp: ReadonlyURLSearchParams | null): DateRange {
  if (!sp) return {};
  const preset = sp.get("date") as DateRange["preset"] | null;
  if (preset === "custom") {
    return {
      preset: "custom",
      from: sp.get("date_from") ?? undefined,
      to: sp.get("date_to") ?? undefined,
    };
  }
  if (preset === "today" || preset === "7d" || preset === "30d" || preset === "month") {
    return { preset };
  }
  return {};
}

// writeDateRangeToURL pushes the new range into the address bar
// without a full navigation -- replace, not push, so the browser back
// button isn't polluted with one entry per filter tweak.
function writeDateRangeToURL(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  current: ReadonlyURLSearchParams | null,
  range: DateRange,
) {
  const params = new URLSearchParams(current?.toString() ?? "");
  params.delete("date");
  params.delete("date_from");
  params.delete("date_to");
  if (range.preset) {
    params.set("date", range.preset);
    if (range.preset === "custom") {
      if (range.from) params.set("date_from", range.from);
      if (range.to) params.set("date_to", range.to);
    }
  }
  const qs = params.toString();
  router.replace(qs ? pathname + "?" + qs : pathname, { scroll: false });
}

// Lazy-load modal/form components — they are only shown conditionally and
// would otherwise inflate the initial page bundle for every admin resource.
const FormModal = dynamic(() =>
  import("@/components/forms/form-modal").then((m) => m.FormModal)
);
const FormSheet = dynamic(() =>
  import("@/components/forms/form-sheet").then((m) => m.FormSheet)
);
const FormPage = dynamic(() =>
  import("@/components/forms/form-page").then((m) => m.FormPage)
);
const UpdateGroups = dynamic(() =>
  import("@/components/forms/update-groups").then((m) => m.UpdateGroups)
);
const FormModalSteps = dynamic(() =>
  import("@/components/forms/form-modal-steps").then((m) => m.FormModalSteps)
);
const FormPageSteps = dynamic(() =>
  import("@/components/forms/form-page-steps").then((m) => m.FormPageSteps)
);
const ConfirmModal = dynamic(() =>
  import("@/components/ui/confirm-modal").then((m) => m.ConfirmModal)
);
// v3.31.35 — Excel import modal, lazy-loaded so the xlsx parser
// only joins the bundle when the user actually clicks "Import".
const ImportModal = dynamic(() =>
  import("@/components/tables/import-modal").then((m) => m.ImportModal)
);

interface ResourcePageProps {
  resource: ResourceDefinition;
}

// v3.31.27: ResourcePage is now a thin router. It picks between four
// possible views (UpdateGroups, FormPageSteps, FormPage, ResourceListView)
// based on formView + the ?action param. Before this split, the list-mode
// useState / useResource / useMemo hooks all sat below the form-mode
// early returns — meaning the hook count varied between renders. React 19
// strict mode errors out on that mismatch. Splitting into two components
// keeps each function's hook list stable.
export function ResourcePage({ resource }: ResourcePageProps) {
  const searchParams = useSearchParams();
  const isFormPage = resource.formView === "page" || resource.formView === "page-steps";
  const isSteps = resource.formView === "modal-steps" || resource.formView === "page-steps";
  const formAction = searchParams.get("action");

  // v3.31.18: editing + form has groups → render per-group cards with
  // PATCH-per-group saves. Falls back to the standard FormPage when no
  // groups are defined.
  const editId = searchParams.get("edit");
  const hasUpdateGroups = (resource.form.groups ?? []).some(
    (g) => !g.scope || g.scope === "update" || g.scope === "both"
  );
  if (isFormPage && formAction === "edit" && editId && hasUpdateGroups) {
    return <UpdateGroups resource={resource} id={editId} />;
  }

  // If formView is "page" or "page-steps" and we have an action param, show the form page
  if (isFormPage && (formAction === "create" || formAction === "edit")) {
    return isSteps ? <FormPageSteps resource={resource} /> : <FormPage resource={resource} />;
  }

  return <ResourceListView resource={resource} />;
}

function ResourceListView({ resource }: ResourcePageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFormPage = resource.formView === "page" || resource.formView === "page-steps";
  const isSteps = resource.formView === "modal-steps" || resource.formView === "page-steps";

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(resource.table.pageSize ?? 20);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(resource.table.defaultSort?.key ?? "");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    resource.table.defaultSort?.direction ?? "desc"
  );
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  // v3.31.34 — date-window filter state, URL-persisted via the
  // ?date=preset and ?date_from/date_to search params so a refresh or
  // shared link rehydrates the same view.
  const [dateRange, setDateRangeState] = useState<DateRange>(() => readDateRangeFromURL(searchParams));
  const dateParams = useMemo(() => dateRangeToQueryParams(dateRange), [dateRange]);
  const setDateRange = useCallback((next: DateRange) => {
    setDateRangeState(next);
    writeDateRangeToURL(router, pathname, searchParams, next);
    setPage(1);
  }, [router, pathname, searchParams]);

  // Form modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);

  // Confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // v3.31.35 — Excel import modal state. Opened from the toolbar's
  // "Import" button when the resource hasn't opted out.
  const [importOpen, setImportOpen] = useState(false);

  // v3.31.35 — search params the ExportMenu uses for its all-pages
  // fetch loop. We mirror the same shape useResource builds so the
  // server applies the same filter/sort to the export as the table.
  const apiSearchParams = useMemo(() => {
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    if (sortBy) {
      sp.set("sort_by", sortBy);
      sp.set("sort_order", sortOrder);
    }
    Object.entries(filters).forEach(([k, v]) => {
      if (v) sp.set(k, v);
    });
    Object.entries(dateParams).forEach(([k, v]) => {
      if (v) sp.set(k, v);
    });
    const df = resource.table.dateFilter?.field;
    if (df && df !== "created_at") sp.set("date_field", df);
    return sp;
  }, [search, sortBy, sortOrder, filters, dateParams, resource.table.dateFilter?.field]);

  // Data fetching
  const { data, isLoading } = useResource(resource.endpoint, {
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    filters,
    dateParams,
    dateField: resource.table.dateFilter?.field,
  });

  const { mutate: deleteItem, isPending: isDeleting } = useDeleteResource(resource.endpoint, resource.label?.singular ?? resource.name);
  const { mutate: bulkDelete, isPending: isBulkDeleting } = useBulkDeleteResource(resource.endpoint, resource.label?.plural ?? resource.slug);

  // Visible columns
  const visibleColumns = useMemo(
    () => resource.table.columns.filter((col) => !col.hidden && !hiddenColumns.includes(col.key)),
    [resource.table.columns, hiddenColumns]
  );

  // Handlers
  const handleSort = useCallback(
    (key: string) => {
      if (sortBy === key) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(key);
        setSortOrder("asc");
      }
      setPage(1);
    },
    [sortBy]
  );

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => {
      if (!value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
    setPage(1);
  }, []);

  // View now navigates to a full detail page (/resources/<slug>/<id>) instead
  // of a modal — the page presents the record, allows editing, and loads every
  // related table (line-items, child resources).
  const handleView = useCallback(
    (item: Record<string, unknown>) => {
      router.push("/resources/" + resource.slug + "/" + String(item.id));
    },
    [router, resource.slug]
  );

  const handleEdit = useCallback((item: Record<string, unknown>) => {
    if (isFormPage) {
      router.push(`/resources/${resource.slug}?action=edit&edit=${item.id}`);
    } else {
      setEditingItem(item);
      setFormOpen(true);
    }
  }, [isFormPage, router, resource.slug]);

  const handleCreate = useCallback(() => {
    if (isFormPage) {
      router.push(`/resources/${resource.slug}?action=create`);
    } else {
      setEditingItem(null);
      setFormOpen(true);
    }
  }, [isFormPage, router, resource.slug]);

  const handleDelete = useCallback((id: string) => {
    setDeletingId(id);
    setConfirmOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deletingId !== null) {
      deleteItem(deletingId, {
        onSuccess: () => {
          setConfirmOpen(false);
          setDeletingId(null);
        },
      });
    }
  }, [deleteItem, deletingId]);

  const handleBulkDelete = useCallback(() => {
    if (selectedRows.length > 0) {
      setBulkConfirmOpen(true);
    }
  }, [selectedRows]);

  const confirmBulkDelete = useCallback(() => {
    bulkDelete(selectedRows, {
      onSuccess: () => {
        setBulkConfirmOpen(false);
        setSelectedRows([]);
      },
    });
  }, [bulkDelete, selectedRows]);

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setEditingItem(null);
  }, []);

  const actions = resource.table.actions ?? ["create", "view", "edit", "delete"];
  const singularName = resource.label?.singular ?? resource.name;
  const pluralName = resource.label?.plural ?? resource.slug;

  // Build stats cards: either from resource.stats.cards config, or auto-defaults.
  // Set resource.stats = false (or { enabled: false }) to disable stats on this page.
  const statsConfig = resource.stats;
  const statsEnabled =
    statsConfig === undefined ||
    statsConfig === true ||
    (typeof statsConfig === "object" && statsConfig !== null && statsConfig.enabled !== false);

  const statsCards: StatCard[] | undefined = useMemo(() => {
    if (!statsEnabled) return undefined;

    // v3.31.34 — when the user picks a date range in the toolbar,
    // append it to every stat card's endpoint so stats track the
    // active filter (otherwise the "Total" card would say 10,000
    // while the table below shows 142 in-range matches -- misleading).
    // Returns a copy of cards with dateParams baked into each
    // endpoint URL.
    const applyDateParams = (cards: StatCard[]): StatCard[] => {
      if (Object.keys(dateParams).length === 0) return cards;
      return cards.map((card) => {
        if (!card.endpoint) return card;
        const sep = card.endpoint.includes("?") ? "&" : "?";
        const qs = new URLSearchParams(dateParams).toString();
        return { ...card, endpoint: card.endpoint + sep + qs };
      });
    };

    // Explicit cards override auto-defaults
    if (
      typeof statsConfig === "object" &&
      statsConfig !== null &&
      Array.isArray(statsConfig.cards) &&
      statsConfig.cards.length > 0
    ) {
      return applyDateParams(statsConfig.cards);
    }
    // Auto-defaults: 4 cards based on the resource endpoint
    const ep = resource.endpoint;
    const defaults: StatCard[] = [
      { label: "Total", endpoint: `${ep}?page_size=1`, field: "meta.total", icon: resource.icon || "Package" },
      { label: "This Week", endpoint: `${ep}?page_size=1&created_since=7d`, field: "meta.total", icon: "TrendingUp", color: "success" },
      { label: "This Month", endpoint: `${ep}?page_size=1&created_since=30d`, field: "meta.total", icon: "Calendar", color: "info" },
      { label: "Updated Recently", endpoint: `${ep}?page_size=1&updated_since=7d`, field: "meta.total", icon: "RefreshCw" },
    ];
    return applyDateParams(defaults);
  }, [statsEnabled, statsConfig, resource.endpoint, resource.icon, dateParams]);

  const headerActions = actions.includes("create") ? (
    <button
      onClick={handleCreate}
      className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 h-9 text-sm font-medium text-white hover:brightness-90 transition-colors"
    >
      <span className="text-base leading-none">+</span>
      New {singularName}
    </button>
  ) : undefined;

  return (
    <div>
      <PageHeader
        title={pluralName}
        description={`Manage ${pluralName.toLowerCase()}`}
        actions={headerActions}
        stats={statsCards}
      />

      <div className="rounded-xl border border-border bg-surface">
        <TableToolbar
          resource={resource}
          search={search}
          onSearch={handleSearch}
          selectedCount={selectedRows.length}
          onBulkDelete={handleBulkDelete}
          onCreate={actions.includes("create") ? handleCreate : undefined}
          allColumns={resource.table.columns}
          hiddenColumns={hiddenColumns}
          onToggleColumn={(key) =>
            setHiddenColumns((prev) =>
              prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
            )
          }
          data={data?.data}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          apiSearchParams={apiSearchParams}
          onImport={resource.table.import !== false ? () => setImportOpen(true) : undefined}
        />

        {/* grit:table:toolbar */}

        {resource.table.filters && resource.table.filters.length > 0 && (
          <TableFilters
            filters={resource.table.filters}
            values={filters}
            onChange={handleFilter}
          />
        )}

        <DataTable
          columns={visibleColumns}
          data={data?.data ?? []}
          isLoading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          selectedRows={selectedRows}
          onSelectRows={setSelectedRows}
          onView={actions.includes("view") ? handleView : undefined}
          onEdit={actions.includes("edit") ? handleEdit : undefined}
          onDelete={actions.includes("delete") ? handleDelete : undefined}
          rowActions={resource.table.rowActions}
        />

        <TablePagination
          page={page}
          pageSize={pageSize}
          total={data?.meta?.total ?? 0}
          totalPages={data?.meta?.pages ?? 1}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {!isFormPage && formOpen && (
        isSteps ? (
          <FormModalSteps
            resource={resource}
            item={editingItem}
            onClose={handleFormClose}
          />
        ) : resource.formView === "modal" ? (
          <FormModal
            resource={resource}
            item={editingItem}
            onClose={handleFormClose}
          />
        ) : (
          // Default + explicit "sheet" — right drawer / bottom sheet.
          <FormSheet
            resource={resource}
            item={editingItem}
            onClose={handleFormClose}
          />
        )
      )}

      <ConfirmModal
        open={confirmOpen}
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setDeletingId(null); }}
        title={`Delete ${singularName}`}
        description={`Are you sure you want to delete this ${singularName.toLowerCase()}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      />

      <ConfirmModal
        open={bulkConfirmOpen}
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkConfirmOpen(false)}
        title={`Delete ${selectedRows.length} ${pluralName.toLowerCase()}`}
        description={`Are you sure you want to delete ${selectedRows.length} ${pluralName.toLowerCase()}? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={isBulkDeleting}
      />

      {importOpen && (
        <ImportModal
          resource={resource}
          onClose={() => setImportOpen(false)}
        />
      )}
    </div>
  );
}
