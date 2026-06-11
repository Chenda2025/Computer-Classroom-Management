import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured in .env' }, { status: 500 });
  }

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const photoUrl = form.get('photoUrl') as string | null;
  const providedChatId = form.get('chatId') as string | null;
  const caption = form.get('caption') as string ?? '';

  const groupIds = (process.env.TELEGRAM_GROUP_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  const defaultChatId = providedChatId?.trim() || process.env.TELEGRAM_SYSTEM_CHAT_ID;
  const targets = Array.from(new Set([defaultChatId, ...groupIds].filter(Boolean))) as string[];

  if (targets.length === 0) {
    return NextResponse.json({ error: 'Missing default TELEGRAM_SYSTEM_CHAT_ID/TELEGRAM_GROUP_IDS not configured' }, { status: 400 });
  }

  let endpoint = 'sendMessage';
  const filename = form.get('filename') as string ?? 'document.pdf';
  const isImage = file ? (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg')) : !!photoUrl;
  
  if (file || photoUrl) {
    endpoint = isImage ? 'sendPhoto' : 'sendDocument';
  }
  const fileField = isImage ? 'photo' : 'document';

  for (const chatId of targets) {
    const tgForm = new FormData();
    tgForm.append('chat_id', chatId);

    if (file) {
      tgForm.append(fileField, file, filename);
      tgForm.append('caption', caption);
      tgForm.append('parse_mode', 'HTML');
    } else if (photoUrl) {
      tgForm.append('photo', photoUrl);
      tgForm.append('caption', caption);
      tgForm.append('parse_mode', 'HTML');
    } else {
      tgForm.append('text', caption);
      tgForm.append('parse_mode', 'HTML');
    }

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
      method: 'POST',
      body: tgForm,
    });

    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json({ error: data.description ?? `Telegram error (chat ${chatId})` }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
