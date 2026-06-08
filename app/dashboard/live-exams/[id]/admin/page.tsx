import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminLiveExamClient from './AdminLiveExamClient';

export default async function AdminLiveExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await prisma.examSession.findUnique({
    where: { id },
    include: {
      exam: {
        include: { questions: { orderBy: { order: 'asc' } } }
      },
      participations: {
        include: { 
          student: true,
          answers: true
        }
      }
    }
  });

  if (!session) {
    redirect('/dashboard/exams');
  }

  return <AdminLiveExamClient initialSession={session as any} />;
}
