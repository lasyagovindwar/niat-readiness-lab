// Question-bank tool (needs Node 20.6+).
//   node --env-file=.env scripts/questions.mjs generate en     (or te, hi) - only fills what is missing
//   node --env-file=.env scripts/questions.mjs generate en computational   (one section only)
//   node --env-file=.env scripts/questions.mjs upload          (reviewed questions only)
//   node --env-file=.env scripts/questions.mjs upload --all    (include unreviewed)
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const LANGS = {
  en: { name: 'English', script: /[A-Za-z]/ },
  te: { name: 'Telugu', script: /[\u0C00-\u0C7F]/ },
  hi: { name: 'Hindi', script: /[\u0900-\u097F]/ },
};
const SECTIONS = {
  logical: 'logical reasoning (series, syllogisms, seating arrangements, direction sense, coding-decoding)',
  quant: 'quantitative aptitude (arithmetic, percentages, ratio, simple algebra, simple data interpretation in words)',
  pattern: 'pattern recognition (number and letter patterns, odd one out, analogies)',
  computational: 'computational thinking (step-by-step procedures, simple loops and conditions described in words, no programming syntax)',
};
const PER_BATCH = 5, BATCHES = 3; // 15 per section, 60 per language
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DELAY = Number(process.env.GEN_DELAY_MS ?? 8000);
const RETRY = Number(process.env.RETRY_BASE_MS ?? 5000);

export function validate(q, lang) {
  if (!q || typeof q !== 'object') return 'not an object';
  const { stem, options, correct_index: ci, explanation } = q;
  if (typeof stem !== 'string' || stem.length < 10 || stem.length > 600) return 'bad stem';
  if (!Array.isArray(options) || options.length !== 4) return 'need 4 options';
  if (options.some((o) => typeof o !== 'string' || !o.trim())) return 'empty option';
  if (new Set(options.map((o) => o.trim())).size !== 4) return 'duplicate options';
  if (!Number.isInteger(ci) || ci < 0 || ci > 3) return 'bad correct_index';
  if (typeof explanation !== 'string' || explanation.length < 10) return 'bad explanation';
  if (/\b(NIAT|NAT|NxtWave)\b/i.test(stem + explanation)) return 'mentions NIAT/NAT';
  if (lang !== 'en' && !(LANGS[lang].script.test(stem) && LANGS[lang].script.test(explanation))) return 'wrong language/script';
  return null;
}

function buildPrompt(lang, section, avoid) {
  const { name } = LANGS[lang];
  return `You write multiple-choice aptitude practice questions for students in India who have finished or are about to finish Class 12.
Topic: ${SECTIONS[section]}.
Language: write the question, options and explanation in ${name}${lang === 'en' ? '.' : ' using its native script. Keep numbers as Western digits (0-9).'}
Write exactly ${PER_BATCH} questions. Rules:
- Exactly 4 options and exactly one unambiguously correct option.
- Mixed difficulty: 1 (easy), 2 (medium) or 3 (hard).
- No knowledge beyond Class 10 maths, no trivia, no mention of any institute, exam or brand, culturally neutral names and settings.
- The explanation shows the working briefly and says why the correct option is right.
- Double-check every answer before including it.
${avoid.length ? 'Do not repeat or closely resemble these questions: ' + JSON.stringify(avoid.slice(-10)) : ''}
Return ONLY a JSON array of objects with keys: "stem", "options" (array of 4 strings), "correct_index" (0-3), "explanation", "difficulty".`;
}

async function callGemini(prompt) {
  const { GEMINI_API_KEY: key, GEMINI_MODEL: model } = process.env;
  if (!key || !model) throw new Error('Set GEMINI_API_KEY and GEMINI_MODEL in .env');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  for (let i = 0; i < 5; i++) {
    let r;
    try {
      r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
        }),
      });
    } catch { await sleep(RETRY * 2 ** i); continue; } // network blip: wait and retry
    if (r.ok) {
      const j = await r.json();
      return (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
    }
    if (r.status === 429 || r.status >= 500) { await sleep(RETRY * 2 ** i); continue; }
    throw new Error(`Gemini error ${r.status}: ${(await r.text()).slice(0, 200)}`);
  }
  throw new Error('Gemini kept failing (rate limit?). Wait a few minutes and rerun.');
}

