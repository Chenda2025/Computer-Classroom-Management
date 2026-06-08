import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      course: { select: { id: true, name: true } },
      _count: { select: { questions: true, results: true, examRequests: true } },
    },
  });
  return NextResponse.json(exams);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { title, type, courseId, isActive } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: 'ចំណងជើងប្រឡងត្រូវការ' }, { status: 400 });
  if (!courseId) return NextResponse.json({ error: 'វគ្គសិក្សាត្រូវការ' }, { status: 400 });

  const exam = await prisma.exam.create({
    data: {
      title: title.trim(),
      type: type ?? 'OFFLINE',
      courseId,
      isActive: isActive ?? true,
    },
    include: {
      course: { select: { id: true, name: true } },
      _count: { select: { questions: true, results: true, examRequests: true } },
    },
  });
  return NextResponse.json(exam, { status: 201 });
}
