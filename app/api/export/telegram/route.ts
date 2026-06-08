import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured in .env' }, { status: 500 });
  }

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const providedChatId = form.get('chatId') as string | null;
  const caption = form.get('caption') as string ?? '';

  const chatId = providedChatId?.trim() ? providedChatId.trim() : process.env.TELEGRAM_SYSTEM_CHAT_ID;

  if (!chatId) {
    return NextResponse.json({ error: 'Missing default TELEGRAM_SYSTEM_CHAT_ID not configured' }, { status: 400 });
  }

  const tgForm = new FormData();
  tgForm.append('chat_id', chatId);
  
  let endpoint = 'sendMessage';
  
  if (file) {
    const filename = form.get('filename') as string ?? 'document.pdf';
    const isImage = filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg');
    endpoint = isImage ? 'sendPhoto' : 'sendDocument';
    const fileField = isImage ? 'photo' : 'document';
    
    tgForm.append(fileField, file, filename);
    tgForm.append('caption', caption);
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
    return NextResponse.json({ error: data.description ?? 'Telegram error' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
