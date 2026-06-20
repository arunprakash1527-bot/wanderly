/**
 * Initialises the SQLite database and seeds the taxonomy (Section 8).
 * Run: `npm run seed`            -> schema + taxonomy only
 *      `npm run seed -- --demo`  -> also inserts a few sample questions so you
 *                                   can try quizzes before ingesting real PYQs.
 *
 * NOTE: demo questions are clearly marked source_type='generated' with a
 * 'Sample seed' source_ref — they are NOT presented as real past questions.
 */
import { getDb } from '../src/lib/db';
import { gsWeightsSum } from '../src/lib/weights';

const db = getDb();
const cats = db.prepare('SELECT COUNT(*) AS n FROM categories').get() as { n: number };
const subs = db.prepare('SELECT COUNT(*) AS n FROM subcategories').get() as { n: number };
console.log(`Taxonomy seeded: ${cats.n} categories, ${subs.n} subcategories.`);
console.log(`GS weights sum = ${gsWeightsSum()} (must be 175).`);

if (process.argv.includes('--demo')) {
  const cat = (slug: string) =>
    (db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug) as { id: number }).id;

  const demo: Array<{
    cat: string;
    stem: string;
    a: string;
    b: string;
    c: string;
    d: string;
    correct: string;
    diff: string;
    expl: string;
  }> = [
    {
      cat: 'indian-polity',
      stem: 'Which Article of the Indian Constitution deals with the Right to Constitutional Remedies?',
      a: 'Article 19',
      b: 'Article 32',
      c: 'Article 21',
      d: 'Article 14',
      correct: 'B',
      diff: 'easy',
      expl: 'Article 32 — called the "heart and soul" of the Constitution by Dr. Ambedkar — guarantees the right to move the Supreme Court for enforcement of Fundamental Rights.',
    },
    {
      cat: 'indian-polity',
      stem: 'The Directive Principles of State Policy are contained in which Part of the Constitution?',
      a: 'Part III',
      b: 'Part IV',
      c: 'Part V',
      d: 'Part II',
      correct: 'B',
      diff: 'easy',
      expl: 'Part IV (Articles 36–51) contains the Directive Principles of State Policy, which are non-justiciable guidelines for governance.',
    },
    {
      cat: 'history-tamil-nadu',
      stem: 'The Sangam age classical Tamil literature was primarily composed in which region?',
      a: 'Gangetic plains',
      b: 'Tamilakam',
      c: 'Deccan plateau',
      d: 'Malabar coast',
      correct: 'B',
      diff: 'medium',
      expl: 'Sangam literature was produced in Tamilakam, the ancient Tamil-speaking region of South India, during three Sangam assemblies.',
    },
    {
      cat: 'indian-economy',
      stem: 'The Reserve Bank of India was established in which year?',
      a: '1935',
      b: '1947',
      c: '1949',
      d: '1950',
      correct: 'A',
      diff: 'easy',
      expl: 'The RBI was established on 1 April 1935 under the RBI Act, 1934; it was nationalised in 1949.',
    },
    {
      cat: 'general-science',
      stem: 'Which gas is most responsible for the greenhouse effect on Earth?',
      a: 'Oxygen',
      b: 'Nitrogen',
      c: 'Carbon dioxide',
      d: 'Hydrogen',
      correct: 'C',
      diff: 'easy',
      expl: 'Carbon dioxide is the principal long-lived greenhouse gas driving anthropogenic warming, though water vapour is the most abundant.',
    },
    {
      cat: 'aptitude',
      stem: 'If 15% of a number is 45, what is the number?',
      a: '300',
      b: '270',
      c: '450',
      d: '150',
      correct: 'A',
      diff: 'easy',
      expl: '15% of x = 45 → x = 45 / 0.15 = 300.',
    },
  ];

  const insert = db.prepare(
    `INSERT INTO questions
      (source_type, stem, option_a, option_b, option_c, option_d, correct_option,
       explanation, category_id, difficulty, source_ref, verification_status)
     VALUES ('generated', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Sample seed', 'verified')`
  );
  const tx = db.transaction(() => {
    for (const d of demo) {
      insert.run(d.stem, d.a, d.b, d.c, d.d, d.correct, d.expl, cat(d.cat), d.diff);
    }
  });
  tx();
  console.log(`Inserted ${demo.length} demo questions (source_ref='Sample seed').`);
}

console.log('Done.');
