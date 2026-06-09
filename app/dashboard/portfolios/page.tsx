import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import PortfoliosClient from './PortfoliosClient';

export default async function PortfoliosPage() {
  const session = await getSession();
  if (!session) redirect('/');

  const [students, courses] = await Promise.all([
    prisma.student.findMany({
      where: { portfolios: { some: {} } },
      orderBy: { name: 'asc' },
      select: {
        id: true, studentCode: true, name: true, photoUrl: true,
        _count: { select: { portfolios: true } },
      },
    }),
    prisma.course.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        enrollments: {
          select: {
            student: { select: { id: true, studentCode: true, name: true, photoUrl: true } },
          },
        },
      },
    }),
  ]);

  return (
    <PortfoliosClient
      students={students.map(s => ({
        id: s.id, studentCode: s.studentCode, name: s.name, photoUrl: s.photoUrl,
        portfolioCount: s._count.portfolios,
      }))}
      courses={courses.map(c => ({
        id: c.id,
        name: c.name,
        students: c.enrollments.map(e => e.student),
      }))}
      userRole={session.role as string}
    />
  );
}
