'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../app/dashboard/dashboard.module.css';
import { canView, type PermMap } from '../lib/permissions';

interface UserInfo {
  name: string;
  email: string;
  role: string;
  photoUrl?: string;
  permissions?: string;
}

const NAV_GROUPS = [
  {
    label: 'ទូទៅ',
    items: [
      { href: '/dashboard', icon: '⬡', label: 'ទិដ្ឋភាពទូទៅ' },
    ],
  },
  {
    label: 'ការគ្រប់គ្រង',
    items: [
      { href: '/dashboard/students',   icon: '👨‍🎓', label: 'បញ្ជីសិស្ស' },
      { href: '/dashboard/teachers',   icon: '👨‍🏫', label: 'បញ្ជីគ្រូ' },
      { href: '/dashboard/classes',    icon: '🏫',  label: 'ថ្នាក់រៀន' },
      { href: '/dashboard/courses',    icon: '📚',  label: 'វគ្គសិក្សា' },
      { href: '/dashboard/attendance', icon: '✅',  label: 'វត្តមាន' },
    ],
  },
  {
    label: 'ការប្រឡង',
    items: [
      { href: '/dashboard/exams',         icon: '📝', label: 'ការប្រឡង' },
      { href: '/dashboard/exam-requests', icon: '📋', label: 'ស្នើរសូម', badge: true },
      { href: '/dashboard/exam-reports',  icon: '📊', label: 'របាយការណ៍' },
    ],
  },
  {
    label: 'ផ្សេងៗ',
    items: [
      { href: '/dashboard/schedule',     icon: '📅', label: 'កាលវិភាគ' },
      { href: '/dashboard/pagodas',      icon: '🛕', label: 'បញ្ជីវត្ត' },
      { href: '/dashboard/portfolios',   icon: '🗂️', label: 'ស្នាដៃសិស្ស' },
      { href: '/dashboard/certificates', icon: '🎓', label: 'វិញ្ញាបនបត្រ' },
      { href: '/dashboard/users',        icon: '🔐', label: 'កំណត់សិទ្ធិ' },
    ],
  },
];

export default function Sidebar({ user, pendingCount = 0, permMap = {} }: { user?: UserInfo; pendingCount?: number; permMap?: PermMap }) {
  const pathname = usePathname();
  const role = user?.role ?? 'MONITOR';

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'A';

  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.sidebarBrand}>
        <Link href="/dashboard" className={styles.logo}>
          <div className={styles.logoIcon}>🏫</div>
          <div className={styles.logoText}>
            <span className={styles.logoName}>គ្រប់គ្រងថ្នាក់</span>
            <span className={styles.logoSub}>Classroom System</span>
          </div>
        </Link>
      </div>

      {/* User card → profile */}
      {user && (
        <Link href="/dashboard/profile" className={styles.userCard}>
          {user.photoUrl ? (
            <img src={user.photoUrl} alt={user.name} className={styles.userAvatarImg} />
          ) : (
            <div className={styles.userAvatar}>{initials}</div>
          )}
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user.name}</div>
            <span className={`${styles.userRole} ${user.role === 'ADMIN' ? styles.roleAdmin : styles.roleMonitor}`}>
              {user.role === 'ADMIN' ? 'អ្នកគ្រប់គ្រង' : 'អ្នកត្រួតពិនិត្យ'}
            </span>
          </div>
        </Link>
      )}

      {/* Nav */}
      <nav className={styles.nav}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={styles.navGroup}>
            <span className={styles.navGroupLabel}>{group.label}</span>
            {group.items.filter(item => {
              // Extract module key from href (e.g. /dashboard/students -> students)
              const moduleKey = item.href.replace('/dashboard/', '').replace('/dashboard', '');
              if (!moduleKey) return true; // dashboard home always visible
              return canView(permMap, moduleKey, role);
            }).map(item => {
              const badge = (item as any).badge && pendingCount > 0 ? pendingCount : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                  {badge > 0 && (
                    <span className={styles.navBadge}>{badge > 99 ? '99+' : badge}</span>
                  )}
                </Link>
              );
            })}
            {gi < NAV_GROUPS.length - 1 && <div className={styles.navDivider} />}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className={styles.sidebarBottom}>
        <LogoutInline />
      </div>
    </aside>
  );
}

function LogoutInline() {
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };
  return (
    <button className={styles.logoutBtn} onClick={handleLogout}>
      <span style={{ fontSize: '1rem' }}>⎋</span>
      ចាកចេញពីប្រព័ន្ធ
    </button>
  );
}
