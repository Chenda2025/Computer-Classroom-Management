import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const requests = await prisma.examRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { id: true, studentCode: true, name: true, photoUrl: true } },
      exam: { select: { id: true, title: true, course: { select: { name: true } } } },
    },
  });
  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { studentId, examId, note } = await request.json();
  if (!studentId || !examId) return NextResponse.json({ error: 'ទិន្នន័យមិនត្រឹមត្រូវ' }, { status: 400 });

  const existing = await prisma.examRequest.findFirst({ where: { studentId, examId } });
  if (existing) return NextResponse.json({ error: 'សិស្សនេះបានស្នើរសុំរួចហើយ' }, { status: 409 });

  try {
    const req = await prisma.examRequest.create({
      data: { studentId, examId, note: note?.trim() || null, status: 'PENDING' },
      include: {
        student: { select: { id: true, studentCode: true, name: true, photoUrl: true } },
        exam: { select: { id: true, title: true, course: { select: { name: true } } } },
      },
    });
    return NextResponse.json(req, { status: 201 });
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'សិស្សនេះបានស្នើរសុំរួចហើយ' }, { status: 409 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
