import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { enrollments: true, lessonPlans: true, exams: true } },
    },
  });
  return NextResponse.json(courses);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { name, description, order } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'ឈ្មោះវគ្គសិក្សា ត្រូវការ' }, { status: 400 });
    }
    const course = await prisma.course.create({
      data: { name: name.trim(), description: description?.trim() || null, order: Number.isFinite(Number(order)) ? Number(order) : 0 },
      include: { _count: { select: { enrollments: true, lessonPlans: true, exams: true } } },
    });
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
