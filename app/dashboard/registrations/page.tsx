import { redirect } from 'next/navigation';
import { prisma } from '../../../lib/prisma';
import { getSessionUser } from '../../../lib/getSessionUser';
import RegistrationsClient from './RegistrationsClient';

export const dynamic = 'force-dynamic';

export default async function RegistrationsPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  const registrations = await prisma.studentRegistration.findMany({
    take: 1000,
    orderBy: { createdAt: 'desc' },
    omit: { photoUrl: true },
  });

  return (
    <RegistrationsClient
      initialRegistrations={registrations.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))}
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
