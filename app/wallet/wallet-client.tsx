"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
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

type PaymentStatus = "Completed" | "Canceled";
type PaymentFlow = "Credited" | "Debited";

export type WalletEntry = {
  id: number;
  flow: PaymentFlow;
  price: string;
  to: string;
  date: string;
  reason: string;
  status: PaymentStatus;
};

type WalletClientProps = {
  initialEntries: WalletEntry[];
};

type WalletForm = {
  flow: PaymentFlow;
  price: string;
  to: string;
  date: string;
  reason: string;
  status: PaymentStatus;
};

function formatTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Payments list: DD-MM-YYYY (storage & API stay YYYY-MM-DD). */
function formatDateDdMmYyyy(isoYyyyMmDd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoYyyyMmDd.trim());
  if (!m) return isoYyyyMmDd;
  const [, y, mo, d] = m;
  return `${d}-${mo}-${y}`;
}

/** Oldest date first; same-day ties broken by id ascending. */
function compareWalletEntries(a: WalletEntry, b: WalletEntry): number {
  const byDate = a.date.localeCompare(b.date);
  if (byDate !== 0) return byDate;
  return a.id - b.id;
}

const defaultForm: WalletForm = {
  flow: "Debited",
  price: "",
  to: "",
  date: formatTodayIso(),
  reason: "",
  status: "Completed",
};

