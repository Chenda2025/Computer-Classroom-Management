import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSession } from '../../../lib/auth';
import bcrypt from 'bcrypt';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
  });
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { name, email, password, role } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'ឈ្មោះត្រូវការ' }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: 'អ៊ីមែលត្រូវការ' }, { status: 400 });
    if (!password || password.length < 6) return NextResponse.json({ error: 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ' }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existing) return NextResponse.json({ error: 'អ៊ីមែលនេះប្រើរួចហើយ' }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name: name.trim(), email: email.trim(), password: hashed, role: role === 'ADMIN' ? 'ADMIN' : 'MONITOR' },
      select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
