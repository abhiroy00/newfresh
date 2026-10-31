/**
 * Format an order's scheduled delivery (estimated_delivery_at) with its date —
 * deliveries are booked for tomorrow or later, so a bare time is ambiguous.
 * e.g. "Sat, 1 Nov · 10:00 AM"
 */
export function formatDeliveryTime(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const day = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const h = d.getHours();
  const m = d.getMinutes();
  const time = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  return `${day} · ${time}`;
}

/** When a timeline step happened, e.g. "9:02 AM · 1 Nov". */
export function formatStepTime(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const h = d.getHours();
  const time = `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  return `${time} · ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

/** Latest time each status was reached, from the order's `timeline`. */
export function stepTimes(timeline?: { status: string; timestamp?: string | null }[] | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of timeline || []) {
    if (t.timestamp) out[t.status] = t.timestamp;
  }
  return out;
}
