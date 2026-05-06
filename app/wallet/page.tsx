import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import WalletClient from "@/app/wallet/wallet-client";
import { sql } from "@/lib/db";
import { userIdWherePair } from "@/lib/db-user-id";
import { calendarDayFromPg } from "@/lib/pg-calendar-date";

export default async function WalletPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

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

  const { enc, plain } = userIdWherePair(userId);

  const rows = (await sql`
    SELECT id, flow, tx_date::text AS tx_date, amount_fiat, wallet, reason, status
    FROM wallet_transactions
    WHERE (user_id = ${enc} OR user_id = ${plain})
    ORDER BY wallet_transactions.tx_date ASC, wallet_transactions.created_at ASC
  `) as {
    id: string | number;
    flow: string;
    tx_date: string;
    amount_fiat: string;
    wallet: string;
    reason: string;
    status: string;
  }[];

  const entries = rows.map((row) => ({
    id: Number(row.id),
    flow: row.flow as "Credited" | "Debited",
    price: row.amount_fiat,
    to: row.wallet,
    date: calendarDayFromPg(row.tx_date),
    reason: row.reason,
    status: row.status as "Completed" | "Canceled",
  }));

  return <WalletClient initialEntries={entries} />;
}
