import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireWrite, requireDelete } from '../../../../lib/apiAuth';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const auth = await requireWrite('schedule');
  if ('res' in auth) return auth.res;

  const { id } = await params;
  const { title, description, startDate, endDate, startTime, endTime, type, courseId } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: 'ចំណងជើងត្រូវការ' }, { status: 400 });

  try {
    const item = await prisma.schedule.update({
      where: { id },
      data: { title: title.trim(), description: description?.trim() || null, startDate, endDate: endDate || null, startTime: startTime || null, endTime: endTime || null, type, courseId: courseId || null },
    });
    return NextResponse.json(item);
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireDelete('schedule');
  if ('res' in auth) return auth.res;

  const { id } = await params;
  try {
    await prisma.schedule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
