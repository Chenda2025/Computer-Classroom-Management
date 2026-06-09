import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { participationId, questionId, selectedOptions } = await request.json();

    if (!participationId || !questionId || !Array.isArray(selectedOptions)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    let correctIndices: string[] = [];
    try {
      correctIndices = JSON.parse(question.correctAnswer).map(String);
    } catch {
      correctIndices = [question.correctAnswer];
    }

    const selectedStrings = selectedOptions.map(String);
    
    // Ensure points is a proper number (guard against string coercion)
    const questionPoints = Number(question.points) || 0;
    
    let earnedPoints = 0;
    const hasIncorrectSelection = selectedStrings.some(val => !correctIndices.includes(val));
    const allCorrectSelected = correctIndices.every(ci => selectedStrings.includes(ci));

    // Full points only when student picks ALL correct answers and NO wrong answers
    if (!hasIncorrectSelection && allCorrectSelected && selectedStrings.length > 0) {
      earnedPoints = questionPoints;
    }

    console.log('[EXAM SCORING]', {
      questionId,
      rawPoints: question.points,
      questionPoints,
      correctIndices,
      selectedStrings,
      hasIncorrectSelection,
      earnedPoints
    });

    // Save answer
    const answer = await prisma.studentAnswer.upsert({
      where: {
        participationId_questionId: {
          participationId,
          questionId
        }
      },
      update: {
        selectedOptions: JSON.stringify(selectedOptions),
        earnedPoints
      },
      create: {
        participationId,
        questionId,
        selectedOptions: JSON.stringify(selectedOptions),
        earnedPoints
      }
    });

    // Update total score
    const allAnswers = await prisma.studentAnswer.findMany({
      where: { participationId }
    });
    
    const totalScore = allAnswers.reduce((sum, ans) => sum + ans.earnedPoints, 0);
    
    console.log('[EXAM SCORING TOTAL]', { participationId, totalScore, answerCount: allAnswers.length });

    await prisma.examParticipation.update({
      where: { id: participationId },
      data: { currentScore: totalScore }
    });

    return NextResponse.json({ success: true, earnedPoints, totalScore });
  } catch (error) {
    console.error('Submit answer error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
