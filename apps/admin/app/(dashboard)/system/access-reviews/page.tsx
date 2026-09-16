"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/chrome/PageHeader";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { apiClient } from "@/lib/api-client";
import { ShieldCheck, Check, X, Plus, Loader2, UserCheck } from "@/lib/icons";

interface ReviewSummary {
  id: string;
  name: string;
  status: string;
  created_by_email: string;
  created_at: string;
  completed_at?: string;
  total_items: number;
  pending_items: number;
  approved_items: number;
  revoked_items: number;
}

interface ReviewItem {
  id: string;
  user_email: string;
  role_name: string;
  decision: string;
  decided_by_email?: string;
  note?: string;
}

interface ReviewDetail extends ReviewSummary {
  items: ReviewItem[];
}

export default function AccessReviewPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  // "New review" opens a proper form (name + optional note) rather than a
  // browser prompt — the note is stored on the campaign as context for whoever
  // audits it later.
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");

  const listQ = useQuery({
    queryKey: ["access-reviews"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/access-reviews");
      return (data.data ?? []) as ReviewSummary[];
    },
  });

  const detailQ = useQuery({
    queryKey: ["access-review", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await apiClient.get("/api/access-reviews/" + selected);
      return data.data as ReviewDetail;
    },
  });

  const openM = useMutation({
    mutationFn: async (body: { name: string; note?: string }) => {
      const { data } = await apiClient.post("/api/access-reviews", body);
      return data.data as ReviewDetail;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["access-reviews"] });
      setSelected(r.id);
      setNewOpen(false);
      setNewName("");
      setNewNote("");
    },
  });

  const decideM = useMutation({
    mutationFn: async (args: { itemId: string; decision: "approved" | "revoked" }) => {
      await apiClient.post(
        "/api/access-reviews/" + selected + "/items/" + args.itemId + "/decision",
        { decision: args.decision }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["access-review", selected] });
      qc.invalidateQueries({ queryKey: ["access-reviews"] });
    },
  });

  const completeM = useMutation({
    mutationFn: async () => {
      await apiClient.post("/api/access-reviews/" + selected + "/complete");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["access-review", selected] });
      qc.invalidateQueries({ queryKey: ["access-reviews"] });
    },
  });

  const startReview = () => {
    if (!newName.trim()) return;
    openM.mutate({ name: newName.trim(), note: newNote.trim() || undefined });
  };

  const detail = detailQ.data;
  // The detail endpoint returns items but not the aggregate counts (those live on
  // the list summary), so derive the pending count from the items we already
  // have. This keeps the header and the Complete button honest even mid-review.
  const pendingCount = detail ? detail.items.filter((i) => i.decision === "pending").length : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Access reviews"
        subtitle="Certify who has access to what. Revoking a grant removes it immediately and is logged to the audit trail."
        actions={
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            disabled={openM.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {openM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New review
          </button>
        }
      />

      {/* New review form. Opening a campaign snapshots every current role
          assignment, so the copy says so up front — it's not a draft. */}
      <ResponsiveSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="Start an access review"
        description="This snapshots every current role assignment as pending items for you to certify."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setNewOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={startReview}
              disabled={!newName.trim() || openM.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {openM.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create review
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Name<span className="ml-1 text-danger">*</span>
            </label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) startReview();
              }}
              placeholder="Q3 2026 quarterly"
              className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="text-xs text-text-muted">
              Name it for the period you&rsquo;re certifying — it becomes the audit record.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Note</label>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              placeholder="Optional context — scope, who requested it, ticket reference…"
              className="w-full resize-y rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {openM.isError && (
            <p className="text-sm text-danger">Could not start the review. Please try again.</p>
          )}
        </div>
      </ResponsiveSheet>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Campaign list */}
        <div className="space-y-2">
          {listQ.isLoading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (listQ.data ?? []).length === 0 ? (
            <p className="rounded-xl border border-border bg-bg-secondary/40 p-6 text-sm text-text-secondary">
              No access reviews yet. Start one to snapshot every current role assignment for certification.
            </p>
          ) : (
            (listQ.data ?? []).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r.id)}
                className={
                  "w-full rounded-xl border p-4 text-left transition-colors " +
                  (selected === r.id ? "border-accent bg-accent/5" : "border-border bg-bg-secondary/40 hover:border-accent/40")
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{r.name}</span>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                      (r.status === "completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning")
                    }
                  >
                    {r.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {r.pending_items} pending · {r.approved_items} approved · {r.revoked_items} revoked
                </p>
              </button>
            ))
          )}
        </div>

        {/* Detail */}
        <div>
          {!detail ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border p-12 text-sm text-text-secondary">
              <ShieldCheck className="mr-2 h-5 w-5" /> Select a review to certify its access.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg-secondary/40 p-4">
                <div>
                  <p className="font-semibold text-foreground">{detail.name}</p>
                  <p className="text-xs text-text-secondary">
                    Opened by {detail.created_by_email}
                    {detail.completed_at ? " · completed" : " · " + pendingCount + " pending"}
                  </p>
                </div>
                {detail.status !== "completed" && (
                  <button
                    type="button"
                    onClick={() => completeM.mutate()}
                    disabled={pendingCount > 0 || completeM.isPending}
                    title={pendingCount > 0 ? "Decide every item before completing" : "Sign off this review"}
                    className="inline-flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-4 py-2 text-sm font-semibold text-success hover:bg-success/20 disabled:opacity-40"
                  >
                    <UserCheck className="h-4 w-4" />
                    Complete review
                  </button>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-bg-tertiary text-left text-xs text-text-secondary">
                    <tr>
                      <th className="px-4 py-2 font-medium">User</th>
                      <th className="px-4 py-2 font-medium">Role</th>
                      <th className="px-4 py-2 font-medium">Decision</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((it) => (
                      <tr key={it.id} className="border-t border-border">
                        <td className="px-4 py-2.5 text-foreground">{it.user_email}</td>
                        <td className="px-4 py-2.5 text-text-secondary">{it.role_name}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={
                              "rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                              (it.decision === "approved"
                                ? "bg-success/10 text-success"
                                : it.decision === "revoked"
                                ? "bg-danger/10 text-danger"
                                : "bg-bg-hover text-text-secondary")
                            }
                          >
                            {it.decision}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {detail.status !== "completed" && it.decision === "pending" && (
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => decideM.mutate({ itemId: it.id, decision: "approved" })}
                                disabled={decideM.isPending}
                                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:border-success/40 hover:text-success disabled:opacity-40"
                              >
                                <Check className="h-3 w-3" /> Keep
                              </button>
                              <button
                                type="button"
                                onClick={() => decideM.mutate({ itemId: it.id, decision: "revoked" })}
                                disabled={decideM.isPending}
                                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:border-danger/40 hover:text-danger disabled:opacity-40"
                              >
                                <X className="h-3 w-3" /> Revoke
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {detail.items.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                          No role assignments existed when this review was opened.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
