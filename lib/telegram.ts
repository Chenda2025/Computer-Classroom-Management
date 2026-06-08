export async function sendTelegramNotification(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_SYSTEM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('[Telegram Notification] Skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_SYSTEM_CHAT_ID is missing.');
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      console.error('[Telegram Notification Error]', data.description);
    }
  } catch (error) {
    console.error('[Telegram Notification Failed]', error);
  }
}
