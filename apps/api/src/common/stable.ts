/** JSON dengan kunci terurut — JSONB Postgres tidak mempertahankan urutan kunci. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Sama isinya, mengabaikan `version`. */
export const sameContent = (a: unknown, b: unknown) =>
  stableStringify({ ...(a as object), version: 0 }) ===
  stableStringify({ ...(b as object), version: 0 });
