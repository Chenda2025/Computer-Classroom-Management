import { redirect } from 'next/navigation';
import { prisma } from '../../../lib/prisma';
import { getSessionUser } from '../../../lib/getSessionUser';
import TeachersClient from './TeachersClient';

export default async function TeachersPage() {
  const session = await getSessionUser();
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
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
