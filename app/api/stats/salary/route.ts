import { sql } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { storedDbUserId, userIdWherePair } from "@/lib/db-user-id";

async function ensureTable() {
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
}

async function getFlowMonthTotal(
  enc: string,
  plain: string,
  monthKey: string,
  flow: "Credited" | "Debited",
) {
  const rows = (await sql`
    SELECT COALESCE(
      SUM(
        NULLIF(regexp_replace(amount_fiat, '[^0-9.-]', '', 'g'), '')::numeric
      ),
      0
    ) AS total
    FROM wallet_transactions
    WHERE (user_id = ${enc} OR user_id = ${plain})
      AND flow = ${flow}
      AND to_char(tx_date, 'YYYY-MM') = ${monthKey}
  `) as { total: string | number }[];

  return Number(rows[0]?.total ?? 0);
}

type Body = {
  salary?: number;
};

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureTable();

  const body = (await request.json()) as Body;
  const salary = Number(body.salary);
  if (!Number.isFinite(salary) || salary < 0) {
    return NextResponse.json({ error: "Salary must be a valid positive number." }, { status: 400 });
  }

  const { enc, plain } = userIdWherePair(userId);
  const dbUserId = storedDbUserId(userId);

  const monthKey = new Date().toISOString().slice(0, 7);
  const existing = (await sql`
    SELECT id
    FROM stats_monthly
    WHERE (user_id = ${enc} OR user_id = ${plain})
      AND month_key = ${monthKey}
    LIMIT 1
  `) as { id: string | number }[];

  if (existing[0]) {
    return NextResponse.json(
      { error: "Salary is already saved for this month. You can save again next month." },
      { status: 409 },
    );
  }

  const totalDebitedMonth = await getFlowMonthTotal(enc, plain, monthKey, "Debited");
  const totalCreditedMonth = await getFlowMonthTotal(enc, plain, monthKey, "Credited");
  const remainingSaving = salary - totalDebitedMonth + totalCreditedMonth;

  await sql`
    INSERT INTO stats_monthly (user_id, month_key, salary, remaining_saving)
    VALUES (${dbUserId}, ${monthKey}, ${salary}, ${remainingSaving})
  `;

  return NextResponse.json({
    salary,
    totalDebitedMonth,
    totalCreditedMonth,
    remainingSaving,
    monthKey,
  });
}

