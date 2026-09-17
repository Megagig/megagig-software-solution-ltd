import { defineResource } from "@/lib/resource";

export const fAQResource = defineResource({
  name: "FAQ",
  slug: "faqs",
  endpoint: "/api/faqs",
  icon: "Database",
  label: { singular: "FAQ", plural: "Faqs" },
  table: {
    columns: [
      // grit:cols:auto-start
      { key: "question", label: "Question", sortable: true, searchable: true, onClick: "link" },
      { key: "answer", label: "Answer", searchable: true },
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
    { key: "question", label: "Question", type: "text", required: true },
    { key: "answer", label: "Answer", type: "textarea" },
    { key: "published", label: "Published", type: "toggle" },
    { key: "sort_order", label: "Sort Order", type: "number", numberKind: "int" },
      // grit:fields:auto-end
    ],
  },
  dashboard: {
    widgets: [
      {
        type: "stat",
        label: "Total Faqs",
        endpoint: "/api/faqs",
        icon: "Database",
        color: "accent",
      },
    ],
  },
});
