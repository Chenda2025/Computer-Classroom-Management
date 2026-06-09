import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { participationId } = await request.json();

    if (!participationId) {
      return NextResponse.json({ error: 'Missing participationId' }, { status: 400 });
    }

    const participation = await prisma.examParticipation.findUnique({
      where: { id: participationId },
      include: {
        session: {
          include: {
            exam: {
              include: {
                questions: {
                  orderBy: { order: 'asc' },
                  select: {
                    id: true,
                    text: true,
                    options: true,
                    correctAnswer: true,
                    points: true,
                    type: true,
                    order: true,
                  }
                }
              }
            }
          }
        },
        answers: {
          select: {
            questionId: true,
            selectedOptions: true,
            earnedPoints: true,
          }
        }
      }
    });

    if (!participation) {
      return NextResponse.json({ error: 'Participation not found' }, { status: 404 });
    }

    // Allow review if session is COMPLETED or if the student has answered all questions
    const totalQuestions = participation.session.exam.questions.length;
    const answeredCount = participation.answers.length;
    const sessionDone = participation.session.status === 'COMPLETED';
    const studentDone = answeredCount >= totalQuestions && totalQuestions > 0;
    if (!sessionDone && !studentDone) {
      return NextResponse.json({ error: 'Exam is still in progress' }, { status: 403 });
    }

    // Build answer lookup
    const answerMap = new Map<string, { selectedOptions: string; earnedPoints: number }>();
    for (const a of participation.answers) {
      answerMap.set(a.questionId, { selectedOptions: a.selectedOptions, earnedPoints: a.earnedPoints });
    }

    // Build review data
    const questions = participation.session.exam.questions.map(q => {
      const studentAnswer = answerMap.get(q.id);
      let selectedOptions: string[] = [];
      let correctAnswer: string[] = [];

      try { selectedOptions = JSON.parse(studentAnswer?.selectedOptions || '[]'); } catch { selectedOptions = []; }
      try { correctAnswer = JSON.parse(q.correctAnswer).map(String); } catch { correctAnswer = [q.correctAnswer]; }

      let options: string[] = [];
      try { options = JSON.parse(q.options); } catch { options = [q.options]; }

      const isCorrect = studentAnswer ? studentAnswer.earnedPoints > 0 : false;

      return {
        id: q.id,
        text: q.text,
        options,
        correctAnswer,
        selectedOptions: selectedOptions.map(String),
        points: q.points,
        earnedPoints: studentAnswer?.earnedPoints || 0,
        isCorrect,
        type: q.type,
      };
    });

    const totalScore = participation.currentScore;
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    const correctCount = questions.filter(q => q.isCorrect).length;
    const passingScore = participation.session.exam.passingScore;

    return NextResponse.json({
      questions,
      totalScore,
      totalPoints,
      correctCount,
      totalQuestions: questions.length,
      passingScore,
    });
  } catch (error) {
    console.error('Review error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
