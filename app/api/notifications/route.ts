import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ examRequests: 0, registrations: 0 }, { status: 401 });
  }

  try {
    const [examRequests, registrations] = await Promise.all([
      prisma.examRequest.count({ where: { status: 'PENDING' } }),
      prisma.studentRegistration.count({ where: { status: 'PENDING' } }),
    ]);
    
    return NextResponse.json({ examRequests, registrations });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ examRequests: 0, registrations: 0 }, { status: 500 });
  }
}
