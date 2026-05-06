import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import StatsClient from "./stats-client";
import { sql } from "@/lib/db";
import { userIdWherePair } from "@/lib/db-user-id";

export default async function StatsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { enc: uidEnc, plain: uidPlain } = userIdWherePair(userId);

  await sql`
    CREATE TABLE IF NOT EXISTS stats_monthly (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      month_key TEXT NOT NULL,
      salary NUMERIC(12, 2) NOT NULL,
      remaining_saving NUMERIC(12, 2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, month_key)
    )
  `;

  const monthKey = new Date().toISOString().slice(0, 7);
  const todayKey = new Date().toISOString().slice(0, 10);

  const monthlyRows = (await sql`
    SELECT COALESCE(
      SUM(
        NULLIF(regexp_replace(amount_fiat, '[^0-9.-]', '', 'g'), '')::numeric
      ),
      0
    ) AS total
    FROM wallet_transactions
    WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})
      AND flow = 'Debited'
      AND to_char(tx_date, 'YYYY-MM') = ${monthKey}
  `) as { total: string | number }[];

  const creditedRows = (await sql`
    SELECT COALESCE(
      SUM(
        NULLIF(regexp_replace(amount_fiat, '[^0-9.-]', '', 'g'), '')::numeric
      ),
      0
    ) AS total
    FROM wallet_transactions
    WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})
      AND flow = 'Credited'
      AND to_char(tx_date, 'YYYY-MM') = ${monthKey}
  `) as { total: string | number }[];

  const todayRows = (await sql`
    SELECT COALESCE(
      SUM(
        NULLIF(regexp_replace(amount_fiat, '[^0-9.-]', '', 'g'), '')::numeric
      ),
      0
    ) AS total
    FROM wallet_transactions
    WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})
      AND flow = 'Debited'
      AND tx_date = ${todayKey}::date
  `) as { total: string | number }[];

  const dailyRows = (await sql`
    SELECT
      to_char(tx_date, 'YYYY-MM-DD') AS day,
      COALESCE(
        SUM(NULLIF(regexp_replace(amount_fiat, '[^0-9.-]', '', 'g'), '')::numeric),
        0
      ) AS total
    FROM wallet_transactions
    WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})
      AND flow = 'Debited'
      AND to_char(tx_date, 'YYYY-MM') = ${monthKey}
    GROUP BY tx_date
    ORDER BY tx_date DESC
    LIMIT 10
  `) as { day: string; total: string | number }[];

  const salaryRows = (await sql`
    SELECT salary, remaining_saving
    FROM stats_monthly
    WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})
      AND month_key = ${monthKey}
    LIMIT 1
  `) as { salary: string | number; remaining_saving: string | number }[];

  const totalDebitedMonth = Number(monthlyRows[0]?.total ?? 0);
  const totalCreditedMonth = Number(creditedRows[0]?.total ?? 0);
  const todaySpending = Number(todayRows[0]?.total ?? 0);
  const savedSalary = Number(salaryRows[0]?.salary ?? 0);
  const savedRemaining = Number(savedSalary - totalDebitedMonth + totalCreditedMonth);
  const salaryLocked = Boolean(salaryRows[0]);

  return (
    <StatsClient
      initialSalary={savedSalary}
      initialRemainingSaving={savedRemaining}
      salaryLocked={salaryLocked}
      totalDebitedMonth={totalDebitedMonth}
      todaySpending={todaySpending}
      dailySpending={dailyRows.map((row) => ({
        day: row.day,
        total: Number(row.total),
      }))}
    />
  );
}
