import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const [pagodas, kutis, educationLevels, academicYears] = await Promise.all([
      prisma.pagoda.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      prisma.kuti.findMany({ orderBy: { name: 'asc' }, include: { head: true } }),
      prisma.educationLevel.findMany({ include: { grades: true }, orderBy: { name: 'asc' } }),
      prisma.academicYear.findMany({ orderBy: { name: 'desc' } }),
    ]);

    return NextResponse.json({ pagodas, kutis, educationLevels, academicYears });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
