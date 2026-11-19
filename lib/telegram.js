// Sends a plain-text Telegram message. Returns true/false and never throws.
export async function sendTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: String(text).slice(0, 4000) }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.error('telegram send failed', r.status, (await r.text()).slice(0, 200));
    return r.ok;
  } catch (e) { console.error('telegram send error', e.message); return false; }
}
