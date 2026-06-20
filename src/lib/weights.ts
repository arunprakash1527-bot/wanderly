// Full-mock composition (Section 4 + 10.2).
// Prelims = 200 MCQs = 175 General Studies + 25 Aptitude.
// GS weights are an editable config constant: tweak these to match the
// weightage you observe in real papers. The numbers below must sum to 175.

export const MOCK_TOTAL = 200;
export const GS_TOTAL = 175;
export const APTITUDE_TOTAL = 25;
export const MARK_PER_CORRECT = 1.5;
export const MOCK_DURATION_SECONDS = 3 * 60 * 60; // 3 hours

// Approximate GS weightage across the nine GS categories (by slug).
export const GS_WEIGHTS: Record<string, number> = {
  'general-science': 25,
  'current-events': 25,
  geography: 18,
  'history-india': 15,
  'history-tamil-nadu': 18,
  'indian-national-movement': 15,
  'indian-polity': 22,
  'indian-economy': 20,
  'tamil-nadu-governance': 17,
};

// Sanity guard used by tests/seed; keeps the config honest.
export function gsWeightsSum(): number {
  return Object.values(GS_WEIGHTS).reduce((a, b) => a + b, 0);
}
