import { getSession, getSessionQuestions } from './repo';
import { MARK_PER_CORRECT } from './weights';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Export (Section 10.7): CSV (per-attempt + summary) and a PDF result report.

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function buildSessionCsv(
  userId: number,
  sessionId: number
): Promise<string | null> {
  const session = await getSession(userId, sessionId);
  if (!session) return null;
  const rows = await getSessionQuestions(sessionId);

  const header = [
    'session_id',
    'session_date',
    'mode',
    'question_no',
    'category',
    'subcategory',
    'difficulty',
    'source_type',
    'chosen',
    'correct',
    'is_correct',
    'time_spent_seconds',
    'stem',
  ];
  const lines = [header.join(',')];
  rows.forEach((r, i) => {
    lines.push(
      [
        session.id,
        session.started_at,
        session.mode,
        i + 1,
        r.category_name,
        r.subcategory_name ?? '',
        r.difficulty,
        r.source_type,
        r.chosen_option ?? '',
        r.correct_option ?? '',
        r.attempt_is_correct == null ? '' : r.attempt_is_correct,
        r.time_spent_seconds ?? '',
        r.stem,
      ]
        .map(csvEscape)
        .join(',')
    );
  });

  // Trailing summary section.
  const correct = rows.filter((r) => r.attempt_is_correct === 1).length;
  const skipped = rows.filter((r) => r.chosen_option == null).length;
  lines.push('');
  lines.push('SUMMARY');
  lines.push(['total_questions', rows.length].join(','));
  lines.push(['correct', correct].join(','));
  lines.push(['incorrect', rows.length - correct - skipped].join(','));
  lines.push(['skipped', skipped].join(','));
  lines.push(['score_marks', (correct * MARK_PER_CORRECT).toFixed(1)].join(','));
  lines.push(['accuracy_percent', rows.length ? Math.round((correct / rows.length) * 100) : 0].join(','));

  return lines.join('\n');
}

export async function buildSessionPdf(
  userId: number,
  sessionId: number
): Promise<Uint8Array | null> {
  const session = await getSession(userId, sessionId);
  if (!session) return null;
  const rows = await getSessionQuestions(sessionId);
  const correct = rows.filter((r) => r.attempt_is_correct === 1).length;
  const skipped = rows.filter((r) => r.chosen_option == null).length;
  const accuracy = rows.length ? Math.round((correct / rows.length) * 100) : 0;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const pageW = 595.28;
  const pageH = 841.89;
  const maxW = pageW - margin * 2;
  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - margin;

  const ink = rgb(0.12, 0.16, 0.2);
  const faint = rgb(0.5, 0.55, 0.6);
  const green = rgb(0.09, 0.55, 0.24);
  const red = rgb(0.8, 0.13, 0.13);

  function ensure(space: number) {
    if (y - space < margin) {
      page = pdf.addPage([pageW, pageH]);
      y = pageH - margin;
    }
  }

  function wrap(text: string, f = font, size = 10): string[] {
    const words = text.replace(/\s+/g, ' ').split(' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (f.widthOfTextAtSize(test, size) > maxW && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function draw(text: string, opts: { f?: typeof font; size?: number; color?: typeof ink; gap?: number; x?: number } = {}) {
    const f = opts.f || font;
    const size = opts.size || 10;
    for (const ln of wrap(text, f, size)) {
      ensure(size + 4);
      page.drawText(ln, { x: opts.x ?? margin, y, size, font: f, color: opts.color || ink });
      y -= size + (opts.gap ?? 4);
    }
  }

  // Header
  draw('TNPSC Group 1 Prelims — Result Report', { f: bold, size: 16, gap: 6 });
  draw(`Session #${session.id} · ${session.mode.toUpperCase()} · ${session.started_at}`, {
    color: faint,
    gap: 10,
  });
  draw(
    `Score: ${(correct * MARK_PER_CORRECT).toFixed(1)} marks   |   Accuracy: ${accuracy}%   |   Correct ${correct} · Wrong ${rows.length - correct - skipped} · Skipped ${skipped}`,
    { f: bold, size: 11, gap: 14 }
  );

  rows.forEach((r, i) => {
    ensure(60);
    draw(`Q${i + 1}. ${r.stem}`, { f: bold, size: 10, gap: 3 });
    (['A', 'B', 'C', 'D'] as const).forEach((opt) => {
      const txt = (r as any)[`option_${opt.toLowerCase()}`] as string;
      const isCorrect = r.correct_option === opt;
      const isChosen = r.chosen_option === opt;
      const prefix = `${opt}. `;
      const marker = isCorrect ? '  (correct)' : isChosen ? '  (your answer)' : '';
      draw(prefix + txt + marker, {
        x: margin + 12,
        color: isCorrect ? green : isChosen ? red : ink,
        size: 9,
        gap: 2,
      });
    });
    if (r.explanation) {
      draw('Explanation: ' + r.explanation, { x: margin + 12, color: faint, size: 9, gap: 2 });
    }
    // Source line: a real citation for PYQs; an AI-suggested reference (flagged)
    // for generated questions, matching the on-screen review.
    if (r.source_type === 'pyq') {
      draw('Source: ' + (r.source_ref || 'Previous-year question'), {
        x: margin + 12,
        color: faint,
        size: 9,
        gap: 2,
      });
    } else {
      const ref = r.source_ref || `AI-generated · ${r.category_name}`;
      draw('Reference: ' + ref + ' (AI-suggested — verify)', {
        x: margin + 12,
        color: faint,
        size: 9,
        gap: 2,
      });
    }
    y -= 8;
  });

  return pdf.save();
}
