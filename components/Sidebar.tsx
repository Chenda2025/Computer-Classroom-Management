'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../app/dashboard/dashboard.module.css';

const NAV = [
  { href: '/dashboard',                icon: '◈', label: 'ទិដ្ឋភាពទូទៅ' },
  { href: '/dashboard/students',       icon: '◉', label: 'បញ្ជីសិស្ស' },
  { href: '/dashboard/teachers',       icon: '👨‍🏫', label: 'បញ្ជីគ្រូ' },
  { href: '/dashboard/classes',        icon: '🏫', label: 'ថ្នាក់រៀន' },
  { href: '/dashboard/courses',        icon: '▦', label: 'វគ្គសិក្សា' },
  { href: '/dashboard/attendance',     icon: '◎', label: 'វត្តមាន' },
  { href: '/dashboard/exams',          icon: '◇', label: 'ការប្រឡង' },
  { href: '/dashboard/exam-requests',  icon: '📋', label: 'ស្នើរសូមប្រឡង' },
  { href: '/dashboard/exam-reports',   icon: '📊', label: 'របាយការណ៍ប្រឡង' },
  { href: '/dashboard/schedule',       icon: '📅', label: 'កាលវិភាគ' },
  { href: '/dashboard/pagodas',        icon: '🛕', label: 'បញ្ជីវត្ត' },
  { href: '/dashboard/portfolios',     icon: '🗂️', label: 'ស្នាដៃសិស្ស' },
  { href: '/dashboard/certificates',   icon: '🎓', label: 'វិញ្ញាបនបត្រ' },
  { href: '/dashboard/users',          icon: '🔐', label: 'កំណត់សិទ្ធិ' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.sidebarTop}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🏫</div>
          <span className={styles.logoText}>គ្រប់គ្រង<br />ថ្នាក់រៀន</span>
        </div>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navLabel}>ម៉ឺនុយ</div>
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
          >
            <span className={styles.navItemIcon}>{item.icon}</span>
            {item.label}
          </Link>
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
      ចាកចេញ
    </button>
  );
}
