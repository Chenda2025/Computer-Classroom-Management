import { redirect } from 'next/navigation';
import { getSessionUser } from '../../../lib/getSessionUser';
import CoursesClient from './CoursesClient';

export default async function CoursesPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  return (
    <CoursesClient
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
