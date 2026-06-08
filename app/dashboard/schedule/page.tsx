import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import ScheduleClient from './ScheduleClient';

export default async function SchedulePage() {
  const session = await getSession();
  if (!session) redirect('/');

  const [items, courses] = await Promise.all([
    prisma.schedule.findMany({ orderBy: { startDate: 'asc' } }),
    prisma.course.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <ScheduleClient
      initialItems={items.map(s => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))}
      courses={courses}
      userRole={session.role as string}
    />
  );
}
