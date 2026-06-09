import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireWrite, requireDelete } from '../../../../lib/apiAuth';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const auth = await requireWrite('courses');
  if ('res' in auth) return auth.res;

  const { id } = await params;
  try {
    const { name, description, order } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'ឈ្មោះវគ្គសិក្សា ត្រូវការ' }, { status: 400 });
    }
    const course = await prisma.course.update({
      where: { id },
      data: { name: name.trim(), description: description?.trim() || null, order: Number.isFinite(Number(order)) ? Number(order) : 0 },
      include: { _count: { select: { enrollments: true, lessonPlans: true, exams: true } } },
    });
    return NextResponse.json(course);
  } catch (error: any) {
    if (error?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await requireDelete('courses');
  if ('res' in auth) return auth.res;

  const { id } = await params;
  try {
    await prisma.course.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
