import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const monks = await prisma.subHeadMonk.findMany({
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(monks);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const monksData = Array.isArray(body) ? body : [body];

  const validMonks = monksData.filter((m: any) => m.name?.trim());
  if (validMonks.length === 0) return NextResponse.json({ error: 'ឈ្មោះត្រូវការយ៉ាងហោចណាស់មួយ' }, { status: 400 });

  const createdMonks = await prisma.$transaction(
    validMonks.map((m: any) => prisma.subHeadMonk.create({
      data: {
        name: m.name.trim(),
        age: m.age?.trim() || null,
        gender: m.gender?.trim() || null,
        phone: m.phone?.trim() || null,
      }
    }))
  );
  return NextResponse.json(createdMonks, { status: 201 });
}
