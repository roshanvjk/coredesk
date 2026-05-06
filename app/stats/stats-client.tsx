"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type DailySpendingItem = {
  day: string;
  total: number;
};

function toCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

type StatsClientProps = {
  initialSalary: number;
  initialRemainingSaving: number;
  salaryLocked: boolean;
  totalDebitedMonth: number;
  todaySpending: number;
  dailySpending: DailySpendingItem[];
};

export default function StatsClient({
  initialSalary,
  initialRemainingSaving,
  salaryLocked,
  totalDebitedMonth,
  todaySpending,
  dailySpending,
}: StatsClientProps) {
  const router = useRouter();
  const [salary, setSalary] = useState<number>(initialSalary);
  const [remainingSaving, setRemainingSaving] = useState<number>(initialRemainingSaving);
  const [isSavingSalary, setIsSavingSalary] = useState(false);
  const [isSalaryLocked, setIsSalaryLocked] = useState(salaryLocked);
  const [error, setError] = useState("");

  const eachDayAverageSpending = useMemo(() => {
    if (dailySpending.length === 0) return 0;
    const total = dailySpending.reduce((sum, d) => sum + d.total, 0);
    return Math.round(total / dailySpending.length);
  }, [dailySpending]);

  useEffect(() => {
    const onWalletUpdate = () => {
      router.refresh();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "wallet:last-updated") {
        router.refresh();
      }
    };
    window.addEventListener("wallet:updated", onWalletUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("wallet:updated", onWalletUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, [router]);

  async function saveSalary() {
    if (isSalaryLocked) return;
    setIsSavingSalary(true);
    setError("");
    try {
      const response = await fetch("/api/stats/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salary }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save salary.");
      }
      const body = (await response.json()) as {
        remainingSaving: number;
      };
      setRemainingSaving(Number(body.remainingSaving));
      toast.success("Salary saved for current month.");
      setIsSalaryLocked(true);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save salary.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSavingSalary(false);
    }
  }

  return (
    <main className="app-screen-scroll">
      <section className="app-scroll-inner">
        <div>
          <h1 className="app-title-page">Wallet Overview</h1>
          <p className="app-subtext mt-1">
            Manage your spending and savings stats.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="app-stat-label font-normal">
                Total Debited Spending (Month)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="app-stat-value-md">
                {toCurrency(totalDebitedMonth)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="app-stat-label font-normal">
                Each Day Spending (Average)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="app-stat-value-md">
                {toCurrency(eachDayAverageSpending)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <label htmlFor="salary" className="app-label">
                  Salary (Monthly)
                </label>
                <input
                  id="salary"
                  type="number"
                  value={salary}
                  onChange={(event) => setSalary(Number(event.target.value) || 0)}
                  placeholder="50000"
                  disabled={isSalaryLocked}
                  className="app-input h-11 rounded-lg"
                />
              </div>
              <button
                type="button"
                onClick={saveSalary}
                disabled={isSavingSalary || isSalaryLocked}
                className="app-btn-inline-primary"
              >
                {isSalaryLocked ? "Saved for this month" : isSavingSalary ? "Saving..." : "Save Salary"}
              </button>
            </div>
            {isSalaryLocked ? (
              <p className="app-body-text mt-3">
                Salary is already saved for this month. You can update it next month.
              </p>
            ) : null}
            {error ? <p className="app-error-text mt-3">{error}</p> : null}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="app-title-section">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="app-body-text">
              Today Spending:{" "}
              <span className="font-semibold text-foreground">
                {toCurrency(todaySpending)}
              </span>
            </p>
            <p className="app-body-text mt-1">
              Remaining Saving (Current Month):{" "}
              <span className="font-semibold text-foreground">{toCurrency(remainingSaving)}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Includes credited entries (+) and debited spending (-) from wallet.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="app-title-section">
              Day-wise Spending (Debited)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailySpending.length === 0 ? (
              <p className="app-subtext">No debited transactions this month.</p>
            ) : (
              <div className="space-y-2">
                {dailySpending.map((item) => (
                  <div key={item.day} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.day}</span>
                    <span className="font-semibold text-foreground">{toCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
