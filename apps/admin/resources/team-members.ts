import { defineResource } from "@/lib/resource";

export const teamMemberResource = defineResource({
  name: "TeamMember",
  slug: "team-members",
  endpoint: "/api/team_members",
  icon: "UsersRound",
  label: { singular: "Team member", plural: "Team members" },
  table: {
    columns: [
      // grit:cols:auto-start
      { key: "name", label: "Name", sortable: true, searchable: true, onClick: "link" },
      { key: "role", label: "Role", sortable: true, searchable: true },
      { key: "photo_url", label: "Photo", format: "image" },
      { key: "github_url", label: "GitHub" },
      { key: "published", label: "Published", format: "boolean" },
      { key: "sort_order", label: "Sort Order", sortable: true },
      { key: "created_at", label: "Created", sortable: true, format: "relative" },
      // grit:cols:auto-end
    ],
    filters: [
    { key: "published", label: "Published", type: "boolean" },
    ],
    // Curated order — the same sort_order the public /team page uses.
    defaultSort: { key: "sort_order", direction: "asc" },
    searchable: true,
    pageSize: 20,
  },
  form: {
    fields: [
      // grit:fields:auto-start
    { key: "name", label: "Name", type: "text", required: true },
    { key: "role", label: "Role", type: "text", required: true },
    { key: "photo_url", label: "Photo", type: "image", description: "Square portrait works best." },
    { key: "linkedin_url", label: "LinkedIn URL", type: "text", description: "Optional — leave blank to hide the button." },
    { key: "github_url", label: "GitHub URL", type: "text", description: "Optional — leave blank to hide the button." },
    { key: "twitter_url", label: "X / Twitter URL", type: "text", description: "Optional — leave blank to hide the button." },
    { key: "published", label: "Published", type: "toggle", description: "Unpublished members are hidden from the public /team page." },
    { key: "sort_order", label: "Sort Order", type: "number", numberKind: "int", description: "Lowest first." },
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
