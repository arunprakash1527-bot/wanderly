import { getQuestionById, setExplanation } from './repo';
import { getCategories } from './repo';
import { callText, hasApiKey } from './claude';
import { explanationPrompt } from './prompts';

// On-demand explanation generation, cached in questions.explanation. Per user.
export async function ensureExplanation(
  userId: number,
  questionId: number
): Promise<string | null> {
  const q = await getQuestionById(userId, questionId);
  if (!q) return null;
  if (q.explanation && q.explanation.trim()) return q.explanation;
  if (!q.correct_option || !hasApiKey()) return q.explanation ?? null;

  const cat = (await getCategories()).find((c) => c.id === q.category_id);
  const { system, user } = explanationPrompt({
    stem: q.stem,
    options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
    correct: q.correct_option,
    categoryName: cat?.name ?? 'General Studies',
  });

  try {
    const text = await callText({ system, user, maxTokens: 512, temperature: 0.3 });
    if (text) {
      await setExplanation(questionId, text);
      return text;
    }
  } catch {
    /* leave unexplained */
  }
  return q.explanation ?? null;
}
