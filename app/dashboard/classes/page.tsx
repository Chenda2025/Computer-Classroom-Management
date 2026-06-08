import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import ClassesClient from './ClassesClient';

export default async function ClassesPage() {
  const session = await getSession();
  if (!session) redirect('/');

  const classes = await prisma.schoolClass.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <ClassesClient
      initialClasses={classes.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }))}
      userRole={session.role as string}
    />
  );
}
