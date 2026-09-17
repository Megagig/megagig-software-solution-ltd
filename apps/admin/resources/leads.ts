import { defineResource } from "@/lib/resource";
import { StackedCell } from "@/components/tables/stacked-cell";
import { LeadStatusBadge } from "@/components/tables/lead-status-badge";

export const leadResource = defineResource({
  name: "Lead",
  slug: "leads",
  endpoint: "/api/leads",
  icon: "Target",
  label: { singular: "Lead", plural: "Leads" },
  table: {
    columns: [
      // grit:cols:auto-start
      { key: "name", label: "Contact", sortable: true, searchable: true, cell: (row) => StackedCell({ top: String(row.name ?? ""), bottom: String(row.email ?? "") }) },
      { key: "phone", label: "Phone", sortable: true, searchable: true, onClick: "link" },
      { key: "company", label: "Company", sortable: true, searchable: true },
      { key: "project_type", label: "Project Type", sortable: true, searchable: true },
      { key: "budget_range", label: "Budget Range", sortable: true, searchable: true },
      { key: "message", label: "Message", searchable: true },
      { key: "source", label: "Source", sortable: true, searchable: true },
      { key: "status", label: "Status", sortable: true, cell: (row) => LeadStatusBadge({ status: String(row.status ?? "") }) },
      { key: "internal_notes", label: "Internal Notes", searchable: true },
      { key: "created_at", label: "Created", sortable: true, format: "relative" },
      // grit:cols:auto-end
    ],
    filters: [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { label: "New", value: "new" },
          { label: "Contacted", value: "contacted" },
          { label: "Quoted", value: "quoted" },
          { label: "Won", value: "won" },
          { label: "Lost", value: "lost" },
        ],
      },
    ],
    defaultSort: { key: "created_at", direction: "desc" },
    searchable: true,
    pageSize: 20,
  },
  form: {
    fields: [
      // grit:fields:auto-start
    { key: "name", label: "Name", type: "text", required: true },
    { key: "email", label: "Email", type: "text", required: true },
    { key: "phone", label: "Phone", type: "text", required: true },
    { key: "company", label: "Company", type: "text", required: true },
    { key: "project_type", label: "Project Type", type: "text", required: true },
    { key: "budget_range", label: "Budget Range", type: "text", required: true },
    { key: "message", label: "Message", type: "textarea" },
    { key: "source", label: "Source", type: "text", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { label: "New", value: "new" },
        { label: "Contacted", value: "contacted" },
        { label: "Quoted", value: "quoted" },
        { label: "Won", value: "won" },
        { label: "Lost", value: "lost" },
      ],
    },
    { key: "internal_notes", label: "Internal Notes", type: "textarea" },
      // grit:fields:auto-end
    ],
  },
  dashboard: {
    widgets: [
      {
        type: "stat",
        label: "Total Leads",
        endpoint: "/api/leads",
        icon: "Target",
        color: "accent",
      },
    ],
  },
});