export async function generate(lang, only) {
  if (!LANGS[lang]) throw new Error('Language must be en, te or hi');
  if (only && !SECTIONS[only]) throw new Error(`Section must be one of: ${Object.keys(SECTIONS).join(', ')}`);
  const file = `data/questions.${lang}.json`;
  let all = [];
  try { all = JSON.parse(await readFile(file, 'utf8')); } catch { /* first run */ }
  await mkdir('data', { recursive: true });
  const TARGET = PER_BATCH * BATCHES;
  for (const section of only ? [only] : Object.keys(SECTIONS)) {
    const stems = all.filter((q) => q.section === section).map((q) => q.stem);
    const need = Math.ceil((TARGET - stems.length) / PER_BATCH);
    if (need <= 0) { console.log(`${lang} ${section}: already has ${stems.length}, skipping`); continue; }
    for (let b = 0; b < need; b++) {
      let items = [];
      try {
        const raw = (await callGemini(buildPrompt(lang, section, stems))).replace(/^```json|```$/g, '').trim();
        items = JSON.parse(raw);
      } catch (e) { console.warn(`  ${section} batch ${b + 1}: skipped (${e.message})`); }
      for (const q of Array.isArray(items) ? items : []) {
        const err = validate(q, lang);
        if (err || stems.includes(q.stem)) { console.warn(`  rejected: ${err ?? 'duplicate'}`); continue; }
        stems.push(q.stem);
        all.push({ language: lang, section, difficulty: [1, 2, 3].includes(q.difficulty) ? q.difficulty : 2,
          stem: q.stem, options: q.options, correct_index: q.correct_index, explanation: q.explanation, reviewed: false });
      }
      await writeFile(file, JSON.stringify(all, null, 2)); // save after every batch
      console.log(`${lang} ${section} batch ${b + 1}/${need}: ${stems.length} in this section, ${all.length} total`);
      await sleep(DELAY); // stay well under free-tier rate limits
    }
  }
  console.log(`Saved ${file} (${all.length} questions). Review it, set "reviewed": true on good questions, then upload.`);
}

const COLS = ['language', 'section', 'difficulty', 'stem', 'options', 'correct_index', 'explanation', 'reviewed'];

export async function upload(all) {
  const { SUPABASE_URL: base, SUPABASE_SECRET_KEY: key } = process.env;
  if (!base || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env');
  const headers = { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`; // legacy JWT keys only
  const files = (await readdir('data')).filter((f) => /^questions\.(en|te|hi)\.json$/.test(f));
  let sent = 0;
  for (const f of files) {
    const path = `data/${f}`;
    const rows = JSON.parse(await readFile(path, 'utf8'));
    const todo = rows.filter((q) => !q.uploaded && (all || q.reviewed) && !validate(q, q.language));
    try {
      for (let i = 0; i < todo.length; i += 50) {
        const chunk = todo.slice(i, i + 50);
        const body = chunk.map((q) => Object.fromEntries(COLS.map((c) => [c, q[c]])));
        const r = await fetch(`${base}/rest/v1/questions`, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(`Upload failed ${r.status}: ${(await r.text()).slice(0, 300)}`);
        chunk.forEach((q) => { q.uploaded = true; }); // never upload the same question twice
        sent += chunk.length;
      }
    } finally { await writeFile(path, JSON.stringify(rows, null, 2)); }
  }
  console.log(`Uploaded ${sent} new questions.`);
}

async function main() {
  const [, , cmd, arg, arg2] = process.argv;
  if (cmd === 'generate') await generate(arg, arg2);
  else if (cmd === 'upload') await upload(arg === '--all');
  else console.log('Usage: generate <en|te|hi> [section] | upload [--all]');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
