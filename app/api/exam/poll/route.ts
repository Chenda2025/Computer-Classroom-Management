import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { participationId } = await request.json();

    if (!participationId) {
      return NextResponse.json({ error: 'Missing participationId' }, { status: 400 });
    }

    const participation = await prisma.examParticipation.findUnique({
      where: { id: participationId },
      include: {
        session: {
          include: { 
            exam: { 
              include: { 
                questions: {
                  orderBy: { order: 'asc' },
                  select: {
                    id: true,
                    text: true,
                    options: true,
                    timeLimitSeconds: true,
                    points: true,
                    type: true
                    // DELIBERATELY EXCLUDING correctAnswer FROM BEING SENT TO CLIENT
                  }
                } 
              } 
            } 
          }
        }
      }
    });

    if (!participation) {
      return NextResponse.json({ error: 'Participation not found' }, { status: 404 });
    }

    return NextResponse.json({
      participationStatus: participation.status,
      sessionStatus: participation.session.status,
      startedAt: participation.session.startedAt,
      exam: participation.session.exam
    });
  } catch (error) {
    console.error('Poll error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
