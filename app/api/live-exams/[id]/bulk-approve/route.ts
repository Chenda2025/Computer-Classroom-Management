import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: sessionId } = await params;
    const { studentIds } = await request.json();

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Process each studentId
    const results = await Promise.all(studentIds.map(async (studentId) => {
      // Upsert the participation
      const participation = await prisma.examParticipation.upsert({
        where: {
          sessionId_studentId: {
            sessionId,
            studentId
          }
        },
        update: {
          status: 'APPROVED'
        },
        create: {
          sessionId,
          studentId,
          status: 'APPROVED',
          currentScore: 0
        },
        include: {
          student: {
            select: {
              studentCode: true,
              name: true,
              photoUrl: true
            }
          },
          answers: true
        }
      });
      return participation;
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
