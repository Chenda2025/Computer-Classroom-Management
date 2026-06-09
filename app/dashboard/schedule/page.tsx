import { redirect } from 'next/navigation';
import { prisma } from '../../../lib/prisma';
import { getSessionUser } from '../../../lib/getSessionUser';
import ScheduleClient from './ScheduleClient';

export default async function SchedulePage() {
  const session = await getSessionUser();
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
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
