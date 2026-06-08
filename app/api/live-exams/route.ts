import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { examId } = await request.json();
    if (!examId) return NextResponse.json({ error: 'examId is required' }, { status: 400 });

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

    // Generate a random 6 character code
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let examCode = generateCode();
    let isUnique = false;
    while (!isUnique) {
      const existing = await prisma.examSession.findUnique({ where: { examCode } });
      if (!existing) {
        isUnique = true;
      } else {
        examCode = generateCode();
      }
    }

    const session = await prisma.examSession.create({
      data: {
        examId,
        examCode,
        status: 'LOBBY',
      }
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error creating live exam session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
