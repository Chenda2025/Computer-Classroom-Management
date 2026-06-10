import { redirect } from 'next/navigation';
import { getSessionUser } from '../../../../lib/getSessionUser';
import { prisma } from '../../../../lib/prisma';
import StudentPortfolioClient from './StudentPortfolioClient';

type RouteContext = { params: Promise<{ studentId: string }> };

export default async function StudentPortfolioPage({ params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) redirect('/');

  const { studentId } = await params;

  const [student, courses] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, studentCode: true, name: true, photoUrl: true },
    }),
    prisma.course.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  if (!student) redirect('/dashboard/portfolios');

  const portfolios = await prisma.portfolio.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    include: { course: { select: { id: true, name: true } } },
  });

  return (
    <StudentPortfolioClient
      student={student}
      courses={courses}
      initialPortfolios={portfolios.map(p => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))}
      userRole={session.role as string}
      userPerms={session.permissions}
    />
  );
}
