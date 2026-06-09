import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcrypt';

export async function GET() {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.id as string },
    select: { id: true, name: true, email: true, role: true, photoUrl: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json(user);
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, email, currentPassword, newPassword, photoUrl } = body;

  const user = await prisma.user.findUnique({ where: { id: session.id as string } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const updates: { name?: string; email?: string; password?: string; photoUrl?: string | null } = {};

  if (name && name.trim()) updates.name = name.trim();

  if (photoUrl !== undefined) {
    updates.photoUrl = photoUrl || null;
  }

  if (email && email.trim() && email.trim() !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }
    updates.email = email.trim();
  }

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }
    updates.password = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updates,
    select: { id: true, name: true, email: true, role: true, photoUrl: true, createdAt: true },
  });

  return NextResponse.json({ success: true, user: updated });
}
