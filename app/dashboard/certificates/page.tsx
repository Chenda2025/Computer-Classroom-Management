import { redirect } from 'next/navigation';
import { getSessionUser } from '../../../lib/getSessionUser';
import CertificatesClient from './CertificatesClient';

export default async function CertificatesPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  return (
    <CertificatesClient
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
