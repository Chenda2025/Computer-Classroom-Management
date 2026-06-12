import { redirect } from 'next/navigation';
import { getSessionUser } from '../../../lib/getSessionUser';
import TestCertificateClient from './TestCertificateClient';

export default async function CertificateTestPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  return <TestCertificateClient />;
}
