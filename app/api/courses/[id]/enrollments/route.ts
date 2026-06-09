import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getSession } from '../../../../../lib/auth';

const PASS_SCORE = 50;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: courseId } = await params;
  try {
    const [enrollments, latestExam] = await Promise.all([
      prisma.enrollment.findMany({
        where: { courseId },
        include: { student: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.exam.findFirst({ where: { courseId }, orderBy: { createdAt: 'desc' } }),
    ]);

    const scoreMap = new Map<string, number>();
    if (latestExam) {
      const results = await prisma.examResult.findMany({ where: { examId: latestExam.id } });
      for (const r of results) scoreMap.set(r.studentId, r.score);
    }

    const data = enrollments.map(e => {
      const score = scoreMap.get(e.studentId) ?? null;
      return {
        ...e.student,
        examId: latestExam?.id ?? null,
        examTitle: latestExam?.title ?? null,
        score,
        passed: score !== null && score >= PASS_SCORE,
      };
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[enrollments GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: courseId } = await params;
  try {
    const { studentId } = await request.json();
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 });

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: { studentId },
    });
    if (existingEnrollment) {
      return NextResponse.json({ error: 'សិស្សនេះកំពុងសិក្សានៅវគ្គផ្សេងរួចហើយ' }, { status: 400 });
    }

    const enrollment = await prisma.enrollment.create({
      data: { courseId, studentId },
      include: { student: true },
    });
    return NextResponse.json(enrollment.student, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'សិស្សនេះបានចូលវគ្គសិក្សារួចហើយ' }, { status: 409 });
    }
    console.error('[enrollments POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: courseId } = await params;
  try {
    const { studentId } = await request.json();
    await prisma.enrollment.deleteMany({ where: { courseId, studentId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[enrollments DELETE]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
