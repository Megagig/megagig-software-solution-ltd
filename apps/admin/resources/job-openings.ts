import { defineResource } from "@/lib/resource";

export const jobOpeningResource = defineResource({
  name: "JobOpening",
  slug: "job-openings",
  endpoint: "/api/job_openings",
  icon: "Database",
  label: { singular: "Job opening", plural: "Job openings" },
  table: {
    columns: [
      // grit:cols:auto-start
      { key: "title", label: "Title", sortable: true, searchable: true, onClick: "link" },
      { key: "department", label: "Department", sortable: true, searchable: true },
      { key: "location", label: "Location", sortable: true, searchable: true },
      { key: "employment_type", label: "Type", sortable: true },
      { key: "is_open", label: "Open", format: "boolean" },
      { key: "created_at", label: "Created", sortable: true, format: "relative" },
      // grit:cols:auto-end
    ],
    filters: [
    { key: "is_open", label: "Open", type: "boolean" },
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
    {
      key: "employment_type",
      label: "Employment type",
      type: "select",
      required: true,
      options: [
        { label: "Full-time", value: "Full-time" },
        { label: "Part-time", value: "Part-time" },
        { label: "Contract", value: "Contract" },
        { label: "Internship", value: "Internship" },
      ],
    },
    { key: "description", label: "Description", type: "textarea", description: "Shown when a visitor expands the role. Separate paragraphs with a blank line." },
    {
      key: "apply_url",
      label: "Apply link",
      type: "text",
      description: 'Optional — an application form URL or a "mailto:" link. Leave blank to send applicants to the general CV email from Site Settings.',
    },
    { key: "is_open", label: "Open", type: "toggle", description: "Only open roles appear on /careers. Turn this off to close a role without deleting it." },
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
