import { PrismaClient } from '@prisma/client';
import { after } from 'next/server';
import { sendTelegramNotification, sendTelegramPhoto } from './telegram';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prismaBase = globalForPrisma.prisma || new PrismaClient({ log: ['query'] });

const HIDDEN_FIELDS = new Set(['password']);

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatRecordDetails(result: any): string {
  return Object.entries(result)
    .filter(([key, value]) => !HIDDEN_FIELDS.has(key) && value !== null && value !== undefined)
    .map(([key, value]) => {
      if (typeof value === 'string' && value.startsWith('data:image')) {
        return `${key}: <code>📷 (មានរូបភាពភ្ជាប់ខាងលើ)</code>`;
      }
      const formatted = value instanceof Date ? value.toISOString() : value;
      if (typeof formatted === 'object') return null;
      return `${key}: <code>${escapeHtml(String(formatted))}</code>`;
    })
    .filter((line): line is string => line !== null)
    .join('\n');
}

// Returns the record's photo as a sendable data URL, if it has one.
function getPhotoUrl(result: any): string | null {
  const photoUrl = result?.photoUrl;
  return typeof photoUrl === 'string' && photoUrl.startsWith('data:image') ? photoUrl : null;
}

const TELEGRAM_CAPTION_LIMIT = 1024;

// Sends the full record details as the photo's caption (so the info appears
// directly under the photo). Falls back to a separate text message + a
// short photo caption if the details are too long to fit as a caption.
async function sendRecordNotification(msg: string, photo: string | null, shortCaption: string) {
  if (!photo) {
    await sendTelegramNotification(msg);
    return;
  }
  if (msg.length <= TELEGRAM_CAPTION_LIMIT) {
    await sendTelegramPhoto(photo, msg);
  } else {
    await Promise.all([sendTelegramNotification(msg), sendTelegramPhoto(photo, shortCaption)]);
  }
}

const MAX_LISTED_RECORDS = 20;

function formatRecordList(records: any[]): string {
  const shown = records.slice(0, MAX_LISTED_RECORDS)
    .map((r, i) => `#${i + 1}\n${formatRecordDetails(r)}`)
    .join('\n\n');
  const extra = records.length - MAX_LISTED_RECORDS;
  return extra > 0 ? `${shown}\n\n... និង​ទិន្នន័យ​ផ្សេងទៀត ${extra}` : shown;
}

function modelDelegate(prismaClient: any, model: string) {
  return prismaClient[model.charAt(0).toLowerCase() + model.slice(1)];
}

async function getContextName(model: string, result: any, prismaClient: any): Promise<string> {
  const name = result.name || result.khmerName || result.englishName || result.title;
  if (name) return name;

  try {
    if (model === 'Enrollment') {
      const stu = await prismaClient.student.findUnique({ where: { id: result.studentId }, select: { name: true } });
      const crs = await prismaClient.course.findUnique({ where: { id: result.courseId }, select: { name: true } });
      if (stu && crs) return `${stu.name} ➡️ ${crs.name}`;
    }
    if (model === 'Attendance') {
      const stu = await prismaClient.student.findUnique({ where: { id: result.studentId }, select: { name: true } });
      return `${stu?.name || result.studentId} (${result.status})`;
    }
    if (model === 'ExamResult') {
      const stu = await prismaClient.student.findUnique({ where: { id: result.studentId }, select: { name: true } });
      const exam = await prismaClient.exam.findUnique({ where: { id: result.examId }, select: { title: true } });
      return `${stu?.name || result.studentId} ➡️ ${exam?.title || result.examId} (ពិន្ទុ: ${result.score})`;
    }
  } catch (e) {
    console.error('Error fetching context name for telegram', e);
  }
  return 'N/A';
}

export const prisma = prismaBase.$extends({
  query: {
    $allModels: {
      async create({ model, args, query }) {
        const result = await query(args);
        const name = await getContextName(model, result, prismaBase);
        const msg = `🟢 <b>[NEW]</b> ទិន្នន័យថ្មីត្រូវបានបន្ថែមចូល <b>${model}</b>\n\nName/Title: <b>${name}</b>\n\n${formatRecordDetails(result)}`;
        after(() => sendRecordNotification(msg, getPhotoUrl(result), `🟢 [NEW] ${model}: ${name}`));
        return result;
      },
      async update({ model, args, query }) {
        const result = await query(args);
        const name = await getContextName(model, result, prismaBase);
        const msg = `🟡 <b>[UPDATE]</b> ទិន្នន័យត្រូវបានកែប្រែក្នុង <b>${model}</b>\n\nName/Title: <b>${name}</b>\n\n${formatRecordDetails(result)}`;
        after(() => sendRecordNotification(msg, getPhotoUrl(result), `🟡 [UPDATE] ${model}: ${name}`));
        return result;
      },
      async delete({ model, args, query }) {
        const result = await query(args);
        const name = await getContextName(model, result, prismaBase);
        const msg = `🔴 <b>[DELETE]</b> ទិន្នន័យត្រូវបានលុបចេញពី <b>${model}</b>\n\nName/Title: <b>${name}</b>\n\n${formatRecordDetails(result)}`;
        after(() => sendTelegramNotification(msg));
        return result;
      },
      async upsert({ model, args, query }) {
        const result = await query(args);
        const name = await getContextName(model, result, prismaBase);
        const msg = `🟢 <b>[UPSERT]</b> ទិន្នន័យត្រូវបានបន្ថែម/កែប្រែក្នុង <b>${model}</b>\n\nName/Title: <b>${name}</b>\n\n${formatRecordDetails(result)}`;
        after(() => sendRecordNotification(msg, getPhotoUrl(result), `🟢 [UPSERT] ${model}: ${name}`));
        return result;
      },
      async createMany({ model, args, query }) {
        const result = await query(args);
        const items = Array.isArray(args.data) ? args.data : [args.data];
        const msg = `🟢 <b>[NEW]</b> បានបន្ថែម <b>${(result as any).count ?? items.length}</b> ទិន្នន័យចូល <b>${model}</b>\n\n${formatRecordList(items)}`;
        after(() => sendTelegramNotification(msg));
        return result;
      },
      async updateMany({ model, args, query }) {
        const result = await query(args);
        const msg = `🟡 <b>[UPDATE]</b> បានកែប្រែ <b>${(result as any).count ?? 0}</b> ទិន្នន័យក្នុង <b>${model}</b>\n\nលក្ខខណ្ឌ (where):\n${formatRecordDetails(args.where || {})}\n\nការផ្លាស់ប្ដូរ (data):\n${formatRecordDetails(args.data || {})}`;
        after(() => sendTelegramNotification(msg));
        return result;
      },
      async deleteMany({ model, args, query }) {
        let records: any[] = [];
        try {
          records = await modelDelegate(prismaBase, model).findMany({ where: args.where });
        } catch (e) {
          console.error('Error fetching records before deleteMany for telegram', e);
        }
        const result = await query(args);
        const msg = `🔴 <b>[DELETE]</b> បានលុប <b>${(result as any).count ?? records.length}</b> ទិន្នន័យចេញពី <b>${model}</b>\n\n${formatRecordList(records)}`;
        after(() => sendTelegramNotification(msg));
        return result;
      }
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaBase;
}
