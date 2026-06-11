"""
Telegram Forward-to-Group Bot
=============================
លំហូរ (Flow):
    ប្រភពព័ត៌មាន  ->  Bot  ->  Group  ->  អ្នកប្រើក្នុង group មើលឃើញ

មុខងារ:
  - Admin ផ្ញើព័ត៌មានទៅ bot  ->  bot បញ្ជូនបន្តទៅ group
  - រាល់សារ (text / រូបភាព / file) ដែល admin ផ្ញើ ត្រូវ copy ទៅ group
  - អាចបន្ថែម group ច្រើនបាន (forward ទៅគ្រប់ group ក្នុងពេលតែមួយ)

តម្រូវការ:
    pip install python-telegram-bot python-dotenv
"""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)

# Load variables from the project's .env file.
load_dotenv(Path(__file__).parent / ".env")

# ── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
# Quiet down the noisy per-request HTTP logs from httpx.
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

# ============================================================
#  ការកំណត់ (Configuration)
# ============================================================
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "PASTE_YOUR_TOKEN_HERE")
ADMIN_ID = int(os.environ.get("TELEGRAM_SYSTEM_CHAT_ID", "0"))  # user id របស់អ្នក

# Group ID គឺលេខអវិជ្ជមាន ឧ. -1001234567890
# (មើលរបៀបរក group id នៅខាងក្រោម file នេះ)
# អាចដាក់ច្រើន group បាន ដោយបំបែកដោយ comma:  "-100123,-100456"
GROUP_IDS = [
    int(x) for x in os.environ.get("TELEGRAM_GROUP_IDS", "0").split(",") if x.strip()
]


def is_admin(user_id: int) -> bool:
    return user_id == ADMIN_ID


# ============================================================
#  ពាក្យបញ្ជា (Commands)
# ============================================================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "សួស្តី! 👋\n\n"
        "Admin អាចផ្ញើព័ត៌មាន (text / រូបភាព / file) មក bot នេះ\n"
        "ហើយវានឹងបញ្ជូនបន្តទៅ group ដោយស្វ័យប្រវត្តិ។\n\n"
        "/post <អត្ថបទ> – ផ្ញើព័ត៌មានទៅ group\n"
        "/whereami – បង្ហាញ chat id (មានប្រយោជន៍សម្រាប់រក group id)"
    )


async def whereami(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """ជួយរក chat id — ដាក់ bot ក្នុង group រួចវាយ /whereami ក្នុង group នោះ"""
    chat = update.effective_chat
    await update.message.reply_text(
        f"Chat ID: {chat.id}\nType: {chat.type}\nTitle: {chat.title or '-'}"
    )


async def post(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin វាយ: /post ព័ត៌មាន...  ->  ផ្ញើ text ទៅគ្រប់ group"""
    if not is_admin(update.effective_user.id):
        return
    text = " ".join(context.args).strip()
    if not text:
        await update.message.reply_text("សូមសរសេរ: /post ព័ត៌មានរបស់អ្នក")
        return

    sent = 0
    for gid in GROUP_IDS:
        try:
            await context.bot.send_message(chat_id=gid, text=f"📢 {text}")
            sent += 1
            logger.info("Posted message to group %s", gid)
        except Exception as e:
            logger.error("Failed to post to group %s: %s", gid, e)
            await update.message.reply_text(f"⚠️ បរាជ័យ group {gid}: {e}")
    await update.message.reply_text(f"✅ បានផ្ញើទៅ {sent} group។")


async def relay_any_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    រាល់សារ admin ផ្ញើមក bot (text, រូបភាព, file, video...)
    នឹងត្រូវ copy ទៅគ្រប់ group ដោយស្វ័យប្រវត្តិ។
    copy_message = ផ្ញើច្បាប់ចម្លងស្អាត (គ្មានស្លាក "Forwarded from")
    """
    # ដំណើរការតែ chat ឯកជនជាមួយ admin ប៉ុណ្ណោះ
    if update.effective_chat.type != "private":
        return
    if not is_admin(update.effective_user.id):
        return

    sent = 0
    for gid in GROUP_IDS:
        try:
            await context.bot.copy_message(
                chat_id=gid,
                from_chat_id=update.effective_chat.id,
                message_id=update.message.message_id,
            )
            sent += 1
            logger.info("Relayed message %s to group %s", update.message.message_id, gid)
        except Exception as e:
            logger.error("Failed to relay message %s to group %s: %s", update.message.message_id, gid, e)
            await update.message.reply_text(f"⚠️ បរាជ័យ group {gid}: {e}")
    await update.message.reply_text(f"✅ បានបញ្ជូនបន្តទៅ {sent} group។")


# ============================================================
#  ដំណើរការ Bot (Run)
# ============================================================
def main():
    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("whereami", whereami))
    app.add_handler(CommandHandler("post", post))

    # ចាប់រាល់សារផ្សេងៗ (មិនមែន command) ដើម្បី relay
    app.add_handler(
        MessageHandler(~filters.COMMAND, relay_any_message)
    )

    print("Bot កំពុងដំណើរការ... (Ctrl+C ដើម្បីបញ្ឈប់)")
    app.run_polling()


if __name__ == "__main__":
    main()
