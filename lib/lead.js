// Pure helpers (no network), so they are easy to test.
export const SECTION_NAMES = {
  en: { logical: 'Logical reasoning', quant: 'Quantitative', pattern: 'Pattern recognition', computational: 'Computational thinking' },
  te: { logical: 'తార్కిక ఆలోచన', quant: 'గణిత సామర్థ్యం', pattern: 'నమూనాల గుర్తింపు', computational: 'కంప్యూటేషనల్ ఆలోచన' },
  hi: { logical: 'तार्किक सोच', quant: 'संख्यात्मक योग्यता', pattern: 'पैटर्न पहचान', computational: 'कम्प्यूटेशनल सोच' },
};
const LANG_NAME = { en: 'English', te: 'Telugu', hi: 'Hindi' };

// Indian mobile: 10 digits starting 6-9, optional +91 / 91 / 0 prefix.
export function cleanPhone(p) {
  const d = String(p ?? '').replace(/[\s\-()]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}
const nm = (s) => { const t = String(s ?? '').trim().replace(/\s+/g, ' '); return t.length >= 2 && t.length <= 80 ? t : null; };

export function validateLead(b) {
  if (!b || typeof b !== 'object') return { error: 'Invalid request.' };
  const name = nm(b.name);
  if (!name) return { error: 'Please enter a name (2 to 80 characters).' };
  if (!['under18', 'adult'].includes(b.ageBand)) return { error: 'Please choose an age group.' };
  if (b.consent !== true) return { error: 'Consent is needed to send the report.' };
  const v = {
    name, ageBand: b.ageBand, consent: true,
    consentText: String(b.consentText ?? '').slice(0, 400),
    source: String(b.source ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40) || null,
    phone: null, parentName: null, parentPhone: null,
  };
  if (b.ageBand === 'adult') {
    v.phone = cleanPhone(b.phone);
    if (!v.phone) return { error: 'Please enter a valid 10-digit mobile number.' };
  } else {
    // Under 18: we collect the parent's contact only, not the student's own number.
    v.parentName = nm(b.parentName);
    v.parentPhone = cleanPhone(b.parentPhone);
    if (!v.parentName) return { error: "Please enter the parent or guardian's name." };
    if (!v.parentPhone) return { error: "Please enter a valid 10-digit mobile number for the parent or guardian." };
  }
  return { value: v };
}

export function buildReportPrompt(lang, sections) {
  const total = Object.values(sections).reduce((s, x) => s + x.total, 0);
  const score = Object.values(sections).reduce((s, x) => s + x.correct, 0);
  return `You write a short, encouraging practice report for a student in India who just finished a free 10-question aptitude practice test.
Language: ${LANG_NAME[lang]}${lang === 'en' ? '.' : ', in its native script. Keep numbers as Western digits (0-9).'}
Data: overall ${score} of ${total}. Section results (correct/total): ${JSON.stringify(sections)}.
Rules:
- 100 to 140 words, plain text, no markdown, no emojis.
- Say which sections went well and which need more practice, with one concrete practice tip for each weaker section.
- Each section has only 2 or 3 questions, so say these are early signs, not a measurement of ability.
- Do not predict or mention any entrance exam result, admission chances, fees, rankings or institutes.
- Do not invent facts. Do not address the student by name.
Return only the report text.`;
}

export function fallbackReport(lang, sections) {
  const N = SECTION_NAMES[lang];
  const pct = (x) => x.correct / x.total;
  const entries = Object.entries(sections).filter(([, x]) => x.total > 0).sort((a, b) => pct(b[1]) - pct(a[1]));
  const best = entries[0], worst = entries[entries.length - 1];
  const score = entries.reduce((s, [, x]) => s + x.correct, 0), total = entries.reduce((s, [, x]) => s + x.total, 0);
  const T = {
    en: `You scored ${score} out of ${total}. Strongest section: ${N[best[0]]}. Practise more: ${N[worst[0]]}. Each section had only a few questions, so treat this as an early sign, not a measurement. Try the test again after revising the explanations.`,
    te: `మీరు ${total} లో ${score} స్కోర్ చేశారు. బలమైన విభాగం: ${N[best[0]]}. ఎక్కువ ప్రాక్టీస్ అవసరం: ${N[worst[0]]}. ప్రతి విభాగంలో కొన్ని ప్రశ్నలే ఉన్నాయి, కాబట్టి ఇది ప్రాథమిక సూచన మాత్రమే. వివరణలు చదివి మళ్ళీ ప్రయత్నించండి.`,
    hi: `आपने ${total} में से ${score} अंक पाए। सबसे मजबूत सेक्शन: ${N[best[0]]}। अधिक अभ्यास चाहिए: ${N[worst[0]]}। हर सेक्शन में कुछ ही प्रश्न थे, इसलिए यह शुरुआती संकेत है, माप नहीं। व्याख्याएँ पढ़कर फिर प्रयास करें।`,
  };
  return T[lang];
}

export function followUpText(lang, name, score, total, report) {
  const first = String(name).split(' ')[0];
  const T = {
    en: `Hi ${first}! Your practice score: ${score}/${total}.\n\n${report}\n\nThis is unofficial practice, not a NAT result.`,
    te: `నమస్తే ${first}! మీ ప్రాక్టీస్ స్కోర్: ${score}/${total}.\n\n${report}\n\nఇది అనధికారిక ప్రాక్టీస్, NAT ఫలితం కాదు.`,
    hi: `नमस्ते ${first}! आपका अभ्यास स्कोर: ${score}/${total}।\n\n${report}\n\nयह अनौपचारिक अभ्यास है, NAT परिणाम नहीं।`,
  };
  return T[lang] ?? T.en;
}
