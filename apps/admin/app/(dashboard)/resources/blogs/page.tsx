"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/chrome/PageHeader";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { IconButton } from "@/components/ui/IconButton";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useToastedMutation } from "@/hooks/use-toasted-mutation";
import { apiClient, uploadFile } from "@/lib/api-client";
import { Plus, Upload, FileText, Loader2 } from "@/lib/icons";

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image: string;
  published: boolean;
  created_at: string;
}

interface ListResponse { data: Blog[] }
interface ApiResponse<T> { data: T }

export default function BlogsPage() {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<Blog[]>({
    queryKey: ["blogs"],
    queryFn: async () => {
      const { data } = await apiClient.get<ListResponse>("/api/admin/blogs?page_size=100");
      return data.data;
    },
  });

  return (
    <div>
      <PageHeader
        title="Blogs"
        subtitle="Articles, drafts, and published posts."
        actions={
          <IconButton
            icon={<Plus className="h-4 w-4" />}
            label="New Blog"
            onClick={() => setOpen(true)}
          />
        }
      />

      {isLoading ? (
        <SkeletonTable rows={6} columns={3} />
      ) : (data?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-border bg-bg-elevated p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-text-muted" />
          <p className="mt-3 text-base font-medium text-foreground">No blogs yet</p>
          <p className="mt-1 text-sm text-text-muted">Click New Blog to draft your first article.</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            New Blog
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {(data ?? []).map((b) => (
            <li key={b.id}>
              <Link
                href={"/resources/blogs/" + b.id}
                className="flex gap-4 rounded-xl border border-border bg-bg-elevated p-4 transition-colors hover:bg-bg-hover hover:border-accent/30"
              >
                <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-bg-hover">
                  {b.image ? (
                    <img src={b.image} alt={b.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-text-muted">
                      <FileText className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{b.title}</p>
                    <span className={"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase " + (b.published ? "bg-success/10 text-success" : "bg-bg-hover text-text-muted")}>
                      {b.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  {b.excerpt && <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{b.excerpt}</p>}
                  <p className="mt-2 text-xs text-text-muted">Created {new Date(b.created_at).toLocaleString()}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <NewBlogSheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function NewBlogSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const create = useToastedMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<ApiResponse<Blog>>("/api/admin/blogs", {
        title,
        excerpt,
        image,
        content: "",
        published: false,
      });
      return data.data;
    },
    successMessage: "Draft created — opening editor",
    onSuccess: (blog) => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      // Reset for next open
      setTitle(""); setExcerpt(""); setImage("");
      onClose();
      router.push("/resources/blogs/" + blog.id);
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFile(file);
      const url = (res.data as Record<string, unknown>)?.url as string;
      if (url) setImage(url);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = () => {
    if (!title.trim()) return;
    create.mutate();
  };

  return (
    <ResponsiveSheet
      open={open}
      onClose={onClose}
      title="New blog"
      description="Add the title and cover image. You'll write the article on the next screen."
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim() || create.isPending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {create.isPending ? "Creating..." : "Continue to editor"}
          </button>
        </>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
        <Field label="Title" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Your article's headline"
            autoFocus
            className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2.5 text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </Field>

        <Field label="Cover image">
          <div className="space-y-2">
            <div className="aspect-video overflow-hidden rounded-lg border border-dashed border-border bg-bg-elevated">
              {image ? (
                <img src={image} alt="Cover preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
                  16:9 cover image
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm font-medium text-foreground hover:bg-bg-hover disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {image ? "Replace cover" : "Upload cover"}
            </button>
          </div>
        </Field>

        <Field label="Excerpt">
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={3}
            placeholder="A short summary readers see in lists and social previews."
            className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </Field>
      </form>
    </ResponsiveSheet>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </span>
      {children}
    </label>
  );
}
