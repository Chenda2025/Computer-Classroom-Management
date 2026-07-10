import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSession } from '../../../../lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  return NextResponse.json({
    students: students.map(s => ({
      id: s.id, studentCode: s.studentCode, name: s.name, photoUrl: s.photoUrl,
      portfolioCount: s._count.portfolios,
    })),
    courses: courses.map(c => ({
      id: c.id,
      name: c.name,
      students: c.enrollments.map(e => e.student),
    })),
  });
}
