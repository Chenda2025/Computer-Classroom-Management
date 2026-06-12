import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';
import { requireInsert, requireWrite } from '../../../lib/apiAuth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const requests = await prisma.examRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { id: true, studentCode: true, name: true, photoUrl: true } },
      exam: { select: { id: true, title: true, course: { select: { name: true } } } },
    },
  });
  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  let auth = await requireInsert('exam-requests');
  if ('res' in auth) {
    // Fallback: If they don't have explicit exam-requests insert permission,
    // check if they have courses write permission (teachers managing courses).
    const fallbackAuth = await requireWrite('courses');
    if ('res' in fallbackAuth) return auth.res; // Return the original Forbidden error
    auth = fallbackAuth;
  }

  const { studentIds, examId, note } = await request.json();
  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0 || !examId) {
    return NextResponse.json({ error: 'ទិន្នន័យមិនត្រឹមត្រូវ' }, { status: 400 });
  }

  // Find students who already requested
  const existingRequests = await prisma.examRequest.findMany({
    where: { studentId: { in: studentIds }, examId }
  });
  const existingIds = new Set(existingRequests.map(r => r.studentId));
  const newStudentIds = studentIds.filter(id => !existingIds.has(id));

  if (newStudentIds.length === 0) {
    return NextResponse.json({ error: 'សិស្សទាំងអស់បានស្នើរសុំរួចហើយ' }, { status: 409 });
  }

  try {
    const created = await Promise.all(newStudentIds.map(async (studentId) => {
      return await prisma.examRequest.create({
        data: { studentId, examId, note: note?.trim() || null, status: 'PENDING' },
        include: {
          student: { select: { id: true, studentCode: true, name: true, photoUrl: true } },
          exam: { select: { id: true, title: true, course: { select: { name: true } } } },
        },
      });
    }));
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
