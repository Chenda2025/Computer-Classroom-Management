import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireWrite, requireDelete } from '../../../../lib/apiAuth';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireWrite('exam-requests');
  if ('res' in auth) return auth.res;

  const { id } = await params;
  const { status } = await request.json();
  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
    return NextResponse.json({ error: 'Status មិនត្រឹមត្រូវ' }, { status: 400 });
  }

  try {
    const req = await prisma.examRequest.update({
      where: { id },
      data: { status },
      include: {
        student: { select: { id: true, studentCode: true, name: true, photoUrl: true } },
        exam: { select: { id: true, title: true, course: { select: { name: true } } } },
      },
    });
    return NextResponse.json(req);
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireDelete('exam-requests');
  if ('res' in auth) return auth.res;

  const { id } = await params;
  try {
    await prisma.examRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
