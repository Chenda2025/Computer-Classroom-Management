import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';
import { requireInsert, requireDelete } from '../../../lib/apiAuth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const students = await prisma.student.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { enrollments: true } },
      enrollments: { select: { courseId: true } },
    },
  });
  return NextResponse.json(students);
}

export async function DELETE(request: Request) {
  const auth = await requireDelete('students');
  if ('res' in auth) return auth.res;

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 });
  }
  const { count } = await prisma.student.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ deleted: count });
}

export async function POST(request: Request) {
  const auth = await requireInsert('students');
  if ('res' in auth) return auth.res;

  try {
    const { name, nameEn, phone } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'ឈ្មោះសិស្សត្រូវការ' }, { status: 400 });
    }

    // Auto-generate student code: STU-YYYYMMDD-NNN
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `STU-${datePart}-`;
    const last = await prisma.student.findFirst({
      where: { studentCode: { startsWith: prefix } },
      orderBy: { studentCode: 'desc' },
    });
    const seq = last ? parseInt(last.studentCode.slice(-3), 10) + 1 : 1;
    const studentCode = `${prefix}${String(seq).padStart(3, '0')}`;

    const student = await prisma.student.create({
      data: { studentCode, name: name.trim(), nameEn: nameEn?.trim() || null, phone: phone?.trim() || null },
      include: {
        _count: { select: { enrollments: true } },
        enrollments: { select: { courseId: true } },
      },
    });
    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'មានបញ្ហាក្នុងការបង្កើតសិស្ស' }, { status: 500 });
  }
}
