import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireWrite, requireDelete } from '../../../../lib/apiAuth';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireWrite('registrations');
  if ('res' in auth) return auth.res;

  const { id } = await params;
  const { action, reason } = await request.json();
  if (!['APPROVE', 'REJECT'].includes(action)) {
    return NextResponse.json({ error: 'សកម្មភាពមិនត្រឹមត្រូវ' }, { status: 400 });
  }
  if (action === 'REJECT' && !reason?.trim()) {
    return NextResponse.json({ error: 'សូមបញ្ចូលមូលហេតុនៃការបដិសេធ' }, { status: 400 });
  }

  try {
    const registration = await prisma.studentRegistration.findUnique({ where: { id } });
    if (!registration) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (registration.status !== 'PENDING') {
      return NextResponse.json({ error: 'សំណើនេះត្រូវបានដោះស្រាយរួចហើយ' }, { status: 409 });
    }

    if (action === 'REJECT') {
      const updated = await prisma.studentRegistration.update({
        where: { id },
        data: { status: 'REJECTED', rejectionReason: reason.trim() },
      });
      return NextResponse.json(updated);
    }

    // APPROVE: create the Student record with an auto-generated code
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `STU-${datePart}-`;
    const last = await prisma.student.findFirst({
      where: { studentCode: { startsWith: prefix } },
      orderBy: { studentCode: 'desc' },
    });
    const seq = last ? parseInt(last.studentCode.slice(-3), 10) + 1 : 1;
    const studentCode = `${prefix}${String(seq).padStart(3, '0')}`;

    const [student, updated] = await prisma.$transaction([
      prisma.student.create({
        data: {
          studentCode,
          name: registration.name,
          nameEn: registration.nameEn,
          phone: registration.phone,
          photoUrl: registration.photoUrl,
          gender: registration.gender,
          dateOfBirth: registration.dateOfBirth,
          nationality: registration.nationality,
          wat: registration.wat,
          kuti: registration.kuti,
          kutiHead: registration.kutiHead,
          parentName: registration.parentName,
          parentPhone: registration.parentPhone,
          academicYear: registration.academicYear,
          educationLevel: registration.educationLevel,
          grade: registration.grade,
          notes: registration.notes,
        },
      }),
      prisma.studentRegistration.update({
        where: { id },
        data: { status: 'APPROVED' },
      }),
    ]);

    return NextResponse.json({ student, registration: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireDelete('registrations');
  if ('res' in auth) return auth.res;

  const { id } = await params;
  try {
    await prisma.studentRegistration.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
