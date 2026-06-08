import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import PagodasClient from './PagodasClient';

export default async function PagodasPage() {
  const session = await getSession();
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
      userRole={session.role as string}
    />
  );
}
