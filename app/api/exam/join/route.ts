import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { examCode, studentCode } = await request.json();

    if (!examCode || !studentCode) {
      return NextResponse.json({ error: 'សូមបញ្ចូលលេខកូដប្រឡង និងលេខកូដសិស្ស' }, { status: 400 });
    }

    const session = await prisma.examSession.findUnique({
      where: { examCode },
      include: { exam: true }
    });

    if (!session) {
      return NextResponse.json({ error: 'លេខកូដប្រឡងមិនត្រឹមត្រូវទេ' }, { status: 404 });
    }
    if (session.status === 'COMPLETED') {
      return NextResponse.json({ error: 'ការប្រឡងនេះត្រូវបានបញ្ចប់ហើយ' }, { status: 403 });
    }

    const student = await prisma.student.findUnique({
      where: { studentCode }
    });

    if (!student) {
      return NextResponse.json({ error: 'មិនមានសិស្សលេខកូដនេះទេ' }, { status: 404 });
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: student.id, courseId: session.exam.courseId }
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'អ្នកមិនមានឈ្មោះរៀនវគ្គនេះទេ' }, { status: 403 });
    }

    const participation = await prisma.examParticipation.upsert({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId: student.id
        }
      },
      update: {}, 
      create: {
        sessionId: session.id,
        studentId: student.id,
        status: 'PENDING'
      }
    });

    return NextResponse.json({ participation, session });
  } catch (error) {
    console.error('Join exam error:', error);
    return NextResponse.json({ error: 'មានបញ្ហាកើតឡើង' }, { status: 500 });
  }
}
