import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const pagodaId = searchParams.get('pagodaId');

  const whereClause = pagodaId ? { pagodaId } : {};

  const kutis = await prisma.kuti.findMany({
    where: whereClause,
    include: { head: true, subHead: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(kutis);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const kutisData = Array.isArray(body) ? body : [body];

  const validKutis = kutisData.filter((k: any) => k.pagodaId && k.name?.trim());
  if (validKutis.length === 0) return NextResponse.json({ error: 'វត្ត និងឈ្មោះកុដិ ត្រូវការយ៉ាងហោចណាស់មួយ' }, { status: 400 });

  const createdKutis = await prisma.$transaction(
    validKutis.map((k: any) => prisma.kuti.create({
      data: {
        pagodaId: k.pagodaId,
        name: k.name.trim(),
        floor: k.floor?.trim() || null,
        number: k.number?.trim() || null,
        headId: k.headId || null,
        subHeadId: k.subHeadId || null,
        notes: k.notes?.trim() || null,
      },
      include: { head: true, subHead: true },
    }))
  );
  return NextResponse.json(createdKutis, { status: 201 });
}
