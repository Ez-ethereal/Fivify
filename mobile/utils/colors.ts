/**
 * Color utility for semantic syntax highlighting.
 *
 * Maps color_id strings from the backend (e.g., "var_blue", "group_green")
 * to actual hex colors for rendering in the formula and legend.
 */

// WCAG AA compliant palette — distinct enough for adjacent highlighting
const PALETTE: Record<string, string> = {
  // Micro view: individual token colors
  var_blue: "#2563EB",
  var_green: "#16A34A",
  var_purple: "#9333EA",
  var_cyan: "#0891B2",
  const_red: "#DC2626",
  const_orange: "#EA580C",
  const_yellow: "#CA8A04",

  // Macro view: semantic group colors
  group_green: "#16A34A",
  group_blue: "#2563EB",
  group_purple: "#9333EA",
  group_orange: "#EA580C",
};

/**
 * Look up the hex color for a given color_id from the backend.
 * Falls back to gray if the id is unknown.
 */
export function resolveColor(colorId: string): string {
  return PALETTE[colorId] ?? "#6B7280";
}

// Fixed pool used by assignColors — ordered so neighbors are perceptually distinct
const ASSIGN_POOL = [
  "#2563EB", // blue
  "#EA580C", // orange
  "#16A34A", // green
  "#9333EA", // purple
  "#0891B2", // cyan
  "#DC2626", // red
  "#CA8A04", // yellow
];

/**
 * Return `count` hex colors where adjacent entries are always visually distinct.
 * Uses a greedy skip approach: cycle through the pool but never reuse the
 * previous color, guaranteeing neighbors differ even when count > pool size.
 */
export function assignColors(count: number): string[] {
  if (count <= 0) return [];
  const result: string[] = [ASSIGN_POOL[0]];
  let poolIdx = 0;
  for (let i = 1; i < count; i++) {
    poolIdx = (poolIdx + 1) % ASSIGN_POOL.length;
    // If we wrapped and landed on the same as previous, skip one more
    if (ASSIGN_POOL[poolIdx] === result[i - 1]) {
      poolIdx = (poolIdx + 1) % ASSIGN_POOL.length;
    }
    result.push(ASSIGN_POOL[poolIdx]);
  }
  return result;
}