export default function WalletClient({ initialEntries }: WalletClientProps) {
  const [entries, setEntries] = useState<WalletEntry[]>(() =>
    [...initialEntries].sort(compareWalletEntries),
  );
  const sortedEntries = useMemo(
    () => [...entries].sort(compareWalletEntries),
    [entries],
  );
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<WalletForm>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  function notifyWalletUpdated() {
    const stamp = String(Date.now());
    localStorage.setItem("wallet:last-updated", stamp);
    window.dispatchEvent(new Event("wallet:updated"));
  }

  function update<K extends keyof WalletForm>(key: K, value: WalletForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const isEdit = editingId !== null;
      const res = await fetch("/api/wallet", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: editingId, ...form } : form),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save payment.");
      }
      if (isEdit) {
        const updated = (await res.json()) as WalletEntry;
        setEntries((prev) =>
          prev
            .map((entry) => (entry.id === updated.id ? updated : entry))
            .sort(compareWalletEntries),
        );
        toast.success("Payment updated.");
      } else {
        const json = (await res.json().catch(() => ({}))) as { id?: number };
        const id = json.id ?? Date.now();
        const added: WalletEntry = { id, ...form };
        setEntries((prev) => [...prev, added].sort(compareWalletEntries));
        toast.success("Payment saved.");
      }
      notifyWalletUpdated();
      setShowForm(false);
      setEditingId(null);
      setForm({ ...defaultForm, date: formatTodayIso() });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save payment.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  function onEdit(entry: WalletEntry) {
    setEditingId(entry.id);
    setForm({
      flow: entry.flow,
      price: entry.price,
      to: entry.to,
      date: entry.date,
      reason: entry.reason,
      status: entry.status,
    });
    setError("");
    setShowForm(true);
  }

  async function onDelete(entryId: number) {
    setIsDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/wallet", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entryId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete payment.");
      }
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
      setDeleteId(null);
      notifyWalletUpdated();
      toast.success("Payment deleted.");
      if (editingId === entryId) {
        setEditingId(null);
        setShowForm(false);
        setForm({ ...defaultForm, date: formatTodayIso() });
      }
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Failed to delete payment.";
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="w-full bg-background px-3 py-3 text-foreground md:px-4">
      <section className="mx-auto w-full max-w-[1500px]">
        <header className="mb-4 flex items-center gap-2">
          <div className="app-wallet-search">
            <Search size={16} className="shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search payments..."
              className="min-w-0 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              readOnly
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setForm({ ...defaultForm, date: formatTodayIso() });
              setShowForm(true);
            }}
            className="app-btn-icon shrink-0"
            aria-label="Add payment"
          >
            <Plus size={18} />
          </button>
        </header>

        <div className="mb-3">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Payments</h2>
        </div>

        <div className="app-wallet-grid-head">
          <p>Credited / Debited</p>
          <p>Price</p>
          <p>To</p>
          <p>Date</p>
          <p>Reason</p>
          <p className="text-right">Payment status</p>
          <p className="text-right">Actions</p>
        </div>

        {sortedEntries.map((row) => (
          <div
            key={row.id}
            className="app-wallet-grid-row"
          >
            <div>
              <span
                className={row.flow === "Credited" ? "app-badge-flow-credit" : "app-badge-flow-debit"}
              >
                {row.flow}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">{row.price}</p>
            <p className="text-sm font-medium text-foreground/90">{row.to}</p>
            <p className="text-xs text-muted-foreground">{formatDateDdMmYyyy(row.date)}</p>
            <p className="text-sm font-medium text-foreground/90">{row.reason}</p>
            <div className="text-right">
              <span
                className={row.status === "Completed" ? "app-badge-ok" : "app-badge-bad"}
              >
                {row.status}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onEdit(row)}
                className="app-btn-ghost-row"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteId(row.id)}
                className="app-btn-danger-row"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        <div className="space-y-3 md:hidden">
          {sortedEntries.map((row) => (
            <article key={row.id} className="app-wallet-card">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span
                  className={row.flow === "Credited" ? "app-badge-flow-credit" : "app-badge-flow-debit"}
                >
                  {row.flow}
                </span>
                <span
                  className={row.status === "Completed" ? "app-badge-ok" : "app-badge-bad"}
                >
                  {row.status}
                </span>
              </div>
              <div className="app-wallet-card-row">
                <span className="app-wallet-card-label">Price</span>
                <span className="app-wallet-card-value">{row.price}</span>
              </div>
              <div className="app-wallet-card-row">
                <span className="app-wallet-card-label">To</span>
                <span className="app-wallet-card-value">{row.to}</span>
              </div>
              <div className="app-wallet-card-row">
                <span className="app-wallet-card-label">Date</span>
                <span className="app-wallet-card-value">{formatDateDdMmYyyy(row.date)}</span>
              </div>
              <div className="app-wallet-card-row border-t border-border pt-3">
                <span className="app-wallet-card-label">Reason</span>
                <span className="app-wallet-card-value">{row.reason}</span>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="app-btn-ghost-row"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteId(row.id)}
                  className="app-btn-danger-row"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {showForm ? (
        <div className="app-wallet-modal-overlay">
          <form
            onSubmit={onSubmit}
            className="app-wallet-modal"
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-base font-semibold text-card-foreground">
                {editingId !== null ? "Edit payment" : "New payment"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm({ ...defaultForm, date: formatTodayIso() });
                }}
                className="text-xs text-muted-foreground"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={form.flow}
                onChange={(e) => update("flow", e.target.value as PaymentFlow)}
                className="app-input-compact"
              >
                <option value="Credited">Credited</option>
                <option value="Debited">Debited</option>
              </select>
              <input
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                className="app-input-compact"
                placeholder="Price"
                required
              />
              <input
                value={form.to}
                onChange={(e) => update("to", e.target.value)}
                className="app-input-compact col-span-2"
                placeholder="To"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="wallet-tx-date"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Transaction date
                </label>
                <button
                  type="button"
                  onClick={() => update("date", formatTodayIso())}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Use today
                </button>
              </div>
              <input
                id="wallet-tx-date"
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className="app-input-date"
                required
              />
            </div>

            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value as PaymentStatus)}
              className="app-input-compact w-full"
            >
              <option value="Completed">Completed</option>
              <option value="Canceled">Canceled</option>
            </select>

            <input
              value={form.reason}
              onChange={(e) => update("reason", e.target.value)}
              className="app-input-compact"
              placeholder="Reason"
              required
            />

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <button
              type="submit"
              disabled={isSaving}
              className="app-wallet-submit"
            >
              {isSaving ? "Saving..." : editingId ? "Update payment" : "Save payment"}
            </button>
          </form>
        </div>
      ) : null}

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This payment record will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting || deleteId === null}
              onClick={() => {
                if (deleteId !== null) void onDelete(deleteId);
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

