import { redirect } from 'next/navigation';
import { prisma } from '../../../lib/prisma';
import { getSessionUser } from '../../../lib/getSessionUser';
import StudentsClient from './StudentsClient';

export const dynamic = 'force-dynamic';

export default async function StudentsPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  const students = await prisma.student.findMany({
    take: 1000,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { enrollments: true } },
      enrollments: { select: { courseId: true } },
    },
  });

  return (
    <StudentsClient
      initialStudents={students.map(s => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))}
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
