import { redirect } from 'next/navigation';
import { prisma } from '../../../lib/prisma';
import { getSessionUser } from '../../../lib/getSessionUser';
import ExamsClient from './ExamsClient';

export default async function ExamsPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  const [exams, courses] = await Promise.all([
    prisma.exam.findMany({
      take: 1000,
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
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
