import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireWrite, requireDelete } from '../../../../lib/apiAuth';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const auth = await requireWrite('exams');
  if ('res' in auth) return auth.res;

  const { id } = await params;
  const { title, type, courseId, isActive } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: 'ចំណងជើងប្រឡងត្រូវការ' }, { status: 400 });

  try {
    const exam = await prisma.exam.update({
      where: { id },
      data: { title: title.trim(), type, courseId, isActive },
      include: {
        course: { select: { id: true, name: true } },
        _count: { select: { questions: true, results: true, examRequests: true } },
      },
    });
    return NextResponse.json(exam);
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireDelete('exams');
  if ('res' in auth) return auth.res;

  const { id } = await params;
  try {
    await prisma.exam.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
