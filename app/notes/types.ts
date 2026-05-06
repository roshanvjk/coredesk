export type Note = {
  id: number;
  title: string;
  /** Multiple lines stored as one string (newline-separated). */
  lines: string;
};
