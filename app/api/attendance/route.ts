import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';
import { sendTelegramNotification } from '../../../lib/telegram';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const month = searchParams.get('month');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let where = {};
  if (date) {
    where = { date: { gte: new Date(`${date}T00:00:00.000Z`), lt: new Date(`${date}T23:59:59.999Z`) } };
  } else if (from && to) {
    where = { date: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T23:59:59.999Z`) } };
  } else if (month) {
    const [y, m] = month.split('-').map(Number);
    where = { date: { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) } };
  }

  const records = await prisma.attendance.findMany({
    where,
    include: { student: { select: { id: true, studentCode: true, name: true } } },
    orderBy: { date: 'desc' },
  });
  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN' && session.role !== 'MONITOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { date, records, courseName } = body;
  if (!date || !Array.isArray(records)) {
    return NextResponse.json({ error: 'ទិន្នន័យមិនត្រឹមត្រូវ' }, { status: 400 });
  }

  const dateObj = new Date(`${date}T00:00:00.000Z`);
  const dateStart = new Date(`${date}T00:00:00.000Z`);
  const dateEnd = new Date(`${date}T23:59:59.999Z`);
  const studentIds = records.map((r: { studentId: string; status: string }) => r.studentId);

  // Replace existing records for just these students on this date — keeps other
  // courses' attendance for the same day untouched.
  await prisma.attendance.deleteMany({
    where: { date: { gte: dateStart, lt: dateEnd }, studentId: { in: studentIds } },
  });

  const created = await prisma.attendance.createMany({
    data: records.map((r: { studentId: string; status: string }) => ({
      studentId: r.studentId,
      date: dateObj,
      status: r.status,
    })),
  });

  try {
    const present = records.filter(r => r.status === 'PRESENT').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const permission = records.filter(r => r.status === 'PERMISSION').length;
    const late = records.filter(r => r.status === 'LATE').length;
    
    const msg = `📢 <b>[ATTENDANCE REPORT]</b>\n\n`
      + `📅 កាលបរិច្ឆេទ: <b>${date}</b>\n`
      + `📚 ថ្នាក់/វគ្គ: <b>${courseName || 'N/A'}</b>\n`
      + `👤 អ្នកកត់ត្រា: <b>${session.username}</b> (${session.role})\n\n`
      + `✅ វត្តមាន: <b>${present}</b> នាក់\n`
      + `❌ អវត្តមាន: <b>${absent}</b> នាក់\n`
      + `📝 ច្បាប់: <b>${permission}</b> នាក់\n`
      + `⏳ យឺត: <b>${late}</b> នាក់\n\n`
      + `👥 សរុប: <b>${records.length}</b> នាក់`;
      
    await sendTelegramNotification(msg);
  } catch (error) {
    console.error('Failed to send telegram notification', error);
  }

  return NextResponse.json({ count: created.count });
}
