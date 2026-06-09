import { getSession } from './auth';
import { prisma } from './prisma';

export async function getSessionUser() {
  const session = await getSession();
  if (!session) return null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id as string },
      select: { id: true, role: true, permissions: true },
    });
    if (user) return user;
  } catch {}
  return { id: session.id as string, role: (session.role as string) || 'MONITOR', permissions: '{}' };
}
