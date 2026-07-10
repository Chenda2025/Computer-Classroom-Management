import { redirect } from 'next/navigation';
import { getSessionUser } from '../../../lib/getSessionUser';
import StudentsClient from './StudentsClient';

export default async function StudentsPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  return (
    <StudentsClient
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
