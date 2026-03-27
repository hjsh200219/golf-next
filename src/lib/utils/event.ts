const RAW_CODE_PATTERN = /^[A-Z]\d{4}[,A-Z]*$/;
const GARBAGE_PATTERNS = [/^,+$/, /^[,A-Z]+$/];

export function cleanEventText(event: string | null): string | null {
  if (!event) return null;
  const trimmed = event.trim();
  if (!trimmed) return null;
  if (RAW_CODE_PATTERN.test(trimmed)) return null;
  for (const pattern of GARBAGE_PATTERNS) {
    if (pattern.test(trimmed)) return null;
  }
  const cleaned = trimmed.replace(/^,+|,+$/g, '').replace(/,,+/g, ', ').trim();
  if (!cleaned || cleaned === ',') return null;
  return cleaned;
}
