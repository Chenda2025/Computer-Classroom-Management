import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import UsersClient from './UsersClient';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'ADMIN') redirect('/dashboard');

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
  });

  return (
    <UsersClient
      initialUsers={users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() }))}
      currentUserId={session.sub as string}
    />
  );
}
