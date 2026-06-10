import styles from './dashboard.module.css';
import Sidebar from '../../components/Sidebar';
import { getSession } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import { parsePermissions } from '../../lib/permissions';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  let userInfo = {
    name: (session?.name as string) || 'Admin',
    email: (session?.email as string) || '',
    role: (session?.role as string) || 'MONITOR',
    photoUrl: undefined as string | undefined,
    permissions: '{}',
  };

  // Always fetch fresh user data for current photo and accurate name
  if (session?.id) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.id as string },
        select: { name: true, email: true, role: true, photoUrl: true, permissions: true },
      });
      if (dbUser) {
        userInfo = {
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          photoUrl: dbUser.photoUrl ?? undefined,
          permissions: dbUser.permissions ?? '{}',
        };
      }
    } catch {}
  }

  let pendingExamRequests = 0;
  try {
    pendingExamRequests = await prisma.examRequest.count({ where: { status: 'PENDING' } });
  } catch {}

  let pendingRegistrations = 0;
  try {
    pendingRegistrations = await prisma.studentRegistration.count({ where: { status: 'PENDING' } });
  } catch {}

  return (
    <div className={styles.dashboardContainer}>
      <Sidebar
        user={userInfo}
        pendingCounts={{ examRequests: pendingExamRequests, registrations: pendingRegistrations }}
        permMap={parsePermissions(userInfo.permissions)}
      />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
