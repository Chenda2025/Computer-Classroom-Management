import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSession } from '../../../../lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { name, academicYear, educationLevel, grade, maxStudents, notes } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'ឈ្មោះថ្នាក់ត្រូវការ' }, { status: 400 });

  try {
    const cls = await prisma.schoolClass.update({
      where: { id },
      data: {
        name: name.trim(),
        academicYear: academicYear?.trim() || null,
        educationLevel: educationLevel?.trim() || null,
        grade: grade?.trim() || null,
        maxStudents: maxStudents ? Number(maxStudents) : null,
        notes: notes?.trim() || null,
      },
    });
    return NextResponse.json(cls);
  } catch (error: any) {
    if (error?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    await prisma.schoolClass.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
