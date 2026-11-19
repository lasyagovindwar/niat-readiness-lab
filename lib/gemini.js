// Returns report text, or throws. Two quick tries so the request stays within serverless time limits.
export async function geminiText(prompt) {
  const { GEMINI_API_KEY: key, GEMINI_MODEL: model } = process.env;
  if (!key || !model) throw new Error('Missing GEMINI_API_KEY or GEMINI_MODEL');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let last;
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5 } }),
        signal: AbortSignal.timeout(12000),
      });
      if (r.ok) {
        const j = await r.json();
        const text = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
        if (text.length >= 40) return text.slice(0, 1500);
        last = new Error('Gemini returned an empty or too-short report');
      } else last = new Error(`Gemini ${r.status}`);
    } catch (e) { last = e; }
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw last;
}
