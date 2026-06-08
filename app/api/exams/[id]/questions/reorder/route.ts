import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: examId } = await params;
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    await prisma.$transaction(
      ids.map((questionId, index) =>
        prisma.question.update({
          where: { id: questionId, examId },
          data: { order: index }
        })
      )
    );

    const questions = await prisma.question.findMany({
      where: { examId },
      orderBy: { order: 'asc' }
    });

    return NextResponse.json(questions);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
