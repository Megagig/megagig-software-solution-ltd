import { defineResource } from "@/lib/resource";

export const jobOpeningResource = defineResource({
  name: "JobOpening",
  slug: "job-openings",
  endpoint: "/api/job_openings",
  icon: "Database",
  label: { singular: "JobOpening", plural: "JobOpenings" },
  table: {
    columns: [
      // grit:cols:auto-start
      { key: "title", label: "Title", sortable: true, searchable: true, onClick: "link" },
      { key: "department", label: "Department", sortable: true, searchable: true },
      { key: "location", label: "Location", sortable: true, searchable: true },
      { key: "employment_type", label: "Employment Type", sortable: true, searchable: true },
      { key: "description", label: "Description", searchable: true },
      { key: "apply_url", label: "Apply U R L", sortable: true, searchable: true },
      { key: "is_open", label: "Is Open", format: "boolean" },
      { key: "created_at", label: "Created", sortable: true, format: "relative" },
      // grit:cols:auto-end
    ],
    filters: [
    { key: "is_open", label: "Is Open", type: "boolean" },
    ],
    defaultSort: { key: "created_at", direction: "desc" },
    searchable: true,
    pageSize: 20,
  },
  form: {
    fields: [
      // grit:fields:auto-start
    { key: "title", label: "Title", type: "text", required: true },
    { key: "department", label: "Department", type: "text", required: true },
    { key: "location", label: "Location", type: "text", required: true },
    { key: "employment_type", label: "Employment Type", type: "text", required: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "apply_url", label: "Apply U R L", type: "text", required: true },
    { key: "is_open", label: "Is Open", type: "toggle" },
      // grit:fields:auto-end
    ],
  },
  dashboard: {
    widgets: [
      {
        type: "stat",
        label: "Total JobOpenings",
        endpoint: "/api/job_openings",
        icon: "Database",
        color: "accent",
      },
    ],
  },
});
