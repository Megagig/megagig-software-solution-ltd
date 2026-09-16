"use client";

import { useState, useRef } from "react";
import { useUploads, useUploadFile, useDeleteUpload, useUploadStats } from "@/hooks/use-system";
import { FolderOpen, Upload, Trash2, Loader2, X, Image as ImageIcon, Play, Music, FileText, FileSpreadsheet, File as FileIcon } from "@/lib/icons";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FilesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useUploads(page);
  const { data: statsResp } = useUploadStats();
  const uploadFile = useUploadFile();
  const deleteUpload = useDeleteUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const uploads = data?.data ?? [];
  const meta = data?.meta;
  const stats = statsResp?.data;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => uploadFile.mutate(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">File Storage</h1>
          <p className="text-sm text-foreground-muted mt-1">Manage uploaded files and images</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:brightness-90 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* v3.31.32 — storage stats. Total + per-kind breakdown so
          you can see at a glance what's eating your bucket. */}
      {stats && <StorageStatsPanel stats={stats} />}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? "border-brand bg-brand/5" : "border-border"
        }`}
      >
        <Upload className="h-8 w-8 text-foreground-subtle mx-auto mb-2" />
        <p className="text-sm text-foreground-muted">
          Drag & drop files here, or{" "}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-brand hover:underline"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-foreground-subtle mt-1">Max 10 MB per file</p>
      </div>

      {/* Upload progress */}
      {uploadFile.isPending && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
          <Loader2 className="h-5 w-5 animate-spin text-brand" />
          <span className="text-sm text-foreground-muted">Uploading...</span>
        </div>
      )}

      {/* File grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      ) : uploads.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <FolderOpen className="h-12 w-12 text-foreground-subtle mb-3" />
          <p className="text-sm text-foreground-muted">No files uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="group relative rounded-xl border border-border bg-surface overflow-hidden hover:border-brand/50 transition-colors"
            >
              {/* Preview */}
              <div className="aspect-square bg-foreground/5 flex items-center justify-center">
                {upload.mime_type.startsWith("image/") ? (
                  <img
                    src={upload.thumbnail_url || upload.url}
                    alt={upload.original_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <FolderOpen className="h-8 w-8 text-foreground-subtle mx-auto mb-1" />
                    <p className="text-xs text-foreground-subtle uppercase">
                      {upload.mime_type.split("/")[1]?.slice(0, 4)}
                    </p>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-foreground truncate">{upload.original_name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-foreground-subtle">{formatFileSize(upload.size)}</span>
                  <span className="text-xs text-foreground-subtle">{formatDate(upload.created_at)}</span>
                </div>
              </div>

              {/* Delete overlay */}
              <button
                onClick={() => deleteUpload.mutate(upload.id)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-danger transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-border text-foreground-muted hover:bg-foreground/5 disabled:opacity-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-foreground-muted">
            Page {page} of {meta.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
            disabled={page === meta.pages}
            className="px-3 py-1.5 text-sm rounded-lg border border-border text-foreground-muted hover:bg-foreground/5 disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// v3.31.32 — Storage stats panel. Shows total bytes / file count up
// top, then a per-kind breakdown so you can see what's filling the
// bucket. Per-kind rows compute their share via the count + size from
// the API; the bar fills proportional to the total size.
interface UploadStatsLite {
  total_count: number;
  total_size: number;
  by_kind: { kind: string; count: number; size: number }[];
}

const KIND_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tint: string }> = {
  image:       { label: "Images",       icon: ImageIcon,       tint: "text-brand" },
  video:       { label: "Videos",       icon: Play,            tint: "text-info" },
  audio:       { label: "Audio",        icon: Music,           tint: "text-info" },
  pdf:         { label: "PDFs",         icon: FileText,        tint: "text-danger" },
  document:    { label: "Documents",    icon: FileText,        tint: "text-info" },
  spreadsheet: { label: "Spreadsheets", icon: FileSpreadsheet, tint: "text-success" },
  other:       { label: "Other",        icon: FileIcon,        tint: "text-foreground-subtle" },
};

function formatStatsSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function StorageStatsPanel({ stats }: { stats: UploadStatsLite }) {
  // Sort kinds by descending size so the biggest consumers are first.
  const rows = [...(stats.by_kind ?? [])].sort((a, b) => b.size - a.size);
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-3">
        <div className="bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle">Total files</p>
          <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">
            {stats.total_count.toLocaleString()}
          </p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle">Total storage</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {formatStatsSize(stats.total_size)}
          </p>
        </div>
        <div className="col-span-2 bg-surface p-4 md:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle">Avg file size</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {stats.total_count > 0 ? formatStatsSize(stats.total_size / stats.total_count) : "—"}
          </p>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="border-t border-border px-4 py-3 space-y-2.5">
          {rows.map((row) => {
            const meta = KIND_META[row.kind] || KIND_META.other;
            const Icon = meta.icon;
            const share = stats.total_size > 0 ? (row.size / stats.total_size) * 100 : 0;
            return (
              <div key={row.kind} className="flex items-center gap-3">
                <div className={"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-foreground/5 " + meta.tint}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{meta.label}</span>
                    <span className="tabular-nums text-foreground-subtle">
                      {row.count.toLocaleString()} files · {formatStatsSize(row.size)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-foreground/5">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: share + "%" }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
