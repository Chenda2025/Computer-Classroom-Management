import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getSession } from '../../../../../lib/auth';

const PASS_SCORE = 50;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: courseId } = await params;
  try {
    const { studentId, score } = await request.json();
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 });

    const num = Number(score);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      return NextResponse.json({ error: 'ពិន្ទុត្រូវនៅចន្លោះ ០ និង ១០០' }, { status: 400 });
    }

    const exam = await prisma.exam.findFirst({ where: { courseId }, orderBy: { createdAt: 'desc' } });
    if (!exam) return NextResponse.json({ error: 'វគ្គសិក្សានេះមិនទាន់មានការប្រឡងទេ' }, { status: 400 });

    const result = await prisma.examResult.upsert({
      where: { studentId_examId: { studentId, examId: exam.id } },
      update: { score: num },
      create: { studentId, examId: exam.id, score: num },
    });

    return NextResponse.json({
      examId: exam.id,
      examTitle: exam.title,
      score: result.score,
      passed: result.score >= PASS_SCORE,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
