import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import ExamRequestsClient from './ExamRequestsClient';

export default async function ExamRequestsPage() {
  const session = await getSession();
  if (!session) redirect('/');

  const [requests, finishedResults, students, exams, courses] = await Promise.all([
    prisma.examRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, studentCode: true, name: true, gender: true, photoUrl: true } },
        exam: { select: { id: true, title: true, course: { select: { name: true } } } },
      },
    }),
    prisma.examResult.findMany({ select: { studentId: true, examId: true, updatedAt: true } }),
    prisma.student.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true, studentCode: true, name: true, gender: true, photoUrl: true,
        enrollments: { select: { courseId: true } },
      },
    }),
    prisma.exam.findMany({ orderBy: { title: 'asc' }, select: { id: true, title: true, courseId: true, course: { select: { name: true } } } }),
    prisma.course.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  const finishedAt = new Map(finishedResults.map(r => [`${r.studentId}:${r.examId}`, r.updatedAt]));
  const visibleRequests = requests.filter(r => {
    const finished = finishedAt.get(`${r.studentId}:${r.examId}`);
    return !finished || finished < r.createdAt;
  });

  return (
    <ExamRequestsClient
      initialRequests={visibleRequests.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))}
      students={students}
      exams={exams}
      courses={courses}
      userRole={session.role as string}
    />
  );
}
