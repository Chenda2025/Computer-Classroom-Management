import { redirect } from 'next/navigation';
import { prisma } from '../../../lib/prisma';
import { getSessionUser } from '../../../lib/getSessionUser';
import ClassesClient from './ClassesClient';

export default async function ClassesPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  const classes = await prisma.schoolClass.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <ClassesClient
      initialClasses={classes.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }))}
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
