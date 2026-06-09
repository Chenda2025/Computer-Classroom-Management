import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: sessionId } = await params;
    
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { exam: true }
    });

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const courseId = session.exam.courseId;

    // Fetch enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      include: { student: true }
    });

    // Fetch existing participations
    const participations = await prisma.examParticipation.findMany({
      where: { sessionId }
    });
    
    const participatingStudentIds = new Set(participations.map(p => p.studentId));

    // Filter eligible students
    const eligibleStudents = enrollments
      .map(e => e.student)
      .filter(s => !participatingStudentIds.has(s.id));

    return NextResponse.json(eligibleStudents);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
