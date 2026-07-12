const INTENT_PATTERNS = [
  { pattern: /show.*documents?/i, intent: 'SHOW_DOCUMENTS', route: '/documents' },
  { pattern: /travel|flight|trip/i, intent: 'OPEN_TRAVEL', route: '/travel' },
  { pattern: /renewal|renew|form/i, intent: 'OPEN_FORMS', route: '/forms' },
  { pattern: /bills?|payment|invoice/i, intent: 'SHOW_BILLS', route: '/bills' },
  { pattern: /grocery|shopping|household/i, intent: 'OPEN_HOUSEHOLD', route: '/household' },
  { pattern: /print/i, intent: 'PRINT_PAGE', action: 'print' },
  { pattern: /arabic|عربي/i, intent: 'CHANGE_LANG_AR', action: 'lang_ar' },
  { pattern: /english/i, intent: 'CHANGE_LANG_EN', action: 'lang_en' },
  { pattern: /permission|access/i, intent: 'OPEN_PERMISSIONS', route: '/permissions' },
  { pattern: /activity|history|log/i, intent: 'SHOW_ACTIVITY', route: '/activity' },
  { pattern: /container|vault/i, intent: 'OPEN_CONTAINER', route: '/container' },
  { pattern: /settings?|preferences?/i, intent: 'OPEN_SETTINGS', route: '/settings' },
  { pattern: /logout|sign.?out/i, intent: 'LOGOUT', action: 'logout' },
];

export function parseIntent(transcript) {
  for (const { pattern, intent, route, action } of INTENT_PATTERNS) {
    if (pattern.test(transcript)) return { intent, route, action, transcript };
  }
  return { intent: 'UNKNOWN', transcript };
}
