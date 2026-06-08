import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import StudentsClient from './StudentsClient';

export const dynamic = 'force-dynamic';

export default async function StudentsPage() {
  const session = await getSession();
  if (!session) redirect('/');

  const students = await prisma.student.findMany({
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
      userRole={session.role as string}
    />
  );
}
