import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { userIdWherePair } from "@/lib/db-user-id";

function toCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { enc: uidEnc, plain: uidPlain } = userIdWherePair(userId);
  const monthKey = new Date().toISOString().slice(0, 7);

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
  await sql`
    CREATE TABLE IF NOT EXISTS todo_lists (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
      progress INTEGER NOT NULL CHECK (progress >= 0 AND progress <= 100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS notes (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      lines TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS saved_links (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      link_date DATE NOT NULL DEFAULT CURRENT_DATE,
      color_classes TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const walletCountRows = (await sql`
    SELECT COUNT(*)::int AS count
    FROM wallet_transactions
    WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})
  `) as { count: number }[];
  const walletCount = walletCountRows[0]?.count ?? 0;

  const monthlySpendRows = (await sql`
    SELECT COALESCE(
      SUM(NULLIF(regexp_replace(amount_fiat, '[^0-9.-]', '', 'g'), '')::numeric),
      0
    ) AS total
    FROM wallet_transactions
    WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})
      AND flow = 'Debited'
      AND to_char(tx_date, 'YYYY-MM') = ${monthKey}
  `) as { total: string | number }[];
  const totalSpendingMonth = Number(monthlySpendRows[0]?.total ?? 0);

  const monthlyCreditRows = (await sql`
    SELECT COALESCE(
      SUM(NULLIF(regexp_replace(amount_fiat, '[^0-9.-]', '', 'g'), '')::numeric),
      0
    ) AS total
    FROM wallet_transactions
    WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})
      AND flow = 'Credited'
      AND to_char(tx_date, 'YYYY-MM') = ${monthKey}
  `) as { total: string | number }[];
  const totalCreditedMonth = Number(monthlyCreditRows[0]?.total ?? 0);

  const dailySpendRows = (await sql`
    SELECT
      COUNT(DISTINCT tx_date)::int AS days_count,
      COALESCE(
        SUM(NULLIF(regexp_replace(amount_fiat, '[^0-9.-]', '', 'g'), '')::numeric),
        0
      ) AS total
    FROM wallet_transactions
    WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})
      AND flow = 'Debited'
      AND to_char(tx_date, 'YYYY-MM') = ${monthKey}
  `) as { days_count: number; total: string | number }[];
  const daysCount = dailySpendRows[0]?.days_count ?? 0;
  const dailyAverage = daysCount > 0 ? Math.round(Number(dailySpendRows[0]?.total ?? 0) / daysCount) : 0;

  const activeTodoRows = (await sql`
    SELECT COUNT(*)::int AS count
    FROM todo_lists
    WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})
      AND status = 'active'
  `) as { count: number }[];
  const activeTodos = activeTodoRows[0]?.count ?? 0;

  const notesLinksRows = (await sql`
    SELECT
      (SELECT COUNT(*)::int FROM notes WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})) AS notes_count,
      (SELECT COUNT(*)::int FROM saved_links WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})) AS links_count
  `) as { notes_count: number; links_count: number }[];
  const notesCount = notesLinksRows[0]?.notes_count ?? 0;
  const linksCount = notesLinksRows[0]?.links_count ?? 0;

  const salaryRows = (await sql`
    SELECT salary, remaining_saving
    FROM stats_monthly
    WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})
      AND month_key = ${monthKey}
    LIMIT 1
  `) as { salary: string | number; remaining_saving: string | number }[];
  const salary = Number(salaryRows[0]?.salary ?? 0);
  const remainingSaving = salary - totalSpendingMonth + totalCreditedMonth;

  const latestWalletRows = (await sql`
    SELECT status, amount_fiat, flow
    FROM wallet_transactions
    WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})
    ORDER BY created_at DESC
    LIMIT 1
  `) as { status: string; amount_fiat: string; flow: string }[];
  const latestWalletStatus = latestWalletRows[0]?.status ?? "N/A";
  const latestWalletText = latestWalletRows[0]
    ? `${latestWalletRows[0].flow}: ${latestWalletRows[0].amount_fiat}`
    : "No wallet transaction yet";

  const latestTodoRows = (await sql`
    SELECT title, progress
    FROM todo_lists
    WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})
    ORDER BY created_at DESC
    LIMIT 1
  `) as { title: string; progress: number }[];
  const latestNoteRows = (await sql`
    SELECT title
    FROM notes
    WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})
    ORDER BY created_at DESC
    LIMIT 1
  `) as { title: string }[];
  const latestLinkRows = (await sql`
    SELECT title
    FROM saved_links
    WHERE (user_id = ${uidEnc} OR user_id = ${uidPlain})
    ORDER BY created_at DESC
    LIMIT 1
  `) as { title: string }[];

  return (
    <main className="app-screen md:p-6">
      <section className="w-full">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="app-heading">Coredesk Dashboard</h1>
            <p className="app-subtext mt-1">
              Combined overview of Wallet, Stats, Todo, Notes, and Links.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="app-card">
            <p className="app-stat-label">Wallet Transactions</p>
            <p className="app-stat-value mt-2">{walletCount}</p>
            <p className="app-stat-label mt-1">Total records in wallet</p>
          </article>

          <article className="app-card">
            <p className="app-stat-label">Total Spending (Month)</p>
            <p className="app-stat-value mt-2">
              {toCurrency(totalSpendingMonth)}
            </p>
            <p className="app-stat-label mt-1">
              Daily average: {toCurrency(dailyAverage)}
            </p>
          </article>

          <article className="app-card">
            <p className="app-stat-label">Active Todo Tasks</p>
            <p className="app-stat-value mt-2">{activeTodos}</p>
            <p className="app-stat-label mt-1">Progress tracked by task cards</p>
          </article>

          <article className="app-card">
            <p className="app-stat-label">Notes + Links</p>
            <p className="app-stat-value mt-2">{notesCount + linksCount}</p>
            <p className="app-stat-label mt-1">Combined saved entries</p>
          </article>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section className="app-card xl:col-span-2">
            <h2 className="app-title-section">Wallet + Stats Snapshot</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="app-inset">
                <p className="app-stat-label">Monthly Salary</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{toCurrency(salary)}</p>
              </div>
              <div className="app-inset">
                <p className="app-stat-label">Current Month Saving</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{toCurrency(remainingSaving)}</p>
              </div>
              <div className="app-inset">
                <p className="app-stat-label">Monthly Balance</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {toCurrency(salary - totalSpendingMonth)}
                </p>
              </div>
              <div className="app-inset">
                <p className="app-stat-label">Latest Wallet Status</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{latestWalletStatus}</p>
              </div>
            </div>
          </section>

          <section className="app-card">
            <h2 className="app-title-section">Quick Items</h2>
            <ul className="mt-3 space-y-2">
              <li className="app-list-row">
                Todo:{" "}
                {latestTodoRows[0]
                  ? `${latestTodoRows[0].title} (${latestTodoRows[0].progress}%)`
                  : "No todo yet"}
              </li>
              <li className="app-list-row">
                Note: {latestNoteRows[0]?.title ?? "No note yet"}
              </li>
              <li className="app-list-row">
                Link: {latestLinkRows[0]?.title ?? "No link yet"}
              </li>
              <li className="app-list-row">Wallet: {latestWalletText}</li>
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
