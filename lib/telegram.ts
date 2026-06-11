export async function sendTelegramNotification(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_SYSTEM_CHAT_ID;
  const groupIds = (process.env.TELEGRAM_GROUP_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  // Forward to the system chat plus every configured group, without duplicates.
  const targets = Array.from(new Set([chatId, ...groupIds].filter(Boolean)));

  if (!botToken || targets.length === 0) {
    console.log('[Telegram Notification] Skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_SYSTEM_CHAT_ID/TELEGRAM_GROUP_IDS is missing.');
    return;
  }

  for (const target of targets) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: target,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error('[Telegram Notification Error]', target, data.description);
      }
    } catch (error) {
      console.error('[Telegram Notification Failed]', target, error);
    }
  }
}

export async function sendTelegramPhoto(photoUrl: string, caption: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_SYSTEM_CHAT_ID;
  const groupIds = (process.env.TELEGRAM_GROUP_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  const targets = Array.from(new Set([chatId, ...groupIds].filter(Boolean))) as string[];

  if (!botToken || targets.length === 0) return;

  // Student/teacher photos are stored as base64 data URLs, which Telegram
  // can't fetch as a "photo" URL — upload the bytes directly via multipart.
  const dataUrlMatch = photoUrl.match(/^data:(image\/\w+);base64,(.+)$/);

  for (const target of targets) {
    try {
      let res: Response;
      if (dataUrlMatch) {
        const [, mimeType, base64Data] = dataUrlMatch;
        const blob = new Blob([Buffer.from(base64Data, 'base64')], { type: mimeType });
        const form = new FormData();
        form.append('chat_id', target);
        form.append('photo', blob, 'photo.jpg');
        form.append('caption', caption);
        form.append('parse_mode', 'HTML');
        res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: 'POST',
          body: form,
        });
      } else {
        res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: target,
            photo: photoUrl,
            caption: caption,
            parse_mode: 'HTML',
          }),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        console.error('[Telegram sendPhoto Error]', target, data.description);
      }
    } catch (error) {
      console.error('[Telegram sendPhoto Failed]', target, error);
    }
  }
}
