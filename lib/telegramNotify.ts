// Отправка уведомлений в Telegram-чат через бота.
// Вызывается из API-роутов (server-side) — использует TELEGRAM_BOT_TOKEN из env.
// TELEGRAM_CHAT_ID можно переопределить через env (например, если понадобится сменить
// адресата без правки кода/редеплоя) — по умолчанию используется @acckhan.
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID || '@acckhan';

export async function notifyTelegram(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN не задан — уведомление пропущено');
    return { ok: false, error: 'no_token' };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    const data = await res.json().catch(() => null);
    // Раньше ответ Telegram вообще не проверялся — если бот не мог написать в чат
    // (например, "chat not found" или "bot was blocked by the user"), ошибка
    // терялась молча и её нельзя было увидеть даже в логах сервера.
    if (!res.ok || !data?.ok) {
      const errText = data?.description || `HTTP ${res.status}`;
      console.error('Telegram sendMessage failed:', errText, '| chat_id:', TELEGRAM_CHAT);
      return { ok: false, error: errText };
    }
    return { ok: true };
  } catch (e: any) {
    console.error('Telegram notify error', e);
    return { ok: false, error: e?.message || 'network_error' };
  }
}
