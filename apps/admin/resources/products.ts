import { defineResource } from "@/lib/resource";

export const productResource = defineResource({
  name: "Product",
  slug: "products",
  endpoint: "/api/products",
  icon: "Package",
  label: { singular: "Product", plural: "Products" },
  table: {
    columns: [
      // grit:cols:auto-start
      { key: "slug", label: "Slug", sortable: true, searchable: true, onClick: "link" },
      { key: "name", label: "Name", sortable: true, searchable: true },
      { key: "tagline", label: "Tagline", sortable: true, searchable: true },
      { key: "description", label: "Description", searchable: true },
      { key: "feature_bullets", label: "Feature Bullets", format: "tags" },
      { key: "platforms", label: "Platforms", format: "tags" },
      { key: "live_url", label: "Live U R L", sortable: true, searchable: true },
      { key: "docs_url", label: "Docs U R L", sortable: true, searchable: true },
      { key: "published", label: "Published", format: "boolean" },
      { key: "sort_order", label: "Sort Order", sortable: true },
      { key: "created_at", label: "Created", sortable: true, format: "relative" },
      // grit:cols:auto-end
    ],
    filters: [
    { key: "published", label: "Published", type: "boolean" },
    ],
    defaultSort: { key: "created_at", direction: "desc" },
    searchable: true,
    pageSize: 20,
  },
  form: {
    fields: [
      // grit:fields:auto-start
    { key: "slug", label: "Slug", type: "text", required: true },
    { key: "name", label: "Name", type: "text", required: true },
    { key: "tagline", label: "Tagline", type: "text", required: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "feature_bullets", label: "Feature Bullets", type: "tags", placeholder: "e.g. Offline-first inventory" },
    { key: "platforms", label: "Platforms", type: "tags", placeholder: "e.g. Web, Desktop, Mobile" },
    { key: "live_url", label: "Live U R L", type: "text", required: true },
    { key: "docs_url", label: "Docs U R L", type: "text", required: true },
    { key: "screenshot_ids", label: "Screenshots", type: "multi-relationship-select", relatedEndpoint: "/api/uploads", displayField: "original_name", relationshipKey: "screenshots" },
    { key: "published", label: "Published", type: "toggle" },
    { key: "sort_order", label: "Sort Order", type: "number", numberKind: "int" },
      // grit:fields:auto-end
    ],
  },
  dashboard: {
    widgets: [
      {
        type: "stat",
        label: "Total Products",
        endpoint: "/api/products",
        icon: "Package",
        color: "accent",
      },
    ],
  },
});
