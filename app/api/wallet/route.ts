import { sql } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { storedDbUserId, userIdWherePair } from "@/lib/db-user-id";
import { calendarDayFromPg } from "@/lib/pg-calendar-date";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      flow TEXT NOT NULL DEFAULT 'Debited',
      tx_date DATE NOT NULL,
      amount_fiat TEXT NOT NULL,
      wallet TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS flow TEXT NOT NULL DEFAULT 'Debited'`;
}

type Body = {
  id?: number;
  price?: string;
  to?: string;
  date?: string; // YYYY-MM-DD
  reason?: string;
  status?: "Completed" | "Canceled";
  flow?: "Credited" | "Debited";
};

function validateBody(body: Body) {
  const price = body.price?.trim();
  const to = body.to?.trim();
  const dateRaw = body.date?.trim();
  const reason = body.reason?.trim();
  const status = body.status;
  const flow = body.flow;

  if (!price || !to || !dateRaw || !reason || !status || !flow) {
    return {
      error: "Price, To, Date, Reason, Status and Credit/Debit are required.",
    };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    return { error: "Date must be YYYY-MM-DD." };
  }
  const [y, mo, d] = dateRaw.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, mo - 1, d));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() !== mo - 1 ||
    parsed.getUTCDate() !== d
  ) {
    return { error: "Invalid calendar date." };
  }
  return { price, to, date: dateRaw, reason, status, flow };
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureTable();

  const body = (await request.json()) as Body;
  const validated = validateBody(body);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const { price, to, date, reason, status, flow } = validated;
  const dbUserId = storedDbUserId(userId);

  const inserted = await sql`
    INSERT INTO wallet_transactions (
      user_id,
      flow,
      tx_date,
      amount_fiat,
      wallet,
      reason,
      status
    )
    VALUES (
      ${dbUserId},
      ${flow},
      ${date}::date,
      ${price},
      ${to},
      ${reason},
      ${status}
    )
    RETURNING id
  `;

  return NextResponse.json({ id: inserted[0].id });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureTable();

  const body = (await request.json()) as Body;
  const id = Number(body.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid payment id." }, { status: 400 });
  }

  const validated = validateBody(body);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const { price, to, date, reason, status, flow } = validated;
  const { enc, plain } = userIdWherePair(userId);

  const updated = (await sql`
    UPDATE wallet_transactions
    SET flow = ${flow},
        tx_date = ${date}::date,
        amount_fiat = ${price},
        wallet = ${to},
        reason = ${reason},
        status = ${status}
    WHERE id = ${id}
      AND (user_id = ${enc} OR user_id = ${plain})
    RETURNING id, flow, tx_date::text AS tx_date, amount_fiat, wallet, reason, status
  `) as {
    id: string | number;
    flow: "Credited" | "Debited";
    tx_date: string;
    amount_fiat: string;
    wallet: string;
    reason: string;
    status: "Completed" | "Canceled";
  }[];

  if (!updated[0]) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  const row = updated[0];
  return NextResponse.json({
    id: Number(row.id),
    flow: row.flow,
    price: row.amount_fiat,
    to: row.wallet,
    date: calendarDayFromPg(row.tx_date),
    reason: row.reason,
    status: row.status,
  });
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureTable();

  const body = (await request.json()) as { id?: number };
  const id = Number(body.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid payment id." }, { status: 400 });
  }

  const { enc, plain } = userIdWherePair(userId);

  const deleted = (await sql`
    DELETE FROM wallet_transactions
    WHERE id = ${id}
      AND (user_id = ${enc} OR user_id = ${plain})
    RETURNING id
  `) as { id: string | number }[];

  if (!deleted[0]) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

