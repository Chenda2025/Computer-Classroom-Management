import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';
import { requireInsert } from '../../../lib/apiAuth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const pagodas = await prisma.pagoda.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { kutis: true } } },
  });
  return NextResponse.json(pagodas);
}

export async function POST(request: Request) {
  const auth = await requireInsert('pagodas');
  if ('res' in auth) return auth.res;

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
