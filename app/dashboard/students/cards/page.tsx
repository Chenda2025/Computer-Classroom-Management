import { redirect } from 'next/navigation';
import { getSession } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import StudentsCardClient from './StudentsCardClient';

export const dynamic = 'force-dynamic';

export default async function StudentsCardsPage() {
  const session = await getSession();
  if (!session) redirect('/');

  const students = await prisma.student.findMany({
    take: 1000,
    orderBy: { createdAt: 'desc' },
    omit: { photoUrl: true },
    include: {
      _count: { select: { enrollments: true } },
      enrollments: { select: { courseId: true } },
    },
  });

  const courses = await prisma.course.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <StudentsCardClient
      initialStudents={students.map(s => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))}
      courses={courses}
      userRole={session.role as string}
    />
  );
}
