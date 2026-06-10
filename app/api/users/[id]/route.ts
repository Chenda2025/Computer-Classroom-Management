import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSession } from '../../../../lib/auth';
import bcrypt from 'bcrypt';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    const { name, role, password, permissions } = await request.json();
    const data: Record<string, string> = {};
    if (name?.trim()) data.name = name.trim();
    if (role === 'ADMIN' || role === 'MONITOR') data.role = role;
    if (password && password.length >= 6) data.password = await bcrypt.hash(password, 10);
    if (permissions !== undefined) {
      data.permissions = JSON.stringify(permissions && typeof permissions === 'object' ? permissions : {});
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
    });
    return NextResponse.json(user);
  } catch (error: any) {
    if (error?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  if ((session as any).id === id) {
    return NextResponse.json({ error: 'មិនអាចលុបគណនីខ្លួនឯងបានទេ' }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
