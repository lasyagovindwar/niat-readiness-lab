import { db } from '../../../lib/db.js';

export async function POST(req) {
  try {
    const { attemptId, answers } = await req.json();
    const sb = db();
    const { data: att } = await sb.from('attempts').select('id,question_ids,finished_at').eq('id', attemptId).maybeSingle();
    if (!att) return Response.json({ error: 'Test not found.' }, { status: 404 });
    if (att.finished_at) return Response.json({ error: 'This test was already submitted.' }, { status: 409 });
    const ids = att.question_ids;
    const valid = Array.isArray(answers) && answers.length === ids.length &&
      answers.every((a) => a === null || (Number.isInteger(a) && a >= 0 && a <= 3));
    if (!valid) return Response.json({ error: 'Invalid answers.' }, { status: 400 });

    const { data: qs, error } = await sb.from('questions')
      .select('id,section,stem,options,correct_index,explanation').in('id', ids);
    if (error) throw error;
    const byId = new Map(qs.map((q) => [q.id, q]));
    let score = 0;
    const sections = {};
    const review = ids.map((id, i) => {
      const q = byId.get(id);
      const ok = answers[i] === q.correct_index;
      sections[q.section] ??= { correct: 0, total: 0 };
      sections[q.section].total += 1;
      if (ok) { sections[q.section].correct += 1; score += 1; }
      return { stem: q.stem, options: q.options, chosen: answers[i], correct: q.correct_index, explanation: q.explanation, ok };
    });
    const { error: e2 } = await sb.from('attempts')
      .update({ answers, score, section_scores: sections, finished_at: new Date().toISOString() }).eq('id', attemptId);
    if (e2) throw e2;
    return Response.json({ score, total: ids.length, sections, review });
  } catch (e) {
    console.error('submit failed', e);
    return Response.json({ error: 'Could not score the test. Please try again.' }, { status: 500 });
  }
}
