import { sql } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { randomLinkPalette } from "@/lib/link-palettes";
import {
  decryptLinkUrl,
  encryptLinkUrl,
} from "@/lib/field-crypto";
import { storedDbUserId, userIdWherePair } from "@/lib/db-user-id";

async function ensureTable() {
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
}

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withProtocol =
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return parsed.href;
  } catch {
    return null;
  }
}

type Body = {
  id?: number;
  title?: string;
  url?: string;
  linkDate?: string;
};

function rowToJson(row: {
  id: string | number;
  title: string;
  url: string;
  link_date: string | Date;
  color_classes: string;
}) {
  const dateStr =
    typeof row.link_date === "string"
      ? row.link_date.slice(0, 10)
      : row.link_date.toISOString().slice(0, 10);
  return {
    id: Number(row.id),
    title: row.title,
    url: decryptLinkUrl(row.url),
    linkDate: dateStr,
    colorClasses: row.color_classes,
  };
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureTable();

  const body = (await request.json()) as Body;
  const title = body.title?.trim();
  const url = normalizeUrl(body.url ?? "");

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!url) {
    return NextResponse.json({ error: "Valid link URL is required." }, { status: 400 });
  }

  const colorClasses = randomLinkPalette();
  const dbUserId = storedDbUserId(userId);
  const urlStored = encryptLinkUrl(url);

  const inserted = (await sql`
    INSERT INTO saved_links (user_id, title, url, color_classes)
    VALUES (${dbUserId}, ${title}, ${urlStored}, ${colorClasses})
    RETURNING id, title, url, link_date, color_classes
  `) as {
    id: string | number;
    title: string;
    url: string;
    link_date: string;
    color_classes: string;
  }[];

  return NextResponse.json(rowToJson(inserted[0]!));
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureTable();

  const body = (await request.json()) as Body;
  const id = Number(body.id);
  const title = body.title?.trim();
  const url = normalizeUrl(body.url ?? "");
  const rawDate = body.linkDate?.trim();
  const rawDateOrNull = rawDate ? rawDate : null;

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid link id." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!url) {
    return NextResponse.json({ error: "Valid link URL is required." }, { status: 400 });
  }

  const { enc, plain } = userIdWherePair(userId);
  const urlStored = encryptLinkUrl(url);

  const updated = (await sql`
    UPDATE saved_links
    SET title = ${title},
        url = ${urlStored},
        link_date = COALESCE(${rawDateOrNull}::date, link_date),
        updated_at = NOW()
    WHERE id = ${id}
      AND (user_id = ${enc} OR user_id = ${plain})
    RETURNING id, title, url, link_date, color_classes
  `) as {
    id: string | number;
    title: string;
    url: string;
    link_date: string;
    color_classes: string;
  }[];

  if (!updated[0]) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  return NextResponse.json(rowToJson(updated[0]!));
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
    return NextResponse.json({ error: "Invalid link id." }, { status: 400 });
  }

  const { enc, plain } = userIdWherePair(userId);

  const deleted = (await sql`
    DELETE FROM saved_links
    WHERE id = ${id}
      AND (user_id = ${enc} OR user_id = ${plain})
    RETURNING id
  `) as { id: string | number }[];

  if (!deleted[0]) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
