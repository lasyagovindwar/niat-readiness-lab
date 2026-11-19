import { randomUUID } from 'node:crypto';
import { db } from '../../../lib/db.js';

const PLAN = { logical: 3, quant: 3, pattern: 2, computational: 2 }; // 10 questions
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);

export async function POST(req) {
  try {
    const { language } = await req.json();
    if (!['en', 'te', 'hi'].includes(language)) return Response.json({ error: 'Unknown language.' }, { status: 400 });
    const sb = db();
    // correct_index and explanation are deliberately NOT selected: answers stay on the server.
    const { data, error } = await sb.from('questions').select('id,section,difficulty,stem,options')
      .eq('language', language).eq('reviewed', true);
    if (error) throw error;
    const picked = [];
    for (const [section, n] of Object.entries(PLAN)) {
      picked.push(...shuffle(data.filter((q) => q.section === section)).slice(0, n));
    }
    if (picked.length < 10) {
      picked.push(...shuffle(data.filter((q) => !picked.includes(q))).slice(0, 10 - picked.length));
    }
    if (picked.length < 10) return Response.json({ error: 'Not enough reviewed questions for this language yet.' }, { status: 503 });
    const questions = shuffle(picked);
    const { data: att, error: e2 } = await sb.from('attempts')
      .insert({ session_id: randomUUID(), language, question_ids: questions.map((q) => q.id) })
      .select('id').single();
    if (e2) throw e2;
    return Response.json({ attemptId: att.id, questions });
  } catch (e) {
    console.error('start failed', e);
    return Response.json({ error: 'Could not start the test. Please try again.' }, { status: 500 });
  }
}
