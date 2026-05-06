export type SavedLink = {
  id: number;
  title: string;
  url: string;
  /** ISO date string `YYYY-MM-DD` */
  linkDate: string;
  /** Tailwind classes for sidebar card background/text */
  colorClasses: string;
};
