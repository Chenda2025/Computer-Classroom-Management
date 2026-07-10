import { redirect } from 'next/navigation';
import { getSessionUser } from '../../../lib/getSessionUser';
import TeachersClient from './TeachersClient';

export default async function TeachersPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  return (
    <TeachersClient
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
