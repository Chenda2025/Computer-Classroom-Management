import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';
import { requireInsert, requireDelete } from '../../../lib/apiAuth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const classes = await prisma.schoolClass.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(classes);
}

export async function POST(request: Request) {
  const auth = await requireInsert('classes');
  if ('res' in auth) return auth.res;

  const body = await request.json();
  const { name, academicYear, educationLevel, grade, maxStudents, notes } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'ឈ្មោះថ្នាក់ត្រូវការ' }, { status: 400 });

  const count = await prisma.schoolClass.count();
  const pad = String(count + 1).padStart(3, '0');
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const classCode = `CLS-${dateStr}-${pad}`;

  const cls = await prisma.schoolClass.create({
    data: {
      classCode,
      name: name.trim(),
      academicYear: academicYear?.trim() || null,
      educationLevel: educationLevel?.trim() || null,
      grade: grade?.trim() || null,
      maxStudents: maxStudents ? Number(maxStudents) : null,
      notes: notes?.trim() || null,
    },
  });
  return NextResponse.json(cls, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireDelete('classes');
  if ('res' in auth) return auth.res;

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ error: 'ids required' }, { status: 400 });

  const { count } = await prisma.schoolClass.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ deleted: count });
}
