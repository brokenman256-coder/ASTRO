// Simple deterministic string hash (FNV-1a-ish) - used wherever we need a
// stable, reproducible pseudo-random number from an input (e.g. a Kundli
// match score for the same two birth dates, or a daily luck score for the
// same user+date), without storing anything extra.
export function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}
