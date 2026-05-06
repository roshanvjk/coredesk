"use client";

import { useMemo, useState } from "react";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { TodoTask } from "@/app/todo/types";

const tabs = ["Active Lists", "Completed Lists"] as const;
type TabType = (typeof tabs)[number];

type TodoClientProps = {
  initialTasks: TodoTask[];
};

export default function TodoClient({ initialTasks }: TodoClientProps) {
  const [tasks, setTasks] = useState<TodoTask[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<TabType>("Active Lists");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TodoTask | null>(null);
  const [menuTaskId, setMenuTaskId] = useState<number | null>(null);
  const [deleteTask, setDeleteTask] = useState<TodoTask | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "active" as "active" | "completed",
    progress: 0,
  });

  const visibleTasks = useMemo(() => {
    const status = activeTab === "Active Lists" ? "active" : "completed";
    return tasks.filter((task) => task.status === status);
  }, [activeTab, tasks]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const method = editingTask ? "PATCH" : "POST";
      const payload = editingTask ? { ...formData, id: editingTask.id } : formData;
      const response = await fetch("/api/todo", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save todo list.");
      }

      const savedTask = (await response.json()) as TodoTask;
      if (editingTask) {
        setTasks((prev) => prev.map((task) => (task.id === savedTask.id ? savedTask : task)));
        toast.success("Todo updated successfully.");
      } else {
        setTasks((prev) => [savedTask, ...prev]);
        toast.success("Todo created successfully.");
      }
      setShowForm(false);
      setEditingTask(null);
      setFormData({
        title: "",
        description: "",
        status: "active",
        progress: 0,
      });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save todo list.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  function openCreateDialog() {
    setError("");
    setEditingTask(null);
    setFormData({
      title: "",
      description: "",
      status: "active",
      progress: 0,
    });
    setShowForm(true);
  }

  function openEditDialog(task: TodoTask) {
    setError("");
    setMenuTaskId(null);
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      progress: task.progress,
    });
    setShowForm(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTask) return;
    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch("/api/todo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTask.id }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete todo.");
      }

      setTasks((prev) => prev.filter((task) => task.id !== deleteTask.id));
      setDeleteTask(null);
      setMenuTaskId(null);
      toast.success("Todo deleted successfully.");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete todo.";
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="app-screen">
      <section className="w-full p-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="app-title-inline">Todo Lists</h1>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  onClick={openCreateDialog}
                  className="app-btn-sm"
                >
                  Add new list
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>{editingTask ? "Edit todo" : "Add new todo"}</DialogTitle>
                  <DialogDescription>
                    Enter title, description, status and progress to save this todo.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-3">
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Title"
                    className="app-input h-10 rounded-lg"
                  />
                  <textarea
                    required
                    value={formData.description}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Description"
                    className="app-textarea"
                  />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <select
                      value={formData.status}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: event.target.value as "active" | "completed",
                        }))
                      }
                      className="app-select"
                    >
                      <option value="active">active</option>
                      <option value="completed">completed</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.progress}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          progress: Number(event.target.value),
                        }))
                      }
                      placeholder="Progress (0-100)"
                      className="app-select"
                    />
                  </div>
                  {error ? <p className="app-error-text">{error}</p> : null}
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="app-btn-md"
                  >
                    {isSaving ? "Saving..." : editingTask ? "Update list" : "Save list"}
                  </button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`app-tab ${activeTab === tab ? "app-tab-active" : ""}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visibleTasks.map((task) => (
            <article key={task.id} className="app-task-card">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">{task.title}</h3>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuTaskId((prev) => (prev === task.id ? null : task.id))}
                    className="rounded-md px-2 text-base font-bold text-muted-foreground"
                  >
                    ...
                  </button>
                  {menuTaskId === task.id ? (
                    <div className="app-menu">
                      <button
                        type="button"
                        onClick={() => openEditDialog(task)}
                        className="app-menu-item"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuTaskId(null);
                          setDeleteTask(task);
                        }}
                        className="app-menu-item-danger"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <p className="mb-3 text-sm leading-5 text-muted-foreground">{task.description}</p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Progress value={task.progress} max={100} className="w-24">
                    <ProgressTrack className="app-progress-track">
                      <ProgressIndicator className="app-progress-fill" />
                    </ProgressTrack>
                  </Progress>
                  <span className="text-xs font-semibold text-foreground">{task.progress}%</span>
                </div>
                <span className="app-pill-muted">
                  {task.status}
                </span>
              </div>
            </article>
          ))}
        </div>
        <AlertDialog open={Boolean(deleteTask)} onOpenChange={(open) => !open && setDeleteTask(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete todo?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this todo list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </main>
  );
}
