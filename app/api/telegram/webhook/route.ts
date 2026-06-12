import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_ID = process.env.TELEGRAM_SYSTEM_CHAT_ID;
  const GROUP_IDS = (process.env.TELEGRAM_GROUP_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'Missing token' }, { status: 500 });
  }

  try {
    const update = await req.json();

    // Only process updates with a message
    if (!update.message) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chat = message.chat;
    const fromId = String(message.from?.id);

    // Only process private messages from the admin
    if (chat.type !== 'private' || fromId !== ADMIN_ID) {
      return NextResponse.json({ ok: true });
    }

    const text = message.text || '';

    // Helper function to send a reply back to the admin
    const reply = async (replyText: string) => {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat.id, text: replyText }),
      });
    };

    // Commands
    if (text.startsWith('/start')) {
      await reply(
        "សួស្តី! 👋\n\n" +
        "Admin អាចផ្ញើព័ត៌មាន (text / រូបភាព / file) មក bot នេះ\n" +
        "ហើយវានឹងបញ្ជូនបន្តទៅ group ដោយស្វ័យប្រវត្តិ។\n\n" +
        "/post <អត្ថបទ> – ផ្ញើព័ត៌មានទៅ group\n" +
        "/whereami – បង្ហាញ chat id (មានប្រយោជន៍សម្រាប់រក group id)"
      );
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/whereami')) {
      await reply(`Chat ID: ${chat.id}\nType: ${chat.type}\nTitle: ${chat.title || '-'}`);
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/post')) {
      const argsText = text.replace('/post', '').trim();
      if (!argsText) {
        await reply("សូមសរសេរ: /post ព័ត៌មានរបស់អ្នក");
        return NextResponse.json({ ok: true });
      }

      let sent = 0;
      for (const gid of GROUP_IDS) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: gid, text: `📢 ${argsText}` }),
          });
          if (res.ok) sent++;
        } catch (e) {
          console.error('Failed to post to group', gid, e);
        }
      }
      await reply(`✅ បានផ្ញើទៅ ${sent} group។`);
      return NextResponse.json({ ok: true });
    }

    // If it's not a command, copy the message to all groups (relay)
    let sent = 0;
    for (const gid of GROUP_IDS) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/copyMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: gid,
            from_chat_id: chat.id,
            message_id: message.message_id,
          }),
        });
        if (res.ok) sent++;
      } catch (e) {
        console.error('Failed to copy to group', gid, e);
      }
    }
    await reply(`✅ បានបញ្ជូនបន្តទៅ ${sent} group។`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
