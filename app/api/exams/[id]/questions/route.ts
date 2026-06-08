import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: examId } = await params;
    const questions = await prisma.question.findMany({
      where: { examId },
      orderBy: { order: 'asc' }
    });
    return NextResponse.json(questions);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: examId } = await params;
    const body = await request.json();
    const { text, options, correctAnswer, timeLimitSeconds, points, type } = body;

    const last = await prisma.question.findFirst({ where: { examId }, orderBy: { order: 'desc' } });

    const question = await prisma.question.create({
      data: {
        text,
        options,
        correctAnswer,
        timeLimitSeconds: Number(timeLimitSeconds),
        points: Number(points),
        type,
        order: last ? last.order + 1 : 0,
        examId
      }
    });

    return NextResponse.json(question);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
