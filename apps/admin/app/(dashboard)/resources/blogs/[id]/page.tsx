"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/chrome/PageHeader";
import { WordEditor } from "@/components/forms/word-editor";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToastedMutation } from "@/hooks/use-toasted-mutation";
import { apiClient, uploadFile } from "@/lib/api-client";
import { ArrowLeft, Save, Trash2, Upload, Check } from "@/lib/icons";

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> { data: T }

export default function BlogDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { data: blog, isLoading } = useQuery<Blog>({
    queryKey: ["blog", params.id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Blog>>("/api/admin/blogs/" + params.id);
      return data.data;
    },
    enabled: !!params.id,
  });

  // Sync local form state when the blog loads. We track state locally
  // rather than threading useForm because the WordEditor is heavy + we
  // want autosave on blur, not on every keystroke.
  useEffect(() => {
    if (!blog) return;
    setTitle(blog.title || "");
    setExcerpt(blog.excerpt || "");
    setContent(blog.content || "");
    setImage(blog.image || "");
  }, [blog]);

  const save = useToastedMutation({
    mutationFn: async (patch: Partial<Blog>) => {
      const { data } = await apiClient.put<ApiResponse<Blog>>("/api/blogs/" + params.id, patch);
      return data.data;
    },
    successMessage: "Saved",
    silentSuccess: true,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blog", params.id] }),
  });

  const publish = useToastedMutation({
    mutationFn: async (next: boolean) => {
      const { data } = await apiClient.put<ApiResponse<Blog>>("/api/blogs/" + params.id, { published: next });
      return data.data;
    },
    successMessage: (b) => b.published ? "Published" : "Moved back to draft",
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blog", params.id] }),
  });

  const del = useToastedMutation({
    mutationFn: async () => apiClient.delete("/api/blogs/" + params.id),
    successMessage: "Deleted",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      router.push("/resources/blogs");
    },
  });

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const res = await uploadFile(file);
      const url = (res.data as Record<string, unknown>)?.url as string;
      if (url) {
        setImage(url);
        save.mutate({ image: url });
      }
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  if (isLoading || !blog) {
    return <BlogDetailSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title={title || "Untitled blog"}
        subtitle={blog.published ? "Published" : "Draft"}
        actions={
          <>
            <IconButton
              variant="secondary"
              icon={<ArrowLeft className="h-4 w-4" />}
              label="Back"
              onClick={() => router.push("/resources/blogs")}
            />
            <IconButton
              variant="secondary"
              icon={<Save className="h-4 w-4" />}
              label="Save"
              onClick={() => save.mutate({ title, excerpt, content, image })}
              disabled={save.isPending}
            />
            {blog.published ? (
              <IconButton
                variant="secondary"
                icon={<Check className="h-4 w-4" />}
                label="Unpublish"
                onClick={() => publish.mutate(false)}
                disabled={publish.isPending}
              />
            ) : (
              <IconButton
                icon={<Check className="h-4 w-4" />}
                label="Publish"
                onClick={() => publish.mutate(true)}
                disabled={publish.isPending}
              />
            )}
            <IconButton
              variant="danger"
              icon={<Trash2 className="h-4 w-4" />}
              label="Delete"
              onClick={() => setConfirmDelete(true)}
            />
          </>
        }
      />

      <ConfirmModal
        open={confirmDelete}
        title="Delete this blog?"
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={del.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); del.mutate(); }}
      />

      {/* Meta panel — cover, title, excerpt */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">Cover image</p>
          <div className="relative aspect-video overflow-hidden rounded-xl border border-dashed border-border bg-surface-raised">
            {image ? (
              <img src={image} alt={title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-foreground-subtle">
                <span className="text-xs">No cover image</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-lg bg-surface-raised/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur hover:bg-surface-raised disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {coverUploading ? "Uploading..." : (image ? "Replace" : "Upload")}
            </button>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Field label="Title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => { if (title !== blog.title) save.mutate({ title }); }}
              placeholder="Article title..."
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-base font-semibold text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </Field>
          <Field label="Excerpt">
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              onBlur={() => { if (excerpt !== blog.excerpt) save.mutate({ excerpt }); }}
              rows={3}
              placeholder="A short summary readers see in lists and social previews."
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </Field>
        </div>
      </section>

      {/* Word-style editor */}
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">Content</p>
        <WordEditor
          value={content}
          onChange={setContent}
          placeholder="Start your article here. Use the toolbar to format headings, lists, tables, images, and more."
          minHeight={500}
          onBlur={() => { if (content !== blog.content) save.mutate({ content }); }}
        />
      </section>

      <div className="mt-3 flex items-center justify-between text-xs text-foreground-subtle">
        <p>Autosaves when you leave a field. Last updated {new Date(blog.updated_at).toLocaleString()}.</p>
        <Link href={"/blog/" + blog.slug} target="_blank" rel="noopener noreferrer" className="text-brand hover:opacity-80">
          View public page →
        </Link>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground-subtle">{label}</span>
      {children}
    </label>
  );
}

// BlogDetailSkeleton paints the same shape the loaded page will use:
// header band on top, a 3-col grid for cover + title/excerpt, then a
// tall editor placeholder. Keeps layout from jumping when data arrives.
function BlogDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-16 rounded-xl bg-foreground/5" />
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="aspect-video rounded-xl bg-foreground/5 lg:col-span-1" />
        <div className="space-y-3 lg:col-span-2">
          <div className="h-10 rounded-lg bg-foreground/5" />
          <div className="h-20 rounded-lg bg-foreground/5" />
        </div>
      </section>
      <div className="h-[500px] rounded-xl bg-foreground/5" />
    </div>
  );
}
