import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import AttendanceClient from './AttendanceClient';

export default async function AttendancePage() {
  const session = await getSession();
  if (!session) redirect('/');

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { enrollments: true } },
    },
  });

  const today = new Date().toISOString().split('T')[0];

  return (
    <AttendanceClient
      courses={courses}
      today={today}
      userRole={session.role as string}
    />
  );
}
