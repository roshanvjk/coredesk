/**
 * One-off migration: replace plaintext Clerk user_id keys with encrypted-at-rest
 * blobs and encrypt saved_links.url values.
 *
 * Requires DATABASE_URL and FIELD_ENCRYPTION_KEY (same values as the Next.js app).
 *
 * Run from repo root:
 *   npx tsx scripts/migrate-encrypt-at-rest.ts
 */

import { sql } from "../lib/db";
import {
  encryptLinkUrl,
  encryptUserIdForStorage,
  isLinkUrlEncrypted,
  isStoredUserIdEncrypted,
} from "../lib/field-crypto";

type UserRow = { user_id: string };

async function migrateDistinctUsers(
  rows: UserRow[],
  tableName: string,
) {
  for (const { user_id } of rows) {
    if (!user_id || isStoredUserIdEncrypted(user_id)) continue;
    const next = encryptUserIdForStorage(user_id);
    if (tableName === "wallet_transactions") {
      await sql`
        UPDATE wallet_transactions SET user_id = ${next} WHERE user_id = ${user_id}
      `;
    } else if (tableName === "stats_monthly") {
      await sql`
        UPDATE stats_monthly SET user_id = ${next} WHERE user_id = ${user_id}
      `;
    } else if (tableName === "todo_lists") {
      await sql`UPDATE todo_lists SET user_id = ${next} WHERE user_id = ${user_id}`;
    } else if (tableName === "notes") {
      await sql`UPDATE notes SET user_id = ${next} WHERE user_id = ${user_id}`;
    } else if (tableName === "saved_links") {
      await sql`
        UPDATE saved_links SET user_id = ${next} WHERE user_id = ${user_id}
      `;
    }
    console.log(`[migrate] ${tableName}: remapped user row (${user_id.slice(0, 12)}…)`);
  }
}

async function migrateLinkUrls() {
  let rows: { id: string | number; url: string }[];
  try {
    rows = (await sql`
      SELECT id, url FROM saved_links
    `) as { id: string | number; url: string }[];
  } catch {
    console.warn("[migrate] skip saved_links URLs");
    return;
  }

  for (const row of rows) {
    if (!row.url || isLinkUrlEncrypted(row.url)) continue;
    const encUrl = encryptLinkUrl(row.url);
    await sql`UPDATE saved_links SET url = ${encUrl} WHERE id = ${row.id}`;
    console.log(`[migrate] saved_links: encrypted url for id=${row.id}`);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }
  if (!process.env.FIELD_ENCRYPTION_KEY?.trim()) {
    throw new Error("FIELD_ENCRYPTION_KEY is required.");
  }

  const tables: [string, Promise<unknown>][] = [
    ["wallet_transactions", sql`SELECT DISTINCT user_id FROM wallet_transactions`],
    ["stats_monthly", sql`SELECT DISTINCT user_id FROM stats_monthly`],
    ["todo_lists", sql`SELECT DISTINCT user_id FROM todo_lists`],
    ["notes", sql`SELECT DISTINCT user_id FROM notes`],
    ["saved_links", sql`SELECT DISTINCT user_id FROM saved_links`],
  ];

  for (const [name, query] of tables) {
    try {
      const rows = (await query) as UserRow[];
      await migrateDistinctUsers(rows, name);
    } catch {
      console.warn(`[migrate] skip ${name} (table missing or error)`);
    }
  }

  await migrateLinkUrls();

  console.log("[migrate] done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
