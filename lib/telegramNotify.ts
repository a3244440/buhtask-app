// Отправка уведомлений в Telegram-чат @acckhan через бота.
// Вызывается из API-роутов (server-side) — использует TELEGRAM_BOT_TOKEN из env.
const TELEGRAM_CHAT = '@acckhan';

export async function notifyTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.warn('TELEGRAM_BOT_TOKEN не задан — уведомление пропущено'); return; }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
  } catch (e) {
    console.error('Telegram notify error', e);
  }
}
