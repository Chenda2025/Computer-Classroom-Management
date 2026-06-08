import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const session = await prisma.examSession.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endedAt: new Date()
      },
      include: {
        exam: { include: { course: true } },
        participations: {
          where: { status: 'APPROVED' },
          include: { student: true }
        }
      }
    });

    const { exam, participations } = session;
    const passingScore = exam.passingScore;

    // Find the course that comes right after this exam's course in the sequence
    const nextCourse = await prisma.course.findFirst({
      where: { order: { gt: exam.course.order } },
      orderBy: { order: 'asc' }
    });

    const summary: { studentId: string; name: string; score: number; passed: boolean; promoted: boolean }[] = [];

    for (const p of participations) {
      const score = p.currentScore;
      const passed = score >= passingScore;
      let promoted = false;

      if (passed && nextCourse && nextCourse.id !== exam.courseId) {
        const alreadyInNext = await prisma.enrollment.findFirst({
          where: { studentId: p.studentId, courseId: nextCourse.id }
        });
        if (!alreadyInNext) {
          await prisma.enrollment.deleteMany({ where: { studentId: p.studentId, courseId: exam.courseId } });
          await prisma.enrollment.create({ data: { studentId: p.studentId, courseId: nextCourse.id } });
        }
        promoted = true;

        const note = `[ស្វ័យប្រវត្តិ] ប្រឡងជាប់ "${exam.title}" (${score} ពិន្ទុ) → បានបន្តទៅវគ្គ "${nextCourse.name}"`;
        await prisma.student.update({
          where: { id: p.studentId },
          data: { notes: p.student.notes ? `${p.student.notes}\n${note}` : note }
        });
      }

      await prisma.examResult.upsert({
        where: { studentId_examId: { studentId: p.studentId, examId: exam.id } },
        update: { score, promoted },
        create: { studentId: p.studentId, examId: exam.id, score, promoted }
      });

      summary.push({ studentId: p.studentId, name: p.student.name, score, passed, promoted });
    }

    // Exam finished — clear out the request queue for this exam until the next round of requests
    await prisma.examRequest.deleteMany({ where: { examId: exam.id } });

    return NextResponse.json({ ...session, autoSummary: summary, nextCourse: nextCourse ? { id: nextCourse.id, name: nextCourse.name } : null });
  } catch (error) {
    console.error('Error ending session:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
