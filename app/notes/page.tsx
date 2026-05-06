import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import NotesClient from "@/app/notes/notes-client";
import type { Note } from "@/app/notes/types";
import { userIdWherePair } from "@/lib/db-user-id";

export default async function NotesPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

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

  const { enc, plain } = userIdWherePair(userId);

  const rows = (await sql`
    SELECT id, title, lines
    FROM notes
    WHERE (user_id = ${enc} OR user_id = ${plain})
    ORDER BY created_at DESC
  `) as {
    id: string | number;
    title: string;
    lines: string;
  }[];

  const initialNotes: Note[] = rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    lines: row.lines ?? "",
  }));

  return <NotesClient initialNotes={initialNotes} />;
}
