/**
 * Product names may be bilingual, stored as one string: "English / हिन्दी".
 * Split for display: English at normal size, Hindi smaller underneath.
 */
export function splitProductName(name?: string | null): { en: string; hi: string } {
  const [en, ...rest] = (name || '').split(' / ');
  return { en: (en || '').trim(), hi: rest.join(' / ').trim() };
}
