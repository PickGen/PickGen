/**
 * Lightweight blocklist content filter (FR-8.4).
 * A production build should defer to the AI provider's moderation, but this
 * catches obvious disallowed requests before spending a credit or a call.
 */
const BLOCKED_PATTERNS: RegExp[] = [
  /\bchild\s*(porn|sexual)/i,
  /\bcsam\b/i,
  /\bunderage\b.*\b(nude|sex)/i,
  /\bnon[-\s]?consensual\b/i,
];

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

export function moderatePrompt(prompt: string): ModerationResult {
  for (const re of BLOCKED_PATTERNS) {
    if (re.test(prompt)) {
      return { allowed: false, reason: 'Запрос нарушает правила допустимого контента' };
    }
  }
  return { allowed: true };
}
