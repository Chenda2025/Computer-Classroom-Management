import { redirect } from 'next/navigation';
import { prisma } from '../../../lib/prisma';
import { getSessionUser } from '../../../lib/getSessionUser';
import TestCertificateClient from './TestCertificateClient';

export default async function CertificateTestPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  const students = await prisma.student.findMany({
    take: 1000,
    orderBy: { name: 'asc' },
    select: {
      id: true, studentCode: true, name: true, nameEn: true, gender: true, dateOfBirth: true, nationality: true, photoUrl: true,
      enrollments: { select: { courseId: true, course: { select: { id: true, name: true } } } }
    }
  });

  return <TestCertificateClient students={students as any} />;
}
