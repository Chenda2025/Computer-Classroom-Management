import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await prisma.examSession.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date()
      }
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error starting session:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
