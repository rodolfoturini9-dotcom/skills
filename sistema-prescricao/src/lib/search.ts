const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .trim();
}

export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalize(query);
  if (!q) return false;
  return normalize(haystack).includes(q);
}
