import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string, questionId: string }> }) {
  try {
    const { questionId } = await params;
    const body = await request.json();
    const { text, options, correctAnswer, timeLimitSeconds, points, type } = body;

    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        text,
        options,
        correctAnswer,
        timeLimitSeconds: Number(timeLimitSeconds),
        points: Number(points),
        type
      }
    });

    return NextResponse.json(question);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string, questionId: string }> }) {
  try {
    const { questionId } = await params;
    await prisma.question.delete({ where: { id: questionId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
