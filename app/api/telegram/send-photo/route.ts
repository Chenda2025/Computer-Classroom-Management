import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { photoBase64, caption } = await req.json();

    if (!photoBase64) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_SYSTEM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json({ error: 'Telegram configuration missing' }, { status: 500 });
    }

    // Base64 format: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
    const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Convert Buffer to Blob to be used in FormData
    const blob = new Blob([buffer], { type: 'image/png' });

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', blob, 'certificate.png');
    if (caption) {
      formData.append('caption', caption);
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.description || 'Failed to send photo' }, { status: 400 });
    }

    return NextResponse.json({ success: true, messageId: data.result.message_id });
  } catch (error: any) {
    console.error('[Telegram Send Photo Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
