import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const academicYears = await prisma.academicYear.findMany({ orderBy: { name: 'asc' } });
    const educationLevels = await prisma.educationLevel.findMany({
      include: { grades: true },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ academicYears, educationLevels });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { action, name, educationLevelId } = body;

    if (action === 'CREATE_ACADEMIC_YEAR') {
      if (!name?.trim()) return NextResponse.json({ error: 'Missing name' }, { status: 400 });
      const created = await prisma.academicYear.create({ data: { name: name.trim() } });
      return NextResponse.json(created);
    }

    if (action === 'CREATE_LEVEL_GRADE') {
      const { levelName, grades } = body;
      if (!levelName?.trim()) {
        return NextResponse.json({ error: 'Missing level name' }, { status: 400 });
      }

      // Upsert Education Level
      let level = await prisma.educationLevel.findUnique({ where: { name: levelName.trim() } });
      if (!level) {
        level = await prisma.educationLevel.create({ data: { name: levelName.trim() } });
      }

      // Create Grades if they don't exist
      if (Array.isArray(grades) && grades.length > 0) {
        for (const gradeName of grades) {
          if (!gradeName?.trim()) continue;
          
          const existingGrade = await prisma.grade.findFirst({
            where: { name: gradeName.trim(), educationLevelId: level.id }
          });

          if (!existingGrade) {
            await prisma.grade.create({
              data: { name: gradeName.trim(), educationLevelId: level.id }
            });
          }
        }
      }

      // Return the complete structure so the client can refresh
      const educationLevels = await prisma.educationLevel.findMany({
        include: { grades: true },
        orderBy: { name: 'asc' }
      });

      return NextResponse.json(educationLevels);
    }

    if (action === 'UPDATE_LEVEL_GRADE') {
      const { levelId, levelName, grades } = body;
      if (!levelId || !levelName?.trim()) return NextResponse.json({ error: 'Missing data' }, { status: 400 });
      
      await prisma.educationLevel.update({
        where: { id: levelId },
        data: { name: levelName.trim() }
      });

      const existingGrades = await prisma.grade.findMany({ where: { educationLevelId: levelId } });
      const existingGradeIds = existingGrades.map((g: any) => g.id);
      
      const submittedGradeIds = grades.map((g: any) => g.id).filter(Boolean);
      const toDelete = existingGradeIds.filter((id: string) => !submittedGradeIds.includes(id));
      
      if (toDelete.length > 0) {
        await prisma.grade.deleteMany({ where: { id: { in: toDelete } } });
      }

      for (const grade of grades) {
        if (!grade.name?.trim()) continue;
        if (grade.id) {
          await prisma.grade.update({
            where: { id: grade.id },
            data: { name: grade.name.trim() }
          });
        } else {
          await prisma.grade.create({
            data: { name: grade.name.trim(), educationLevelId: levelId }
          });
        }
      }

      const educationLevels = await prisma.educationLevel.findMany({
        include: { grades: true },
        orderBy: { name: 'asc' }
      });
      return NextResponse.json(educationLevels);
    }

    if (action === 'DELETE_LEVEL') {
      const { levelId } = body;
      await prisma.educationLevel.delete({ where: { id: levelId } });
      const educationLevels = await prisma.educationLevel.findMany({
        include: { grades: true },
        orderBy: { name: 'asc' }
      });
      return NextResponse.json(educationLevels);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error(error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'ទិន្នន័យស្ទួន (Already exists)' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
