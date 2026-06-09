import { redirect } from 'next/navigation';
import { prisma } from '../../../lib/prisma';
import { getSessionUser } from '../../../lib/getSessionUser';
import PagodasClient from './PagodasClient';

export default async function PagodasPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  const pagodas = await prisma.pagoda.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { kutis: true } } },
  });

  return (
    <PagodasClient
      initialPagodas={pagodas.map(p => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))}
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
