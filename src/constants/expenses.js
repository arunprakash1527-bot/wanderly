// ─── Expense Categories ───
export const EXPENSE_CATEGORIES = [
  { key: 'food', label: 'Food & Drink', icon: '🍽️', color: '#D85A30' },
  { key: 'travel', label: 'Travel', icon: '🚗', color: '#2E7CC9' },
  { key: 'charging', label: 'Charging', icon: '⚡', color: '#1B8F6A' },
  { key: 'entertainment', label: 'Entertainment', icon: '🎭', color: '#7B6FD6' },
  { key: 'accommodation', label: 'Accommodation', icon: '🏨', color: '#B87215' },
  { key: 'activities', label: 'Activities', icon: '🎯', color: '#CF4D78' },
  { key: 'other', label: 'Other', icon: '📦', color: '#6B7280' },
];

export const getCatInfo = (key) => EXPENSE_CATEGORIES.find(c => c.key === key) || EXPENSE_CATEGORIES[6];
