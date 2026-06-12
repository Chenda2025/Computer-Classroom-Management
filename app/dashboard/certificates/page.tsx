import { redirect } from 'next/navigation';
import { prisma } from '../../../lib/prisma';
import { getSessionUser } from '../../../lib/getSessionUser';
import CertificatesClient from './CertificatesClient';

export default async function CertificatesPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  const [certificates, students] = await Promise.all([
    prisma.certificate.findMany({
      take: 1000,
      orderBy: { createdAt: 'desc' },
      include: { 
        student: { 
          select: { 
            id: true, studentCode: true, name: true, nameEn: true, gender: true, dateOfBirth: true, grade: true,
            enrollments: { include: { course: true } },
            results: { include: { exam: { include: { course: true, questions: { select: { points: true } } } } }, orderBy: { createdAt: 'desc' } },
            examParticipations: { include: { session: { include: { exam: { include: { course: true, questions: { select: { points: true } } } } } } }, orderBy: { createdAt: 'desc' } }
          } 
        } 
      },
    }),
    prisma.student.findMany({
      take: 1000,
      orderBy: { name: 'asc' },
      select: {
        id: true, studentCode: true, name: true, nameEn: true, gender: true, dateOfBirth: true,
        enrollments: { include: { course: { select: { id: true, name: true } } } },
      },
    }),
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
          results: c.student.results?.map(r => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            exam: {
              ...r.exam,
              createdAt: r.exam.createdAt.toISOString(),
              updatedAt: r.exam.updatedAt.toISOString(),
            },
          })),
        },
      }))}
      students={students.map(s => ({
        ...s,
        enrollments: s.enrollments.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })),
      }))}
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
