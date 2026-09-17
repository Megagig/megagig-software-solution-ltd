import { defineResource } from "@/lib/resource";

export const testimonialResource = defineResource({
  name: "Testimonial",
  slug: "testimonials",
  endpoint: "/api/testimonials",
  icon: "Database",
  label: { singular: "Testimonial", plural: "Testimonials" },
  table: {
    columns: [
      // grit:cols:auto-start
      { key: "quote_text", label: "Quote Text", searchable: true, onClick: "link" },
      { key: "author_name", label: "Author Name", sortable: true, searchable: true },
      { key: "author_role", label: "Author Role", sortable: true, searchable: true },
      { key: "company_name", label: "Company Name", sortable: true, searchable: true },
      { key: "company_url", label: "Company U R L", sortable: true, searchable: true },
      { key: "avatar.original_name", label: "Avatar" },
      { key: "case_study.client_name", label: "Case Study" },
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
    { key: "quote_text", label: "Quote Text", type: "textarea" },
    { key: "author_name", label: "Author Name", type: "text", required: true },
    { key: "author_role", label: "Author Role", type: "text", required: true },
    { key: "company_name", label: "Company Name", type: "text", required: true },
    { key: "company_url", label: "Company U R L", type: "text", required: true },
    { key: "avatar_id", label: "Avatar", type: "relationship-select", relatedEndpoint: "/api/uploads", displayField: "original_name" },
    { key: "case_study_id", label: "Case Study", type: "relationship-select", relatedEndpoint: "/api/case_studies", displayField: "client_name" },
    { key: "published", label: "Published", type: "toggle" },
    { key: "sort_order", label: "Sort Order", type: "number", numberKind: "int" },
      // grit:fields:auto-end
    ],
  },
  dashboard: {
    widgets: [
      {
        type: "stat",
        label: "Total Testimonials",
        endpoint: "/api/testimonials",
        icon: "Database",
        color: "accent",
      },
    ],
  },
});
