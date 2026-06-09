import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSession } from '../../../../lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    const body = await request.json();
    const { name, nameEn, phone, gender, dateOfBirth, nationality, photoUrl,
            wat, kuti, kutiFloor, kutiHead, kutiNumber,
            parentName, parentPhone, academicYear, educationLevel, grade, notes } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: 'ឈ្មោះសិស្សត្រូវការ' }, { status: 400 });
    }
    const student = await prisma.student.update({
      where: { id },
      data: {
        name: name.trim(),
        nameEn: nameEn?.trim() || null,
        phone: phone?.trim() || null,
        photoUrl: photoUrl?.trim() || null,
        gender: gender?.trim() || null,
        dateOfBirth: dateOfBirth?.trim() || null,
        nationality: nationality?.trim() || null,
        wat: wat?.trim() || null,
        kuti: kuti?.trim() || null,
        kutiFloor: kutiFloor?.trim() || null,
        kutiHead: kutiHead?.trim() || null,
        kutiNumber: kutiNumber?.trim() || null,
        parentName: parentName?.trim() || null,
        parentPhone: parentPhone?.trim() || null,
        academicYear: academicYear?.trim() || null,
        educationLevel: educationLevel?.trim() || null,
        grade: grade?.trim() || null,
        notes: notes?.trim() || null,
      },
    });
    return NextResponse.json(student);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    await prisma.student.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
