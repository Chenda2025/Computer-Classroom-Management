import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import ExamsClient from './ExamsClient';

export default async function ExamsPage() {
  const session = await getSession();
  if (!session) redirect('/');

  const [exams, courses] = await Promise.all([
    prisma.exam.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, name: true } },
        _count: { select: { questions: true, results: true, examRequests: true } },
      },
    }),
    prisma.course.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <ExamsClient
      initialExams={exams.map(e => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      }))}
      courses={courses}
      userRole={session.role as string}
    />
  );
}
