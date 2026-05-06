import { sql } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { storedDbUserId, userIdWherePair } from "@/lib/db-user-id";

type CreateTodoPayload = {
  id?: number;
  title?: string;
  description?: string;
  status?: "active" | "completed";
  progress?: number;
};

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateTodoPayload;
  const title = body.title?.trim();
  const description = body.description?.trim();
  const status = body.status;
  const progress = Number(body.progress);

  if (!title || !description) {
    return NextResponse.json(
      { error: "Title and description are required." },
      { status: 400 },
    );
  }

  if (status !== "active" && status !== "completed") {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    return NextResponse.json(
      { error: "Progress must be a number between 0 and 100." },
      { status: 400 },
    );
  }

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

  const dbUserId = storedDbUserId(userId);

  const inserted = (await sql`
    INSERT INTO todo_lists (user_id, title, description, status, progress)
    VALUES (${dbUserId}, ${title}, ${description}, ${status}, ${Math.round(progress)})
    RETURNING id, title, description, status, progress
  `) as {
    id: string | number;
    title: string;
    description: string;
    status: "active" | "completed";
    progress: number;
  }[];

  const row = inserted[0];
  return NextResponse.json({
    id: Number(row.id),
    title: row.title,
    description: row.description,
    status: row.status,
    progress: Number(row.progress),
  });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateTodoPayload;
  const id = Number(body.id);
  const title = body.title?.trim();
  const description = body.description?.trim();
  const status = body.status;
  const progress = Number(body.progress);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid todo id." }, { status: 400 });
  }

  if (!title || !description) {
    return NextResponse.json(
      { error: "Title and description are required." },
      { status: 400 },
    );
  }

  if (status !== "active" && status !== "completed") {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    return NextResponse.json(
      { error: "Progress must be a number between 0 and 100." },
      { status: 400 },
    );
  }

  const { enc, plain } = userIdWherePair(userId);

  const updated = (await sql`
    UPDATE todo_lists
    SET title = ${title},
        description = ${description},
        status = ${status},
        progress = ${Math.round(progress)}
    WHERE id = ${id}
      AND (user_id = ${enc} OR user_id = ${plain})
    RETURNING id, title, description, status, progress
  `) as {
    id: string | number;
    title: string;
    description: string;
    status: "active" | "completed";
    progress: number;
  }[];

  if (!updated[0]) {
    return NextResponse.json({ error: "Todo not found." }, { status: 404 });
  }

  const row = updated[0];
  return NextResponse.json({
    id: Number(row.id),
    title: row.title,
    description: row.description,
    status: row.status,
    progress: Number(row.progress),
  });
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { id?: number };
  const id = Number(body.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid todo id." }, { status: 400 });
  }

  const { enc, plain } = userIdWherePair(userId);

  const deleted = (await sql`
    DELETE FROM todo_lists
    WHERE id = ${id}
      AND (user_id = ${enc} OR user_id = ${plain})
    RETURNING id
  `) as { id: string | number }[];

  if (!deleted[0]) {
    return NextResponse.json({ error: "Todo not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
