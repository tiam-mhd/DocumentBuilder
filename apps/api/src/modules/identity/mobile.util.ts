/**
 * Normalize Iranian mobile numbers to E.164 (+98…).
 * Accepts 09xxxxxxxxx, 9xxxxxxxxx, +989xxxxxxxxx, 00989xxxxxxxxx.
 */
export function normalizeMobile(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, '').replace(/^\+/, '');
  let national = digits;

  if (national.startsWith('0098')) {
    national = national.slice(4);
  } else if (national.startsWith('98')) {
    national = national.slice(2);
  }

  if (national.startsWith('0')) {
    national = national.slice(1);
  }

  if (!/^9\d{9}$/.test(national)) {
    return null;
  }

  return `+98${national}`;
}
