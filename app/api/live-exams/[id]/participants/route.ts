import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { participationId, status } = await request.json();
    
    if (!participationId || !status) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Verify session
    const { id } = await params;
    const session = await prisma.examSession.findUnique({ where: { id } });
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const participation = await prisma.examParticipation.update({
      where: { id: participationId },
      data: { status }
    });

    return NextResponse.json(participation);
  } catch (error) {
    console.error('Error updating participation:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
