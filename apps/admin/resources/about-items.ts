import { defineResource } from "@/lib/resource";

export const aboutItemResource = defineResource({
  name: "AboutItem",
  slug: "about-items",
  endpoint: "/api/about_items",
  icon: "Database",
  label: { singular: "About item", plural: "About items" },
  table: {
    columns: [
      // grit:cols:auto-start
      { key: "kind", label: "Kind", sortable: true },
      { key: "title", label: "Title", sortable: true, searchable: true, onClick: "link" },
      { key: "description", label: "Description", searchable: true },
      { key: "label", label: "Milestone label", sortable: true, searchable: true },
      { key: "published", label: "Published", format: "boolean" },
      { key: "sort_order", label: "Sort Order", sortable: true },
      { key: "created_at", label: "Created", sortable: true, format: "relative" },
      // grit:cols:auto-end
    ],
    filters: [
      {
        key: "kind",
        label: "Kind",
        type: "select",
        options: [
          { label: "Value", value: "value" },
          { label: "Milestone", value: "milestone" },
          { label: "Process step", value: "step" },
        ],
      },
      { key: "published", label: "Published", type: "boolean" },
    ],
    // Curated order — the same sort_order the public /about-us page uses.
    defaultSort: { key: "sort_order", direction: "asc" },
    searchable: true,
    pageSize: 20,
  },
  form: {
    fields: [
      // grit:fields:auto-start
    {
      key: "kind",
      label: "Kind",
      type: "select",
      required: true,
      description: "Which /about-us section this appears in: Values, Timeline, or How we work.",
      options: [
        { label: "Value", value: "value" },
        { label: "Milestone (timeline)", value: "milestone" },
        { label: "Process step (How we work)", value: "step" },
      ],
    },
    { key: "title", label: "Title", type: "text", required: true },
    { key: "description", label: "Description", type: "textarea" },
    {
      key: "label",
      label: "Milestone label",
      type: "text",
      description: 'Milestones only — free text shown on the timeline, e.g. "2023" or "Since then". Ignored for values and steps.',
    },
    { key: "published", label: "Published", type: "toggle", description: "Unpublished items are hidden from the public site." },
    {
      key: "sort_order",
      label: "Sort Order",
      type: "number",
      numberKind: "int",
      description: "Lowest first, within its kind. Process steps are auto-numbered 01, 02, 03… from this order.",
    },
      // grit:fields:auto-end
    ],
  },
  dashboard: {
    widgets: [
      {
        type: "stat",
        label: "Total AboutItems",
        endpoint: "/api/about_items",
        icon: "Database",
        color: "accent",
      },
    ],
  },
});
