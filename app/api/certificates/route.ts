import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const certs = await prisma.certificate.findMany({
    orderBy: { createdAt: 'desc' },
    include: { student: { select: { id: true, studentCode: true, name: true } } },
  });
  return NextResponse.json(certs);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { studentId, title, issuedDate, description } = await request.json();
  if (!studentId || !title?.trim() || !issuedDate) {
    return NextResponse.json({ error: 'ទិន្នន័យមិនត្រឹមត្រូវ' }, { status: 400 });
  }

  const cert = await prisma.certificate.create({
    data: { studentId, title: title.trim(), issuedDate, description: description?.trim() || null },
    include: { student: { select: { id: true, studentCode: true, name: true } } },
  });
  return NextResponse.json(cert, { status: 201 });
}
