import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: examId } = await params;
    const body = await request.json();
    const { questions } = body;

    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    const last = await prisma.question.findFirst({ where: { examId }, orderBy: { order: 'desc' } });
    const startOrder = last ? last.order + 1 : 0;

    const dataToInsert = questions.map((q, i) => ({
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      timeLimitSeconds: Number(q.timeLimitSeconds),
      points: Number(q.points),
      type: q.type || 'SINGLE',
      order: startOrder + i,
      examId
    }));

    await prisma.question.createMany({
      data: dataToInsert
    });

    const newQuestions = await prisma.question.findMany({
      where: { examId },
      orderBy: { order: 'asc' }
    });

    return NextResponse.json(newQuestions);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
