export type TodoTask = {
  id: number;
  title: string;
  description: string;
  status: "active" | "completed";
  progress: number;
};
