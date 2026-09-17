import { defineResource } from "@/lib/resource";

export const caseStudyResource = defineResource({
  name: "CaseStudy",
  slug: "case-studies",
  endpoint: "/api/case_studies",
  icon: "Database",
  label: { singular: "CaseStudy", plural: "CaseStudies" },
  table: {
    columns: [
      // grit:cols:auto-start
      { key: "slug", label: "Slug", sortable: true, searchable: true, onClick: "link" },
      { key: "client_name", label: "Client Name", sortable: true, searchable: true },
      { key: "tagline", label: "Tagline", sortable: true, searchable: true },
      { key: "category_tags", label: "Category Tags", format: "tags" },
      { key: "status_badge", label: "Status Badge", sortable: true, searchable: true },
      { key: "hero_image.original_name", label: "Hero Image" },
      { key: "problem", label: "Problem", searchable: true },
      { key: "what_we_built", label: "What We Built", searchable: true },
      { key: "result", label: "Result", searchable: true },
      { key: "tech_stack", label: "Tech Stack", format: "tags" },
      { key: "testimonial.author_name", label: "Testimonial" },
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
    { key: "client_name", label: "Client Name", type: "text", required: true },
    { key: "tagline", label: "Tagline", type: "text", required: true },
    { key: "category_tags", label: "Category Tags", type: "tags", placeholder: "e.g. Fintech" },
    { key: "status_badge", label: "Status Badge", type: "text", required: true },
    { key: "hero_image_id", label: "Hero Image", type: "relationship-select", required: true, relatedEndpoint: "/api/uploads", displayField: "original_name" },
    { key: "problem", label: "Problem", type: "textarea" },
    { key: "what_we_built", label: "What We Built", type: "textarea" },
    { key: "result", label: "Result", type: "textarea" },
    { key: "tech_stack", label: "Tech Stack", type: "tags", placeholder: "e.g. Next.js" },
    { key: "testimonial_id", label: "Testimonial", type: "relationship-select", relatedEndpoint: "/api/testimonials", displayField: "author_name" },
    { key: "published", label: "Published", type: "toggle" },
    { key: "sort_order", label: "Sort Order", type: "number", numberKind: "int" },
      // grit:fields:auto-end
    ],
  },
  dashboard: {
    widgets: [
      {
        type: "stat",
        label: "Total CaseStudies",
        endpoint: "/api/case_studies",
        icon: "Database",
        color: "accent",
      },
    ],
  },
});
