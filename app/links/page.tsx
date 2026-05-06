import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import LinksClient from "@/app/links/links-client";
import type { SavedLink } from "@/app/links/types";
import { decryptLinkUrl } from "@/lib/field-crypto";
import { userIdWherePair } from "@/lib/db-user-id";

export default async function LinksPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

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

  const { enc, plain } = userIdWherePair(userId);

  const rows = (await sql`
    SELECT id, title, url, link_date, color_classes
    FROM saved_links
    WHERE (user_id = ${enc} OR user_id = ${plain})
    ORDER BY link_date DESC, created_at DESC
  `) as {
    id: string | number;
    title: string;
    url: string;
    link_date: string;
    color_classes: string;
  }[];

  const initialLinks: SavedLink[] = rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    url: decryptLinkUrl(row.url),
    linkDate:
      typeof row.link_date === "string"
        ? row.link_date.slice(0, 10)
        : String(row.link_date).slice(0, 10),
    colorClasses: row.color_classes,
  }));

  return <LinksClient initialLinks={initialLinks} />;
}
