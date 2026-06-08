import { PrismaClient } from '@prisma/client';
import { sendTelegramNotification } from './telegram';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prismaBase = globalForPrisma.prisma || new PrismaClient({ log: ['query'] });

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
        const msg = `🟢 <b>[NEW]</b> ទិន្នន័យថ្មីត្រូវបានបន្ថែមចូល <b>${model}</b>\n\nID: <code>${(result as any).id || 'N/A'}</code>\nName/Title: <b>${name}</b>`;
        sendTelegramNotification(msg);
        return result;
      },
      async update({ model, args, query }) {
        const result = await query(args);
        const name = await getContextName(model, result, prismaBase);
        const msg = `🟡 <b>[UPDATE]</b> ទិន្នន័យត្រូវបានកែប្រែក្នុង <b>${model}</b>\n\nID: <code>${(result as any).id || 'N/A'}</code>\nName/Title: <b>${name}</b>`;
        sendTelegramNotification(msg);
        return result;
      },
      async delete({ model, args, query }) {
        const result = await query(args);
        const name = await getContextName(model, result, prismaBase);
        const msg = `🔴 <b>[DELETE]</b> ទិន្នន័យត្រូវបានលុបចេញពី <b>${model}</b>\n\nID: <code>${(result as any).id || 'N/A'}</code>\nName/Title: <b>${name}</b>`;
        sendTelegramNotification(msg);
        return result;
      }
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaBase;
}
