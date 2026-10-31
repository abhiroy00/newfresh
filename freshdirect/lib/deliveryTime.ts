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
