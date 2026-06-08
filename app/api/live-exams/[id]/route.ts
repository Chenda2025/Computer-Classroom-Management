import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await prisma.examSession.findUnique({
      where: { id },
      include: {
        exam: {
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          }
        },
        participations: {
          include: {
            student: true,
            answers: true
          }
        }
      }
    });
    
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching live exam session:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
