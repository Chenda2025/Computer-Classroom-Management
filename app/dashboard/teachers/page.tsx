import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import TeachersClient from './TeachersClient';

export default async function TeachersPage() {
  const session = await getSession();
  if (!session) redirect('/');

  const [teachers, courses] = await Promise.all([
    prisma.teacher.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.course.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <TeachersClient
      initialTeachers={teachers.map(t => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))}
      courses={courses}
      userRole={session.role as string}
    />
  );
}
