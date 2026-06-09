import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import QuestionsClient from './QuestionsClient';

export default async function ExamQuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: { 
      questions: { orderBy: { order: 'asc' } },
      course: true
    }
  });

  if (!exam) {
    redirect('/dashboard/exams');
  }

  return <QuestionsClient exam={exam} />;
}
