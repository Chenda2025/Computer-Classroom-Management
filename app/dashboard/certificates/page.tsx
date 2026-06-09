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
      include: { 
        student: { 
          select: { 
            id: true, studentCode: true, name: true, photoUrl: true, gender: true, dateOfBirth: true, grade: true,
            enrollments: { include: { course: true } },
            results: { include: { exam: { include: { course: true, questions: { select: { points: true } } } } }, orderBy: { createdAt: 'desc' } },
            examParticipations: { include: { session: { include: { exam: { include: { course: true, questions: { select: { points: true } } } } } } }, orderBy: { createdAt: 'desc' } }
          } 
        } 
      },
    }),
    prisma.student.findMany({ orderBy: { name: 'asc' }, select: { id: true, studentCode: true, name: true, photoUrl: true, gender: true, dateOfBirth: true } }),
  ]);

  return (
    <CertificatesClient
      initialCertificates={certificates.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        student: {
          ...c.student,
          enrollments: c.student.enrollments?.map(e => ({
            ...e,
            createdAt: e.createdAt.toISOString(),
          })),
          examParticipations: c.student.examParticipations?.map(p => ({
            ...p,
            createdAt: p.createdAt.toISOString(),
          })),
        },
      }))}
      students={students}
      userRole={session.role as string}
    />
  );
}
