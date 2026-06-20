import { getQuestionById, setExplanation } from './repo';
import { getCategories } from './repo';
import { callText, hasApiKey } from './claude';
import { explanationPrompt } from './prompts';

// Explanation generator (Section 9 Step 5 / 10.4). Generated on demand and
// cached in questions.explanation. Returns the (possibly cached) explanation.

export async function ensureExplanation(questionId: number): Promise<string | null> {
  const q = getQuestionById(questionId);
  if (!q) return null;
  if (q.explanation && q.explanation.trim()) return q.explanation;
  if (!q.correct_option || !hasApiKey()) return q.explanation ?? null;

  const cat = getCategories().find((c) => c.id === q.category_id);
  const { system, user } = explanationPrompt({
    stem: q.stem,
    options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
    correct: q.correct_option,
    categoryName: cat?.name ?? 'General Studies',
  });

  try {
    const text = await callText({ system, user, maxTokens: 512, temperature: 0.3 });
    if (text) {
      setExplanation(questionId, text);
      return text;
    }
  } catch {
    /* leave unexplained; caller handles null */
  }
  return q.explanation ?? null;
}
