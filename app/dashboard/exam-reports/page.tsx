import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import ExamReportsClient from './ExamReportsClient';

const RETENTION_DAYS = 7;

export default async function ExamReportsPage() {
  const session = await getSession();
  if (!session) redirect('/');

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  // Data retention: automatically purge exam result records older than 1 week
  await prisma.examResult.deleteMany({ where: { createdAt: { lt: cutoff } } });

  const results = await prisma.examResult.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { id: true, studentCode: true, name: true, photoUrl: true, gender: true } },
      exam: { select: { id: true, title: true, passingScore: true, course: { select: { id: true, name: true } } } },
    },
  });

  return (
    <ExamReportsClient
      initialResults={results.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))}
      retentionDays={RETENTION_DAYS}
      userRole={session.role as string}
    />
  );
}
