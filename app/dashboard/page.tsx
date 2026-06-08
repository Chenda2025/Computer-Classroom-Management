import { getSession } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import styles from './dashboard.module.css';

export const dynamic = 'force-dynamic';

export default async function DashboardOverview() {
  const session = await getSession();

  let studentCount = 0, teacherCount = 0, courseCount = 0, examCount = 0;
  try {
    [studentCount, teacherCount, courseCount, examCount] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.course.count(),
      prisma.exam.count({ where: { isActive: true } }),
    ]);
  } catch { /* tables not ready */ }

  const stats = [
    { label: 'សិស្សសរុប',           value: studentCount, icon: '👨‍🎓', color: '#6366f1' },
    { label: 'គ្រូបង្រៀន',            value: teacherCount, icon: '👨‍🏫', color: '#8b5cf6' },
    { label: 'វគ្គសិក្សា',            value: courseCount,  icon: '📚',  color: '#0ea5e9' },
    { label: 'ការប្រឡងសកម្ម',         value: examCount,    icon: '📝',  color: '#10b981' },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 6 }}>ទិដ្ឋភាពទូទៅ</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          សូមស្វាគមន៍មកកាន់ប្រព័ន្ធ — អ្នកកំពុងចូលក្នុងសិទ្ធិ{' '}
          <strong style={{ color: 'var(--color-accent)' }}>{session?.role === 'ADMIN' ? 'អ្នកគ្រប់គ្រង' : 'អ្នកត្រួតពិនិត្យ'}</strong>
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: '#fff',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 20px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{
              width: 48, height: 48,
              borderRadius: 12,
              background: `${s.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', flexShrink: 0,
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        background: '#fff',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 24px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 16, color: 'var(--color-text-primary)' }}>ការណែនាំរហ័ស</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            { href: '/dashboard/students',   icon: '👨‍🎓', label: 'គ្រប់គ្រងសិស្ស' },
            { href: '/dashboard/teachers',   icon: '👨‍🏫', label: 'គ្រប់គ្រងគ្រូ' },
            { href: '/dashboard/courses',    icon: '📚',  label: 'គ្រប់គ្រងវគ្គ' },
            { href: '/dashboard/attendance', icon: '✅',  label: 'កត់ត្រាវត្តមាន' },
            { href: '/dashboard/exams',      icon: '📝',  label: 'គ្រប់គ្រងប្រឡង' },
            { href: '/dashboard/schedule',   icon: '📅',  label: 'មើលកាលវិភាគ' },
          ].map(link => (
            <a key={link.href} href={link.href} className={styles.quickLink}>
              <span style={{ fontSize: '1.1rem' }}>{link.icon}</span>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
