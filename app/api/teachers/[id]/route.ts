import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireWrite, requireDelete } from '../../../../lib/apiAuth';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const auth = await requireWrite('teachers');
  if ('res' in auth) return auth.res;

  const { id } = await params;
  const body = await request.json();
  const { name, phone, email, gender, dateOfBirth, nationality, subject, photoUrl, notes } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'ឈ្មោះគ្រូត្រូវការ' }, { status: 400 });

  try {
    const teacher = await prisma.teacher.update({
      where: { id },
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        gender: gender?.trim() || null,
        dateOfBirth: dateOfBirth?.trim() || null,
        nationality: nationality?.trim() || null,
        subject: subject?.trim() || null,
        ...(photoUrl !== undefined && { photoUrl: photoUrl?.trim() || null }),
        notes: notes?.trim() || null,
      },
    });
    return NextResponse.json(teacher);
  } catch (error: any) {
    if (error?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await requireDelete('teachers');
  if ('res' in auth) return auth.res;

  const { id } = await params;
  try {
    await prisma.teacher.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
