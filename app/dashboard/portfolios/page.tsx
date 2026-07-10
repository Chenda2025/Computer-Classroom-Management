import { redirect } from 'next/navigation';
import { getSessionUser } from '../../../lib/getSessionUser';
import PortfoliosClient from './PortfoliosClient';

export default async function PortfoliosPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  return (
    <PortfoliosClient
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
