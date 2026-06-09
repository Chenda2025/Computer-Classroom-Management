import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getSession } from '../../../../../lib/auth';

const PASS_SCORE = 50;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: courseId } = await params;
  try {
    const { studentId, score } = await request.json();
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 });

    const num = Number(score);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      return NextResponse.json({ error: 'ពិន្ទុត្រូវនៅចន្លោះ ០ និង ១០០' }, { status: 400 });
    }

    const exam = await prisma.exam.findFirst({ where: { courseId }, orderBy: { createdAt: 'desc' } });
    if (!exam) return NextResponse.json({ error: 'វគ្គសិក្សានេះមិនទាន់មានការប្រឡងទេ' }, { status: 400 });

    const passed = num >= PASS_SCORE;

    // Auto-promote passed students to the next course in sequence
    let promoted = false;
    let nextCourseName: string | null = null;

    if (passed) {
      const currentCourse = await prisma.course.findUnique({ where: { id: courseId } });
      if (currentCourse) {
        const nextCourse = await prisma.course.findFirst({
          where: { order: { gt: currentCourse.order } },
          orderBy: { order: 'asc' },
        });
        if (nextCourse) {
          const alreadyInNext = await prisma.enrollment.findFirst({
            where: { studentId, courseId: nextCourse.id },
          });
          if (!alreadyInNext) {
            await prisma.enrollment.deleteMany({ where: { studentId, courseId } });
            await prisma.enrollment.create({ data: { studentId, courseId: nextCourse.id } });
          }
          promoted = true;
          nextCourseName = nextCourse.name;
        }
      }
    }

    const result = await prisma.examResult.upsert({
      where: { studentId_examId: { studentId, examId: exam.id } },
      update: { score: num, promoted },
      create: { studentId, examId: exam.id, score: num, promoted },
    });

    return NextResponse.json({
      examId: exam.id,
      examTitle: exam.title,
      score: result.score,
      passed,
      promoted,
      nextCourseName,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
