import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';
import { requireInsert, requireDelete } from '../../../lib/apiAuth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const teachers = await prisma.teacher.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(teachers);
}

export async function DELETE(request: Request) {
  const auth = await requireDelete('teachers');
  if ('res' in auth) return auth.res;

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 });
  }
  const { count } = await prisma.teacher.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ deleted: count });
}

export async function POST(request: Request) {
  const auth = await requireInsert('teachers');
  if ('res' in auth) return auth.res;

  const body = await request.json();
  const { name, phone, email, gender, dateOfBirth, nationality, subject, photoUrl, notes } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'ឈ្មោះគ្រូត្រូវការ' }, { status: 400 });

  const count = await prisma.teacher.count();
  const pad = String(count + 1).padStart(3, '0');
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const teacherCode = `TCH-${dateStr}-${pad}`;

  const teacher = await prisma.teacher.create({
    data: {
      teacherCode,
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      gender: gender?.trim() || null,
      dateOfBirth: dateOfBirth?.trim() || null,
      nationality: nationality?.trim() || null,
      subject: subject?.trim() || null,
      photoUrl: photoUrl?.trim() || null,
      notes: notes?.trim() || null,
    },
  });
  return NextResponse.json(teacher, { status: 201 });
}
