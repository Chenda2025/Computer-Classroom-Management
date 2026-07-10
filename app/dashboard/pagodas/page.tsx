import { redirect } from 'next/navigation';
import { getSessionUser } from '../../../lib/getSessionUser';
import PagodasClient from './PagodasClient';

export default async function PagodasPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  return (
    <PagodasClient
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
