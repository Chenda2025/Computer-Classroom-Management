import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';
import { requireInsert } from '../../../lib/apiAuth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const items = await prisma.schedule.findMany({ orderBy: { startDate: 'asc' } });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const auth = await requireInsert('schedule');
  if ('res' in auth) return auth.res;

  const { title, description, startDate, endDate, startTime, endTime, type, courseId } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: 'ចំណងជើងត្រូវការ' }, { status: 400 });
  if (!startDate) return NextResponse.json({ error: 'កាលបរិច្ឆេទចាប់ផ្ដើមត្រូវការ' }, { status: 400 });

  const item = await prisma.schedule.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      startDate, endDate: endDate || null,
      startTime: startTime || null, endTime: endTime || null,
      type: type ?? 'CLASS',
      courseId: courseId || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
