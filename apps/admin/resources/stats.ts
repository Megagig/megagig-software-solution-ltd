import { defineResource } from "@/lib/resource";

export const statResource = defineResource({
  name: "Stat",
  slug: "stats",
  endpoint: "/api/stats",
  icon: "Database",
  label: { singular: "Stat", plural: "Stats" },
  table: {
    columns: [
      // grit:cols:auto-start
      { key: "value", label: "Value", sortable: true, searchable: true, onClick: "link" },
      { key: "label", label: "Label", sortable: true, searchable: true },
      { key: "published", label: "Published", format: "boolean" },
      { key: "sort_order", label: "Sort Order", sortable: true },
      { key: "created_at", label: "Created", sortable: true, format: "relative" },
      // grit:cols:auto-end
    ],
    filters: [
    { key: "published", label: "Published", type: "boolean" },
    ],
    // Curated order — the public site shows the first 4 published stats
    // (Home's Our Story shows the first 2).
    defaultSort: { key: "sort_order", direction: "asc" },
    searchable: true,
    pageSize: 20,
  },
  form: {
    fields: [
      // grit:fields:auto-start
    { key: "value", label: "Value", type: "text", required: true, description: 'The big number, e.g. "10+" or "99.9%". Real figures only.' },
    { key: "label", label: "Label", type: "text", required: true, description: "Short caption shown under the value." },
    { key: "published", label: "Published", type: "toggle", description: "Unpublished stats are hidden from the public site." },
    {
      key: "sort_order",
      label: "Sort Order",
      type: "number",
      numberKind: "int",
      description: "Lowest first. Sections show at most 4 stats (Home's Our Story shows the first 2), so keep the strongest on top.",
    },
      // grit:fields:auto-end
    ],
  },
  dashboard: {
    widgets: [
      {
        type: "stat",
        label: "Total Stats",
        endpoint: "/api/stats",
        icon: "Database",
        color: "accent",
      },
    ],
  },
});
