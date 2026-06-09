import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireWrite, requireDelete } from '../../../../lib/apiAuth';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const auth = await requireWrite('portfolios');
  if ('res' in auth) return auth.res;

  const { id } = await params;
  const { title, fileUrl, courseId } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: 'ចំណងជើងត្រូវការ' }, { status: 400 });
  if (!courseId) return NextResponse.json({ error: 'ទិន្នន័យមិនត្រឹមត្រូវ' }, { status: 400 });

  try {
    const portfolio = await prisma.portfolio.update({
      where: { id },
      data: { title: title.trim(), fileUrl: fileUrl?.trim() || '', courseId },
      include: {
        student: { select: { id: true, studentCode: true, name: true } },
        course: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(portfolio);
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireDelete('portfolios');
  if ('res' in auth) return auth.res;

  const { id } = await params;
  try {
    await prisma.portfolio.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
