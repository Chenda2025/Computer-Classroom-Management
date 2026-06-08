import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const examCode = searchParams.get('examCode');

  if (!examCode) return NextResponse.json({ students: [] });

  try {
    const session = await prisma.examSession.findUnique({
      where: { examCode },
      include: { exam: true }
    });

    if (!session) return NextResponse.json({ students: [] });

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: session.exam.courseId },
      include: { student: { select: { studentCode: true, name: true, photoUrl: true } } }
    });

    return NextResponse.json({ students: enrollments.map(e => e.student) });
  } catch (error) {
    return NextResponse.json({ students: [] });
  }
}
