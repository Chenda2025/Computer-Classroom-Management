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
    
    let earnedPoints = 0;
    // User rule: រើសខុស ឬរើសត្រូវ១ខុស១ = ០
    const hasIncorrectSelection = selectedStrings.some(val => !correctIndices.includes(val));
    
    if (!hasIncorrectSelection) {
      const correctCount = selectedStrings.filter(val => correctIndices.includes(val)).length;
      if (correctCount > 0) {
        earnedPoints = (question.points / correctIndices.length) * correctCount;
      }
    }

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
