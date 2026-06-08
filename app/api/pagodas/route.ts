import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const pagodas = await prisma.pagoda.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(pagodas);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, province, district, commune, village, phone, notes } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'ឈ្មោះវត្តត្រូវការ' }, { status: 400 });

  const pagoda = await prisma.pagoda.create({
    data: { 
      name: name.trim(), 
      province: province?.trim() || null,
      district: district?.trim() || null,
      commune: commune?.trim() || null,
      village: village?.trim() || null,
      phone: phone?.trim() || null, 
      notes: notes?.trim() || null 
    },
  });
  return NextResponse.json(pagoda, { status: 201 });
}
