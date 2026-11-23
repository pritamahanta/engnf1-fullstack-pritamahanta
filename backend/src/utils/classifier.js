const CATEGORY_RULES = [
  ["BILLING", ["refund", "invoice", "charge", "payment"]],
  ["LOGIN", ["password", "2fa", "sign in", "locked out", "login"]],
  ["DELIVERY", ["package", "arrived", "shipping", "tracking", "delivery"]],
  ["BUG", ["crash", "error", "500", "exception", "broken"]],
];

const PRIORITY_RULES = [
  ["URGENT", ["urgent", "production down", "locked out"]],
  ["HIGH", ["error", "refund", "not arrived"]],
];

function firstMatch(rules, text, fallback) {
  for (const [label, keywords] of rules) {
    if (keywords.some((k) => text.includes(k))) {
      return label;
    }
  }
  return fallback;
}

export function classifyTicket(subject, body) {
  const text = `${subject} ${body}`.toLowerCase();
  return {
    category: firstMatch(CATEGORY_RULES, text, "FEATURE_REQUEST"),
    priority: firstMatch(PRIORITY_RULES, text, "MEDIUM"),
  };
}