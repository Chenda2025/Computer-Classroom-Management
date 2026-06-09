import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminExamResultsClient from './AdminExamResultsClient';

export default async function AdminExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await prisma.examSession.findUnique({
    where: { id },
    include: {
      exam: { include: { course: true, questions: { orderBy: { order: 'asc' } } } },
      participations: {
        where: { status: 'APPROVED' },
        include: {
          student: true,
          answers: true
        }
      }
    }
  });

  if (!session) {
    redirect('/dashboard/exams');
  }

  const [results, nextCourse] = await Promise.all([
    prisma.examResult.findMany({
      where: { examId: session.examId },
      select: { studentId: true, score: true, promoted: true },
    }),
    prisma.course.findFirst({
      where: { order: { gt: session.exam.course.order } },
      orderBy: { order: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  const promotedMap: Record<string, boolean> = {};
  for (const r of results) promotedMap[r.studentId] = r.promoted;

  return <AdminExamResultsClient session={session} promotedMap={promotedMap} nextCourse={nextCourse} />;
}
