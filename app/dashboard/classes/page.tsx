import { redirect } from 'next/navigation';
import { getSessionUser } from '../../../lib/getSessionUser';
import ClassesClient from './ClassesClient';

export default async function ClassesPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  return (
    <ClassesClient
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
