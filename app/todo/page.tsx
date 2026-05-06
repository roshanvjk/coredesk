import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import TodoClient from "@/app/todo/todo-client";
import type { TodoTask } from "@/app/todo/types";
import { userIdWherePair } from "@/lib/db-user-id";

export default async function TodoPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
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

  const { enc, plain } = userIdWherePair(userId);

  const rows = (await sql`
    SELECT id, title, description, status, progress
    FROM todo_lists
    WHERE (user_id = ${enc} OR user_id = ${plain})
    ORDER BY created_at DESC
  `) as {
    id: string | number;
    title: string;
    description: string;
    status: "active" | "completed";
    progress: number;
  }[];

  const initialTasks: TodoTask[] = rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    description: row.description,
    status: row.status,
    progress: Number(row.progress),
  }));

  return (
    <TodoClient initialTasks={initialTasks} />
  );
}