import { redirect } from 'next/navigation';
import { prisma } from '../../../lib/prisma';
import { getSessionUser } from '../../../lib/getSessionUser';
import CoursesClient from './CoursesClient';

const PASS_SCORE = 50;

export default async function CoursesPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  const [courses, students, enrollmentsForLock] = await Promise.all([
    prisma.course.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { enrollments: true, lessonPlans: true, exams: true } },
      },
    }),
    prisma.student.findMany({
      take: 2000,
      orderBy: { name: 'asc' },
      select: { id: true, studentCode: true, name: true, phone: true, photoUrl: true },
    }),
    prisma.enrollment.findMany({
      take: 5000,
      select: { studentId: true },
    }),
  ]);

  const enrolledStudentIds = Array.from(new Set(enrollmentsForLock.map(e => e.studentId)));

  const serializedCourses = courses.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return (
    <CoursesClient
      initialCourses={serializedCourses}
      allStudents={students}
      enrolledStudentIds={enrolledStudentIds}
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
