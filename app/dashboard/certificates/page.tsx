import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import CertificatesClient from './CertificatesClient';

export default async function CertificatesPage() {
  const session = await getSession();
  if (!session) redirect('/');

  const [certificates, students] = await Promise.all([
    prisma.certificate.findMany({
      orderBy: { createdAt: 'desc' },
      include: { student: { select: { id: true, studentCode: true, name: true, photoUrl: true } } },
    }),
    prisma.student.findMany({ orderBy: { name: 'asc' }, select: { id: true, studentCode: true, name: true, photoUrl: true } }),
  ]);

  return (
    <CertificatesClient
      initialCertificates={certificates.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }))}
      students={students}
      userRole={session.role as string}
    />
  );
}
