import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'Missing token' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'Please provide a url parameter (e.g., ?url=https://your-ngrok-url/api/telegram/webhook)' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to set webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
