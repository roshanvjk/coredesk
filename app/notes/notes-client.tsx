"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Note } from "@/app/notes/types";
import { Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

type NotesClientProps = {
  initialNotes: Note[];
};

/** Supports DB string, legacy `{ content }[]`, or bad JSON shapes without crashing. */
function normalizeLinesField(lines: unknown): string {
  if (typeof lines === "string") return lines;
  if (Array.isArray(lines)) {
    return lines
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "content" in item) {
          return String((item as { content?: unknown }).content ?? "");
        }
        return String(item ?? "");
      })
      .filter(Boolean)
      .join("\n");
  }
  if (lines == null || lines === "") return "";
  return String(lines);
}

function linesPreview(note: Note): string {
  return normalizeLinesField(note.lines as unknown)
    .split("\n")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(", ");
}

function storedLinesToInputs(lines: unknown): string[] {
  const normalized = normalizeLinesField(lines);
  const segments = normalized.split("\n");
  const nonEmpty = segments.map((s) => s.trimEnd()).filter((s) => s.length > 0);
  return nonEmpty.length ? nonEmpty : [""];
}

export default function NotesClient({ initialNotes }: NotesClientProps) {
  const [notes, setNotes] = useState<Note[]>(() =>
    initialNotes.map((n) => ({
      ...n,
      lines: normalizeLinesField(n.lines as unknown),
    })),
  );
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deleteNote, setDeleteNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [lineInputs, setLineInputs] = useState<string[]>([""]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  function handleDialogOpenChange(open: boolean) {
    setShowForm(open);
    if (!open) {
      setEditingNote(null);
      setError("");
      setTitle("");
      setLineInputs([""]);
    }
  }

  function openCreateDialog() {
    setError("");
    setEditingNote(null);
    setTitle("");
    setLineInputs([""]);
    setShowForm(true);
  }

  function openEditDialog(note: Note) {
    setError("");
    setEditingNote(note);
    setTitle(note.title);
    setLineInputs(storedLinesToInputs(note.lines));
    setShowForm(true);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const method = editingNote ? "PATCH" : "POST";
      const payload = editingNote
        ? { id: editingNote.id, title, lines: lineInputs }
        : { title, lines: lineInputs };

      const response = await fetch("/api/notes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save note.");
      }

      const saved = (await response.json()) as Note;
      const normalizedSaved: Note = {
        ...saved,
        lines: normalizeLinesField(saved.lines as unknown),
      };
      if (editingNote) {
        setNotes((prev) =>
          prev.map((n) => (n.id === normalizedSaved.id ? normalizedSaved : n)),
        );
        toast.success("Note updated successfully.");
      } else {
        setNotes((prev) => [normalizedSaved, ...prev]);
        toast.success("Note created successfully.");
      }
      handleDialogOpenChange(false);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save note.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  function addLineField() {
    setLineInputs((prev) => [...prev, ""]);
  }

  function updateLine(index: number, value: string) {
    setLineInputs((prev) => prev.map((line, i) => (i === index ? value : line)));
  }

  function removeLine(index: number) {
    setLineInputs((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  async function handleDeleteConfirm() {
    if (!deleteNote) return;
    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch("/api/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteNote.id }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete note.");
      }

      setNotes((prev) => prev.filter((n) => n.id !== deleteNote.id));
      setDeleteNote(null);
      toast.success("Note deleted successfully.");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete note.";
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="app-screen text-foreground">
      <div className="w-full px-3 py-3 md:px-4">
        <header className="mb-3 flex items-center justify-end gap-2">
          <div className="app-notes-search">
            <Search size={16} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notes"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </header>

        <section className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {notes.map((note) => (
            <Card
              key={note.id}
              className="app-note-card"
            >
              <CardHeader className="relative px-3 pt-3 pb-1">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="app-note-title">
                    {note.title}
                  </CardTitle>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => openEditDialog(note)}
                      className="app-icon-btn"
                      title="Edit note"
                      aria-label="Edit note"
                    >
                      <Pencil size={16} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteNote(note)}
                      className="app-icon-btn-danger"
                      title="Delete note"
                      aria-label="Delete note"
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="app-note-preview">{linesPreview(note)}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <button
          type="button"
          onClick={openCreateDialog}
          className="app-fab"
          aria-label="Add note"
        >
          <span className="text-3xl leading-none">+</span>
        </button>

        <Dialog open={showForm} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="app-dialog-surface">
            <DialogHeader>
              <DialogTitle>{editingNote ? "Edit note" : "New note"}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Add a title and one or more lines. They are saved as one text field (newline
                separated); the grid shows them comma-separated for readability.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <input
                type="text"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Title"
                className="app-input h-10 rounded-lg"
              />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Lines</p>
                {lineInputs.map((line, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={line}
                      onChange={(event) => updateLine(index, event.target.value)}
                      placeholder={`Line ${index + 1}`}
                      className="app-input h-10 min-w-0 flex-1 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={lineInputs.length <= 1}
                      className="shrink-0 rounded-lg border border-input px-3 text-sm text-muted-foreground disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLineField}
                  className="app-btn-link"
                >
                  + Add line
                </button>
              </div>
              {error ? <p className="app-error-text">{error}</p> : null}
              <button
                type="submit"
                disabled={isSaving}
                className="app-btn-md"
              >
                {isSaving ? "Saving..." : editingNote ? "Update note" : "Save note"}
              </button>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={Boolean(deleteNote)}
          onOpenChange={(open) => !open && setDeleteNote(null)}
        >
          <AlertDialogContent className="app-alert-surface">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete note?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone. This note will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isDeleting}
                className="app-alert-cancel"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  );
}
