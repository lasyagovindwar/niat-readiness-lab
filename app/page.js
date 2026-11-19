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

// Lead-form strings. Telugu and Hindi are my translations: have a native reader check them.
const L = {
  en: { unlockTitle: 'Get your free practice report', unlockSub: 'A short report on your strengths and what to practise, written for your score.',
    name: 'Your name', phone: 'Mobile number (10 digits)', under18: 'Under 18', adult: '18 or older', ageQ: 'Your age group',
    parentName: 'Parent or guardian name', parentPhone: 'Parent or guardian mobile number',
    consentAdult: 'I agree to share these details for my practice report and follow-up.',
    consentMinor: 'My parent or guardian has agreed to share these details for my report and follow-up.',
    privacy: 'We use these details only for your report and follow-up about this practice test.',
    submit: 'Get my report', sending: 'Preparing your report…', reportTitle: 'Your practice report', openTg: 'Get this report on Telegram',
    after: 'Unofficial practice only. It does not predict a NAT result.' },
  te: { unlockTitle: 'మీ ఉచిత ప్రాక్టీస్ రిపోర్ట్ పొందండి', unlockSub: 'మీ స్కోర్ ఆధారంగా బలాలు, ప్రాక్టీస్ చేయాల్సిన అంశాలతో చిన్న రిపోర్ట్.',
    name: 'మీ పేరు', phone: 'మొబైల్ నంబర్ (10 అంకెలు)', under18: '18 ఏళ్ల లోపు', adult: '18 లేదా అంతకంటే ఎక్కువ', ageQ: 'మీ వయస్సు వర్గం',
    parentName: 'తల్లిదండ్రులు/సంరక్షకుల పేరు', parentPhone: 'తల్లిదండ్రులు/సంరక్షకుల మొబైల్ నంబర్',
    consentAdult: 'నా ప్రాక్టీస్ రిపోర్ట్ మరియు ఫాలో-అప్ కోసం ఈ వివరాలను పంచుకోవడానికి అంగీకరిస్తున్నాను.',
    consentMinor: 'నా రిపోర్ట్ మరియు ఫాలో-అప్ కోసం ఈ వివరాలను పంచుకోవడానికి నా తల్లిదండ్రులు/సంరక్షకులు అంగీకరించారు.',
    privacy: 'ఈ వివరాలను మీ రిపోర్ట్ మరియు ఈ ప్రాక్టీస్ టెస్ట్ ఫాలో-అప్ కోసం మాత్రమే ఉపయోగిస్తాము.',
    submit: 'నా రిపోర్ట్ పొందండి', sending: 'రిపోర్ట్ తయారవుతోంది…', reportTitle: 'మీ ప్రాక్టీస్ రిపోర్ట్', openTg: 'ఈ రిపోర్ట్‌ను టెలిగ్రామ్‌లో పొందండి',
    after: 'ఇది అనధికారిక ప్రాక్టీస్ మాత్రమే. NAT ఫలితాన్ని అంచనా వేయదు.' },
  hi: { unlockTitle: 'अपनी मुफ़्त प्रैक्टिस रिपोर्ट पाएँ', unlockSub: 'आपके स्कोर के आधार पर ताकत और अभ्यास के सुझावों वाली छोटी रिपोर्ट।',
    name: 'आपका नाम', phone: 'मोबाइल नंबर (10 अंक)', under18: '18 वर्ष से कम', adult: '18 वर्ष या अधिक', ageQ: 'आपकी आयु वर्ग',
    parentName: 'माता-पिता/अभिभावक का नाम', parentPhone: 'माता-पिता/अभिभावक का मोबाइल नंबर',
    consentAdult: 'मैं अपनी प्रैक्टिस रिपोर्ट और फॉलो-अप के लिए ये विवरण साझा करने के लिए सहमत हूँ।',
    consentMinor: 'मेरी रिपोर्ट और फॉलो-अप के लिए ये विवरण साझा करने के लिए मेरे माता-पिता/अभिभावक सहमत हैं।',
    privacy: 'हम इन विवरणों का उपयोग केवल आपकी रिपोर्ट और इस प्रैक्टिस टेस्ट के फॉलो-अप के लिए करते हैं।',
    submit: 'मेरी रिपोर्ट पाएँ', sending: 'रिपोर्ट तैयार हो रही है…', reportTitle: 'आपकी प्रैक्टिस रिपोर्ट', openTg: 'यह रिपोर्ट टेलीग्राम पर पाएँ',
    after: 'केवल अनौपचारिक अभ्यास। यह NAT परिणाम का अनुमान नहीं लगाता।' },
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
  const l = L[lang];
  const blank = { name: '', phone: '', age: '', parentName: '', parentPhone: '', consent: false };
  const [lead, setLead] = useState(blank);
  const [leadStage, setLeadStage] = useState('form'); // form | sending | done
  const [leadRes, setLeadRes] = useState(null);
  const up = (k, v) => setLead({ ...lead, [k]: v });
  const minor = lead.age === 'under18';
  const leadReady = lead.name.trim().length >= 2 && lead.age && lead.consent &&
    (minor ? lead.parentName.trim().length >= 2 && lead.parentPhone.trim() : lead.phone.trim());

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
  async function submitLead() {
    setErr(''); setLeadStage('sending');
    try {
      const src = new URLSearchParams(window.location.search).get('src') || '';
      const j = await post('/api/lead', { attemptId: att, name: lead.name, ageBand: lead.age, phone: lead.phone,
        parentName: lead.parentName, parentPhone: lead.parentPhone, consent: lead.consent,
        consentText: minor ? l.consentMinor : l.consentAdult, source: src });
      setLeadRes(j); setLeadStage('done');
    } catch (e) { setErr(e.message); setLeadStage('form'); }
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
            <button onClick={() => { setStage('start'); setRes(null); setLead(blank); setLeadStage('form'); setLeadRes(null); }}>{t.again}</button>
          </div>
          {leadStage === 'done' && leadRes ? (
            <div className="card">
              <h3>{l.reportTitle}</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{leadRes.report}</p>
              {leadRes.telegramUrl && <p><a className="tg" href={leadRes.telegramUrl} target="_blank" rel="noreferrer">{l.openTg}</a></p>}
              <p className="muted">{l.after}</p>
            </div>
          ) : (
            <div className="card">
              <h3>{l.unlockTitle}</h3>
              <p className="muted">{l.unlockSub}</p>
              <input placeholder={l.name} value={lead.name} maxLength={80} onChange={(e) => up('name', e.target.value)} />
              <p className="muted">{l.ageQ}</p>
              {[['under18', l.under18], ['adult', l.adult]].map(([v, n]) => (
                <button key={v} className={'opt' + (lead.age === v ? ' sel' : '')} style={{ display: 'inline-block', width: 'auto', marginRight: 8 }} onClick={() => up('age', v)}>{n}</button>
              ))}
              {lead.age === 'adult' && <input placeholder={l.phone} inputMode="numeric" value={lead.phone} maxLength={16} onChange={(e) => up('phone', e.target.value)} />}
              {minor && (<>
                <input placeholder={l.parentName} value={lead.parentName} maxLength={80} onChange={(e) => up('parentName', e.target.value)} />
                <input placeholder={l.parentPhone} inputMode="numeric" value={lead.parentPhone} maxLength={16} onChange={(e) => up('parentPhone', e.target.value)} />
              </>)}
              {lead.age && (
                <label className="check"><input type="checkbox" checked={lead.consent} onChange={(e) => up('consent', e.target.checked)} />
                  <span>{minor ? l.consentMinor : l.consentAdult}</span></label>
              )}
              <p className="muted">{l.privacy}</p>
              <button className="primary" disabled={!leadReady || leadStage === 'sending'} onClick={submitLead}>{leadStage === 'sending' ? l.sending : l.submit}</button>
            </div>
          )}
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
