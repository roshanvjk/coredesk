/**
 * Sidebar link cards — tint stacks using design tokens (works in light + `.dark`).
 * Stored on each row in DB; Tailwind must see these strings (see links-client palette sweep).
 */
export const LINK_CARD_PALETTES = [
  "border border-border bg-card text-card-foreground",
  "border border-border bg-muted/80 text-foreground",
  "border border-primary/35 bg-primary/12 text-foreground",
  "border border-accent/40 bg-accent/14 text-foreground",
  "border border-chart-2/45 bg-chart-2/12 text-foreground",
] as const;

export type LinkCardPalette = (typeof LINK_CARD_PALETTES)[number];

export function randomLinkPalette(): LinkCardPalette {
  const index = Math.floor(Math.random() * LINK_CARD_PALETTES.length);
  return LINK_CARD_PALETTES[index]!;
}
