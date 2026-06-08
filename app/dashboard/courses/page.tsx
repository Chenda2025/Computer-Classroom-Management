import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import CoursesClient from './CoursesClient';

const PASS_SCORE = 50;

export default async function CoursesPage() {
  const session = await getSession();
  if (!session) redirect('/');

  const [courses, students, enrollmentsForLock] = await Promise.all([
    prisma.course.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { enrollments: true, lessonPlans: true, exams: true } },
      },
    }),
    prisma.student.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, studentCode: true, name: true, phone: true },
    }),
    prisma.enrollment.findMany({
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
      userRole={session.role as string}
    />
  );
}
