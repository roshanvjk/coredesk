"use client";

import { useMemo, useState } from "react";
import { Copy, Edit3, ExternalLink, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { SavedLink } from "@/app/links/types";
import { LINK_CARD_PALETTES } from "@/lib/link-palettes";

type LinksClientProps = {
  initialLinks: SavedLink[];
};

type Draft = {
  title: string;
  url: string;
};

function formatDisplayDate(isoYmd: string): string {
  const [y, m, d] = isoYmd.split("-").map(Number);
  if (!y || !m || !d) return isoYmd;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function LinkEditorForm({
  draft,
  selectedId,
  selected,
  canEdit,
  error,
  isSaving,
  onSubmit,
}: {
  draft: Draft;
  selectedId: number | null;
  selected: SavedLink | null;
  canEdit: boolean;
  error: string;
  isSaving: boolean;
  onSubmit: (values: Draft) => Promise<void>;
}) {
  const [title, setTitle] = useState(draft.title);
  const [url, setUrl] = useState(draft.url);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({ title, url });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div>
        <label htmlFor="link-title" className="app-label-inline">
          Title
        </label>
        <input
          id="link-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!canEdit}
          className="app-input-rounded"
          placeholder="Link title"
        />
      </div>
      <div>
        <label htmlFor="link-url" className="app-label-inline">
          Link
        </label>
        <div className="flex items-center gap-2">
          <input
            id="link-url"
            required
            type="text"
            inputMode="url"
            autoComplete="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={!canEdit}
            className="app-input-rounded flex-1"
            placeholder="Add a Link"
          />
          <button
            type="button"
            onClick={async () => {
              if (!url) return;
              try {
                await navigator.clipboard.writeText(url);
              } catch {
                const textarea = document.createElement("textarea");
                textarea.value = url;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                textarea.remove();
              }
            }}
            disabled={!url}
            className="app-btn-md-outline"
            aria-label="Copy link"
            title="Copy link"
          >
            <Copy size={16} strokeWidth={2} />
          </button>
          <button type="button" disabled={!url} className="app-btn-md-outline" onClick={() => window.open(url, "_blank")}>
            <ExternalLink size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
      {selected && (
        <div className="mt-1 text-xs font-medium text-muted-foreground">
          Saved color is applied to the card in the sidebar.
        </div>
      )}

      {error ? <p className="app-error-text">{error}</p> : null}

      {canEdit ? (
        <button
          type="submit"
          disabled={isSaving}
          className="app-btn-pill"
        >
          {isSaving ? "Saving…" : selectedId === null ? "Save link" : "Update link"}
        </button>
      ) : null}
    </form>
  );
}

export default function LinksClient({ initialLinks }: LinksClientProps) {
  const [links, setLinks] = useState<SavedLink[]>(initialLinks);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialLinks[0]?.id ?? null,
  );
  const [deleteTarget, setDeleteTarget] = useState<SavedLink | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [newFormNonce, setNewFormNonce] = useState(0);
  const [isEditing, setIsEditing] = useState<boolean>(selectedId === null);

  const selected = useMemo(
    () => links.find((l) => l.id === selectedId) ?? null,
    [links, selectedId],
  );

  const draft: Draft =
    selectedId === null
      ? { title: "", url: "" }
      : selected
        ? {
          title: selected.title,
          url: selected.url,
        }
        : { title: "", url: "" };

  const formKey =
    selectedId === null
      ? `new-${newFormNonce}`
      : selected
        ? `${selected.id}-${selected.title}-${selected.url}-${selected.linkDate}-${selected.colorClasses}`
        : "missing";

  function handleSelect(link: SavedLink) {
    setSelectedId(link.id);
    setIsEditing(false);
    setError("");
  }

  function handleAddLink() {
    setSelectedId(null);
    setNewFormNonce((n) => n + 1);
    setIsEditing(true);
    setError("");
  }

  async function handleSubmit(values: Draft) {
    setIsSaving(true);
    setError("");

    try {
      const isEdit = selectedId !== null;
      const response = await fetch("/api/links", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit ? { id: selectedId, ...values } : values,
        ),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save link.");
      }

      const saved = (await response.json()) as SavedLink;
      if (isEdit) {
        setLinks((prev) => prev.map((l) => (l.id === saved.id ? saved : l)));
        toast.success("Link updated.");
      } else {
        setLinks((prev) => [saved, ...prev]);
        setSelectedId(saved.id);
        toast.success("Link saved.");
      }
      setIsEditing(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save link.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete link.");
      }
      const removedId = deleteTarget.id;
      const nextLinks = links.filter((l) => l.id !== removedId);
      setLinks(nextLinks);
      setDeleteTarget(null);
      if (selectedId === removedId) {
        setSelectedId(nextLinks[0]?.id ?? null);
      }
      toast.success("Link deleted.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete link.";
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-background p-0">
      <div className="pointer-events-none absolute -left-[9999px] top-0 opacity-0" aria-hidden>
        {LINK_CARD_PALETTES.map((palette) => (
          <span key={palette} className={palette} />
        ))}
      </div>
      <section className="w-full bg-background">
        <div className="grid w-full grid-cols-1 md:grid-cols-[300px_1fr]">
          <aside className="app-links-sidebar">
            <input
              type="text"
              placeholder="Search Links"
              className="app-input h-10 rounded-md"
            />

            <h2 className="app-title-section mt-4">All Links</h2>

            <div className="mt-3 space-y-3">
              {links.length === 0 ? (
                <p className="app-subtext">
                  No saved links yet. Use Add Link to create one.
                </p>
              ) : null}
              {links.map((item) => (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelect(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelect(item);
                    }
                  }}
                  className={`cursor-pointer rounded-md p-3 transition-shadow ${item.colorClasses} ${selectedId === item.id ? "app-links-selected" : ""
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-sm font-semibold">{item.title}</h3>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(item);
                          setIsEditing(true);
                        }}
                        className="app-links-icon-btn"
                        aria-label="Edit link"
                        title="Edit link"
                      >
                        <Edit3 size={14} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(item);
                        }}
                        className="shrink-0 text-current opacity-70 hover:opacity-100"
                        aria-label="Delete link"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs opacity-90">{formatDisplayDate(item.linkDate)}</p>
                </article>
              ))}
            </div>
          </aside>

          <section className="p-4">
            <div className="flex items-center justify-between pb-4">
              <h1 className="app-title-inline">
                {selectedId === null ? "New link" : "Edit link"}
              </h1>
              <button
                type="button"
                onClick={handleAddLink}
                className="app-btn-pill-sm"
              >
                Add Link
              </button>
            </div>

            <LinkEditorForm
              key={formKey}
              draft={draft}
              selectedId={selectedId}
              selected={selected}
              canEdit={selectedId === null ? true : isEditing}
              error={error}
              isSaving={isSaving}
              onSubmit={handleSubmit}
            />
          </section>
        </div>
      </section>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this link?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The saved link will be removed from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
