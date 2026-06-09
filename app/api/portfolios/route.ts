import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';
import { requireInsert } from '../../../lib/apiAuth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const portfolios = await prisma.portfolio.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { id: true, studentCode: true, name: true } },
      course: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(portfolios);
}

export async function POST(request: Request) {
  const auth = await requireInsert('portfolios');
  if ('res' in auth) return auth.res;

  const { title, fileUrl, studentId, courseId } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: 'ចំណងជើងត្រូវការ' }, { status: 400 });
  if (!studentId || !courseId) return NextResponse.json({ error: 'ទិន្នន័យមិនត្រឹមត្រូវ' }, { status: 400 });

  const portfolio = await prisma.portfolio.create({
    data: { title: title.trim(), fileUrl: fileUrl?.trim() || '', studentId, courseId },
    include: {
      student: { select: { id: true, studentCode: true, name: true } },
      course: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(portfolio, { status: 201 });
}
