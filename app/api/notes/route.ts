import { sql } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { storedDbUserId, userIdWherePair } from "@/lib/db-user-id";

async function ensureTables() {
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
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS lines TEXT NOT NULL DEFAULT ''
  `;
  await sql`
    DO $migrate$
    BEGIN
      IF to_regclass('public.note_lines') IS NOT NULL THEN
        UPDATE notes AS n
        SET lines = agg.text_lines
        FROM (
          SELECT note_id,
                 string_agg(content, E'\n' ORDER BY sort_order NULLS LAST, id) AS text_lines
          FROM note_lines
          GROUP BY note_id
        ) AS agg
        WHERE n.id = agg.note_id AND COALESCE(n.lines, '') = '';
        DROP TABLE note_lines;
      END IF;
    END
    $migrate$
  `;
}

type BodyPayload = {
  id?: number;
  title?: string;
  lines?: string | string[];
};

function normalizeLines(body: BodyPayload): string | null {
  if (typeof body.lines === "string") {
    const trimmed = body.lines.trim();
    return trimmed.length ? trimmed : null;
  }
  if (Array.isArray(body.lines)) {
    const parts = body.lines.map((line) => String(line).trim()).filter(Boolean);
    return parts.length ? parts.join("\n") : null;
  }
  return null;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureTables();

  const body = (await request.json()) as BodyPayload;
  const title = body.title?.trim();
  const linesText = normalizeLines(body);

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!linesText) {
    return NextResponse.json(
      { error: "Add at least one line." },
      { status: 400 },
    );
  }

  const dbUserId = storedDbUserId(userId);

  const inserted = (await sql`
    INSERT INTO notes (user_id, title, lines)
    VALUES (${dbUserId}, ${title}, ${linesText})
    RETURNING id, title, lines
  `) as { id: string | number; title: string; lines: string }[];

  const row = inserted[0];
  return NextResponse.json({
    id: Number(row.id),
    title: row.title,
    lines: row.lines,
  });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureTables();

  const body = (await request.json()) as BodyPayload;
  const id = Number(body.id);
  const title = body.title?.trim();
  const linesText = normalizeLines(body);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid note id." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!linesText) {
    return NextResponse.json(
      { error: "Add at least one line." },
      { status: 400 },
    );
  }

  const { enc, plain } = userIdWherePair(userId);

  const updated = (await sql`
    UPDATE notes
    SET title = ${title}, lines = ${linesText}, updated_at = NOW()
    WHERE id = ${id}
      AND (user_id = ${enc} OR user_id = ${plain})
    RETURNING id, title, lines
  `) as { id: string | number; title: string; lines: string }[];

  if (!updated[0]) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  const row = updated[0];
  return NextResponse.json({
    id: Number(row.id),
    title: row.title,
    lines: row.lines,
  });
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureTables();

  const body = (await request.json()) as { id?: number };
  const id = Number(body.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid note id." }, { status: 400 });
  }

  const { enc, plain } = userIdWherePair(userId);

  const deleted = (await sql`
    DELETE FROM notes
    WHERE id = ${id}
      AND (user_id = ${enc} OR user_id = ${plain})
    RETURNING id
  `) as { id: string | number }[];

  if (!deleted[0]) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
