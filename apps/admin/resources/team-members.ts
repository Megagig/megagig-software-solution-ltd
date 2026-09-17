import { defineResource } from "@/lib/resource";

export const teamMemberResource = defineResource({
  name: "TeamMember",
  slug: "team-members",
  endpoint: "/api/team_members",
  icon: "UsersRound",
  label: { singular: "TeamMember", plural: "TeamMembers" },
  table: {
    columns: [
      // grit:cols:auto-start
      { key: "name", label: "Name", sortable: true, searchable: true, onClick: "link" },
      { key: "role", label: "Role", sortable: true, searchable: true },
      { key: "photo.original_name", label: "Photo" },
      { key: "linkedin_url", label: "Linkedin U R L", sortable: true, searchable: true },
      { key: "github_url", label: "Github U R L", sortable: true, searchable: true },
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
    { key: "name", label: "Name", type: "text", required: true },
    { key: "role", label: "Role", type: "text", required: true },
    { key: "photo_id", label: "Photo", type: "relationship-select", required: true, relatedEndpoint: "/api/uploads", displayField: "original_name" },
    { key: "linkedin_url", label: "Linkedin U R L", type: "text", required: true },
    { key: "github_url", label: "Github U R L", type: "text", required: true },
    { key: "published", label: "Published", type: "toggle" },
    { key: "sort_order", label: "Sort Order", type: "number", numberKind: "int" },
      // grit:fields:auto-end
    ],
  },
  dashboard: {
    widgets: [
      {
        type: "stat",
        label: "Total TeamMembers",
        endpoint: "/api/team_members",
        icon: "UsersRound",
        color: "accent",
      },
    ],
  },
});
