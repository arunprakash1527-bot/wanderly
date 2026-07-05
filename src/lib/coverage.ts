import { all } from './db';

// Coverage & mastery (spec §5). Coverage = fraction of concepts ever tested;
// mastery = of tested concepts, fraction whose latest attempt was correct.

export interface CoverageCell {
  subcategory_id: number;
  subcategory: string;
  subcategory_slug: string;
  category_id: number;
  category: string;
  category_slug: string;
  total: number;
  tested: number;
  correct: number; // tested concepts whose latest attempt was correct
  weight: number; // blueprint weight
}

export interface CoverageReport {
  cells: CoverageCell[];
  headline: {
    totalConcepts: number;
    coveragePct: number;
    masteryPct: number;
    neverTested: number;
    wrongDue: number;
  };
  suggested: {
    subcategory_id: number;
    subcategory: string;
    subcategory_slug: string;
    category: string;
    category_slug: string;
    coverage: number;
  }[];
}

export async function coverageReport(userId: number): Promise<CoverageReport> {
  // Per-subcategory totals + blueprint weight.
  const subs = await all<{
    subcategory_id: number;
    subcategory: string;
    subcategory_slug: string;
    category_id: number;
    category: string;
    category_slug: string;
    total: number;
    weight: number;
  }>(
    `SELECT sc.id AS subcategory_id, sc.name AS subcategory, sc.slug AS subcategory_slug,
            c.id AS category_id, c.name AS category, c.slug AS category_slug,
            (SELECT COUNT(*) FROM concepts co WHERE co.subcategory_id = sc.id) AS total,
            COALESCE(b.weight, 0) AS weight
     FROM subcategories sc JOIN categories c ON c.id = sc.category_id
     LEFT JOIN blueprint_weights b ON b.subcategory_id = sc.id
     ORDER BY c.id, sc.id`
  );

  // Latest attempt per concept for this user (rows are pre-ordered newest-first).
  const rows = await all<{ concept_id: number; subcategory_id: number; is_correct: number | null }>(
    `SELECT a.concept_id AS concept_id, co.subcategory_id AS subcategory_id, a.is_correct AS is_correct
     FROM attempts a
     JOIN quiz_sessions s ON s.id = a.session_id
     JOIN concepts co ON co.id = a.concept_id
     WHERE s.user_id = ? AND a.concept_id IS NOT NULL
     ORDER BY a.concept_id, a.id DESC`,
    [userId]
  );
  const latestByConcept = new Map<number, { subcategory_id: number; correct: boolean }>();
  for (const r of rows) {
    if (!latestByConcept.has(r.concept_id)) {
      latestByConcept.set(r.concept_id, {
        subcategory_id: r.subcategory_id,
        correct: r.is_correct === 1,
      });
    }
  }
  const testedBySub = new Map<number, { tested: number; correct: number }>();
  for (const { subcategory_id, correct } of latestByConcept.values()) {
    const cur = testedBySub.get(subcategory_id) || { tested: 0, correct: 0 };
    cur.tested++;
    if (correct) cur.correct++;
    testedBySub.set(subcategory_id, cur);
  }

  const cells: CoverageCell[] = subs.map((s) => {
    const t = testedBySub.get(s.subcategory_id) || { tested: 0, correct: 0 };
    return {
      subcategory_id: s.subcategory_id,
      subcategory: s.subcategory,
      subcategory_slug: s.subcategory_slug,
      category_id: s.category_id,
      category: s.category,
      category_slug: s.category_slug,
      total: Number(s.total),
      tested: t.tested,
      correct: t.correct,
      weight: Number(s.weight),
    };
  });

  const totalConcepts = cells.reduce((a, c) => a + c.total, 0);
  const totalTested = cells.reduce((a, c) => a + c.tested, 0);
  const totalCorrect = cells.reduce((a, c) => a + c.correct, 0);
  const wrongDue = totalTested - totalCorrect;

  // Suggested next: low coverage × high blueprint weight (only where there are concepts).
  const suggested = cells
    .filter((c) => c.total > 0)
    .map((c) => ({
      subcategory_id: c.subcategory_id,
      subcategory: c.subcategory,
      subcategory_slug: c.subcategory_slug,
      category: c.category,
      category_slug: c.category_slug,
      coverage: c.total ? c.tested / c.total : 0,
      score: (1 - (c.total ? c.tested / c.total : 0)) * Math.max(c.weight, 0.003),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ subcategory_id, subcategory, subcategory_slug, category, category_slug, coverage }) => ({
      subcategory_id,
      subcategory,
      subcategory_slug,
      category,
      category_slug,
      coverage,
    }));

  return {
    cells,
    headline: {
      totalConcepts,
      coveragePct: totalConcepts ? Math.round((totalTested / totalConcepts) * 100) : 0,
      masteryPct: totalTested ? Math.round((totalCorrect / totalTested) * 100) : 0,
      neverTested: totalConcepts - totalTested,
      wrongDue,
    },
    suggested,
  };
}
