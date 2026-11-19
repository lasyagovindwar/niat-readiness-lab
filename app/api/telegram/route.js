import { db } from '../../../lib/db.js';
import { followUpText } from '../../../lib/lead.js';
import { sendTelegram } from '../../../lib/telegram.js';

// Telegram calls this when someone messages the bot. We always answer 200 so Telegram does not keep retrying.
export async function POST(req) {
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || req.headers.get('x-telegram-bot-api-secret-token') !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 });
  }
  try {
    const update = await req.json();
    const msg = update.message;
    const chatId = msg?.chat?.id;
    const text = String(msg?.text ?? '').trim();
    if (!chatId) return Response.json({ ok: true });

    // Helper for setup: the counsellor sends /id to learn the chat id to put in COUNSELLOR_CHAT_ID.
    if (text === '/id') { await sendTelegram(chatId, `Your chat id: ${chatId}`); return Response.json({ ok: true }); }

    const m = text.match(/^\/start\s+([0-9a-f-]{36})$/i);
    if (!m) { await sendTelegram(chatId, 'Hi! Finish the practice test on the website, then tap "Get the report on Telegram" to receive your report here.'); return Response.json({ ok: true }); }

    const sb = db();
    const { data: lead } = await sb.from('leads').select('id,name,language,score,report,telegram_chat_id,attempt_id').eq('id', m[1]).maybeSingle();
    if (!lead) { await sendTelegram(chatId, 'Sorry, that link is not valid. Please request your report again on the website.'); return Response.json({ ok: true }); }
    if (lead.telegram_chat_id && String(lead.telegram_chat_id) !== String(chatId)) {
      await sendTelegram(chatId, 'This report is already linked to another Telegram account.');
      return Response.json({ ok: true });
    }
    const { data: att } = await sb.from('attempts').select('section_scores').eq('id', lead.attempt_id).maybeSingle();
    const total = att ? Object.values(att.section_scores).reduce((s, x) => s + x.total, 0) : 10;
    const sent = await sendTelegram(chatId, followUpText(lead.language, lead.name, lead.score, total, lead.report));
    if (sent) await sb.from('leads').update({ telegram_chat_id: chatId, telegram_linked_at: new Date().toISOString() }).eq('id', lead.id);
  } catch (e) { console.error('telegram webhook failed', e); }
  return Response.json({ ok: true });
}
