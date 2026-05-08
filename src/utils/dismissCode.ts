// ─── Heavy Sleeper dismiss code generator ────────────────────────────────────
// Produces a random 20-character string drawn from upper- and lower-case
// letters, digits, and a curated set of symbols. Cryptographic strength is not
// required — the goal is to force a sleepy user to read and type carefully.

const CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
  'abcdefghijklmnopqrstuvwxyz' +
  '0123456789' +
  '!@#$%^&*?+=-';

export const DISMISS_CODE_LENGTH = 20;

export function generateDismissCode(length: number = DISMISS_CODE_LENGTH): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return out;
}
