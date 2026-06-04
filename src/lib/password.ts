// ============================================================
// Ward — Password strength
// ============================================================
// Lightweight, dependency-free heuristic. Not a substitute for
// zxcvbn, but enough to nudge users away from weak secrets that
// would undermine the PBKDF2-protected vault.

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4; // 0 = empty, 4 = strong
  label: string;
  /** color token to render the meter with */
  tone: 'danger' | 'warning' | 'success';
}

export function scorePassword(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: '', tone: 'danger' };

  let points = 0;
  if (pw.length >= 8) points++;
  if (pw.length >= 12) points++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) points++;
  if (/\d/.test(pw)) points++;
  if (/[^A-Za-z0-9]/.test(pw)) points++;

  // Penalise obvious patterns
  if (/^(.)\1+$/.test(pw) || /^(password|12345678|qwerty)/i.test(pw)) points = 1;

  const score = Math.min(4, Math.max(1, points)) as 1 | 2 | 3 | 4;
  const meta: Record<number, Omit<PasswordStrength, 'score'>> = {
    1: { label: 'Weak', tone: 'danger' },
    2: { label: 'Fair', tone: 'warning' },
    3: { label: 'Good', tone: 'success' },
    4: { label: 'Strong', tone: 'success' },
  };
  return { score, ...meta[score] };
}
