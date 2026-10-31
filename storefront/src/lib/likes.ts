/**
 * Displayed like figure: starts at 1k and grows by 0.1k per real like
 * (0 → "1k", 1 → "1.1k", 2 → "1.2k", 10 → "2k" …). The backend returns the
 * real count (`like_count`); only this display is scaled. Same as the app.
 */
export function formatLikes(realCount: number): string {
  const k = (1000 + 100 * Math.max(0, realCount || 0)) / 1000
  return `${k.toFixed(1).replace(/\.0$/, '')}k`
}
