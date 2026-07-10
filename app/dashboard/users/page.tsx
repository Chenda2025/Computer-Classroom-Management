import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'ADMIN') redirect('/dashboard');

  return (
    <UsersClient currentUserId={session.sub as string} />
  );
}
