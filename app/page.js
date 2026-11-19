'use client';
import { useState } from 'react';

// UI strings. Telugu and Hindi should be checked by a native reader before sharing.
const T = {
  en: { start: 'Start practice', q: 'Question', next: 'Next', finish: 'Finish', score: 'Your score', correct: 'Correct answer', why: 'Explanation', again: 'Try again', loading: 'Loading…',
    note: 'Unofficial prototype built for the NxtWave Growth Hack Challenge. This is not the real NAT and does not predict your result.',
    sec: { logical: 'Logical reasoning', quant: 'Quantitative', pattern: 'Pattern recognition', computational: 'Computational thinking' } },
  te: { start: 'ప్రాక్టీస్ ప్రారంభించండి', q: 'ప్రశ్న', next: 'తదుపరి', finish: 'పూర్తి చేయండి', score: 'మీ స్కోర్', correct: 'సరైన సమాధానం', why: 'వివరణ', again: 'మళ్ళీ ప్రయత్నించండి', loading: 'లోడ్ అవుతోంది…',
    note: 'ఇది అనధికారిక ప్రోటోటైప్. ఇది అసలు NAT కాదు, మీ ఫలితాన్ని అంచనా వేయదు.',
    sec: { logical: 'తార్కిక ఆలోచన', quant: 'గణిత సామర్థ్యం', pattern: 'నమూనాల గుర్తింపు', computational: 'కంప్యూటేషనల్ ఆలోచన' } },
  hi: { start: 'अभ्यास शुरू करें', q: 'प्रश्न', next: 'अगला', finish: 'समाप्त करें', score: 'आपका स्कोर', correct: 'सही उत्तर', why: 'व्याख्या', again: 'फिर से करें', loading: 'लोड हो रहा है…',
    note: 'यह एक अनौपचारिक प्रोटोटाइप है। यह असली NAT नहीं है और आपके परिणाम का अनुमान नहीं लगाता।',
    sec: { logical: 'तार्किक सोच', quant: 'संख्यात्मक योग्यता', pattern: 'पैटर्न पहचान', computational: 'कम्प्यूटेशनल सोच' } },
};
const LANGS = [['en', 'English'], ['te', 'తెలుగు'], ['hi', 'हिन्दी']];

export default function Home() {
  const [lang, setLang] = useState('en');
  const [stage, setStage] = useState('start');
  const [att, setAtt] = useState(null);
  const [qs, setQs] = useState([]);
  const [i, setI] = useState(0);
  const [ans, setAns] = useState([]);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const t = T[lang];

  async function post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Something went wrong.');
    return j;
  }
  async function start() {
    setErr(''); setStage('loading');
    try {
      const j = await post('/api/start', { language: lang });
      setAtt(j.attemptId); setQs(j.questions); setAns(Array(j.questions.length).fill(null)); setI(0); setStage('test');
    } catch (e) { setErr(e.message); setStage('start'); }
  }
  async function finish() {
    setErr(''); setStage('loading');
    try { setRes(await post('/api/submit', { attemptId: att, answers: ans })); setStage('result'); }
    catch (e) { setErr(e.message); setStage('test'); }
  }
  const pick = (k) => setAns(ans.map((a, n) => (n === i ? k : a)));

  return (
    <main>
      <div className="banner">{t.note}</div>
      {err && <div className="card wrong">{err}</div>}
      {stage === 'start' && (
        <div className="card">
          <p>{LANGS.map(([c, n]) => (
            <button key={c} className={'opt' + (lang === c ? ' sel' : '')} style={{ display: 'inline-block', width: 'auto', marginRight: 8 }} onClick={() => setLang(c)}>{n}</button>
          ))}</p>
          <button className="primary" onClick={start}>{t.start}</button>
        </div>
      )}
      {stage === 'loading' && <div className="card">{t.loading}</div>}
      {stage === 'test' && qs[i] && (
        <div className="card">
          <div className="bar"><div style={{ width: `${((i + 1) / qs.length) * 100}%` }} /></div>
          <p className="muted">{t.q} {i + 1} / {qs.length} · {t.sec[qs[i].section]}</p>
          <p><b>{qs[i].stem}</b></p>
          {qs[i].options.map((o, k) => (
            <button key={k} className={'opt' + (ans[i] === k ? ' sel' : '')} onClick={() => pick(k)}>{o}</button>
          ))}
          {i < qs.length - 1
            ? <button className="primary" disabled={ans[i] === null} onClick={() => setI(i + 1)}>{t.next}</button>
            : <button className="primary" disabled={ans[i] === null} onClick={finish}>{t.finish}</button>}
        </div>
      )}
      {stage === 'result' && res && (
        <>
          <div className="card">
            <h2>{t.score}: {res.score} / {res.total}</h2>
            {Object.entries(res.sections).map(([s, v]) => (<p key={s} className="muted">{t.sec[s]}: {v.correct} / {v.total}</p>))}
            <button onClick={() => { setStage('start'); setRes(null); }}>{t.again}</button>
          </div>
          {res.review.map((r, n) => (
            <div key={n} className={'card ' + (r.ok ? 'right' : 'wrong')}>
              <p><b>{n + 1}. {r.stem}</b></p>
              <p className="muted">{t.correct}: {r.options[r.correct]}</p>
              <p className="muted">{t.why}: {r.explanation}</p>
            </div>
          ))}
        </>
      )}
    </main>
  );
}
