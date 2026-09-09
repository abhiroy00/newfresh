/**
 * Phone numbers are stored in E.164 form ("+91XXXXXXXXXX"). For display we
 * always want exactly one "+91 " prefix, regardless of whether the stored
 * value already carries the country code.
 */
export function formatPhone(phone?: string | null): string {
  const digits = (phone || '').replace(/^\+91/, '').replace(/\D/g, '').trim();
  return digits ? `+91 ${digits}` : '';
}
