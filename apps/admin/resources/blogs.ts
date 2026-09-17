import { defineResource } from "@/lib/resource";

export const blogsResource = defineResource({
  name: "Blog",
  slug: "blogs",
  endpoint: "/api/admin/blogs",
  icon: "Newspaper",
  label: { singular: "Blog", plural: "Blogs" },

  table: {
    columns: [
      // v3.31.5: dropped the raw UUID column. Title + status + author
      // already identify a blog row clearly; the ID lives in the URL when
      // you open the detail view.
      { key: "title", label: "Title", sortable: true, searchable: true },
      { key: "slug", label: "Slug" },
      { key: "image", label: "Image", format: "image" },
      { key: "author.name", label: "Author" },
      { key: "tags", label: "Tags", format: "tags" },
      {
        key: "published",
        label: "Status",
        format: "badge",
        badge: {
          true: { color: "success", label: "Published" },
          false: { color: "muted", label: "Draft" },
        },
      },
      { key: "published_at", label: "Published At", format: "relative", sortable: true },
      { key: "created_at", label: "Created", format: "relative", sortable: true },
    ],
    filters: [
      {
        key: "published",
        label: "Status",
        type: "select",
        options: [
          { label: "Published", value: "true" },
          { label: "Draft", value: "false" },
        ],
      },
    ],
    searchable: true,
    searchPlaceholder: "Search blogs by title...",
    actions: ["create", "view", "edit", "delete"],
    bulkActions: ["delete"],
    defaultSort: { key: "created_at", direction: "desc" },
    pageSize: 20,
  },

  form: {
    layout: "single",
    fields: [
      {
        key: "title",
        label: "Title",
        type: "text",
        required: true,
        placeholder: "Enter blog title",
      },
      {
        key: "excerpt",
        label: "Excerpt",
        type: "textarea",
        placeholder: "Brief summary of the blog post",
      },
      {
        key: "content",
        label: "Content",
        type: "richtext",
      },
      {
        key: "image",
        label: "Cover Image",
        type: "image",
      },
      {
        key: "author_id",
        label: "Author",
        type: "relationship-select",
        relatedEndpoint: "/api/team_members",
        displayField: "name",
      },
      {
        key: "tags",
        label: "Tags",
        type: "tags",
        placeholder: "e.g. Engineering",
      },
      {
        key: "seo_title",
        label: "SEO Title",
        type: "text",
        placeholder: "Defaults to the post title if left blank",
      },
      {
        key: "seo_description",
        label: "SEO Description",
        type: "textarea",
        placeholder: "Defaults to the excerpt if left blank",
      },
      {
        key: "published",
        label: "Published",
        type: "toggle",
      },
    ],
  },
});
