import { db } from '../../../lib/db.js';
import { validateLead, buildReportPrompt, fallbackReport } from '../../../lib/lead.js';
import { geminiText } from '../../../lib/gemini.js';
import { sendTelegram } from '../../../lib/telegram.js';

export const maxDuration = 30;

export async function POST(req) {
  try {
    const body = await req.json();
    const v = validateLead(body);
    if (v.error) return Response.json({ error: v.error }, { status: 400 });
    const lead = v.value;
    const sb = db();

    const { data: att } = await sb.from('attempts').select('id,language,score,section_scores,finished_at').eq('id', body.attemptId).maybeSingle();
    if (!att || !att.finished_at) return Response.json({ error: 'Please finish the test first.' }, { status: 400 });
    const attemptId = String(att.id);
    const { data: existing } = await sb.from('leads').select('id').eq('attempt_id', attemptId).maybeSingle();
    if (existing) return Response.json({ error: 'A report was already requested for this test.' }, { status: 409 });

    // Only numbers go to Gemini, never the person's name or phone.
    const lang = att.language;
    let report, reportSource = 'gemini';
    try { report = await geminiText(buildReportPrompt(lang, att.section_scores)); }
    catch (e) { console.error('gemini report failed, using template:', e.message); report = fallbackReport(lang, att.section_scores); reportSource = 'template'; }

    const total = Object.values(att.section_scores).reduce((s, x) => s + x.total, 0);
    const { data: row, error } = await sb.from('leads').insert({
      attempt_id: attemptId, language: lang, name: lead.name, age_band: lead.ageBand,
      phone: lead.phone, parent_name: lead.parentName, parent_phone: lead.parentPhone,
      consent: true, consent_text: lead.consentText, score: att.score, report, report_source: reportSource, source: lead.source,
    }).select('id').single();
    if (error) {
      if (error.code === '23505') return Response.json({ error: 'A report was already requested for this test.' }, { status: 409 });
      throw error;
    }

    // Counsellor alert. A failure here must not lose the lead.
    const contact = lead.ageBand === 'adult' ? `Phone: ${lead.phone}` : `Parent: ${lead.parentName}, ${lead.parentPhone} (student is under 18)`;
    const alert = `New practice lead\nName: ${lead.name}\n${contact}\nScore: ${att.score}/${total}\nLanguage: ${lang}\nSource: ${lead.source ?? 'direct'}\nDeclared consent: yes`;
    if (await sendTelegram(process.env.COUNSELLOR_CHAT_ID, alert)) {
      await sb.from('leads').update({ counsellor_alerted_at: new Date().toISOString() }).eq('id', row.id);
    }

    const bot = process.env.TELEGRAM_BOT_USERNAME;
    return Response.json({ report, telegramUrl: bot ? `https://t.me/${bot}?start=${row.id}` : null });
  } catch (e) {
    console.error('lead failed', e);
    return Response.json({ error: 'Could not create your report. Please try again.' }, { status: 500 });
  }
}
