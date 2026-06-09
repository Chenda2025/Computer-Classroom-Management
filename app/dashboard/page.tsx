import { getSession } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import Link from 'next/link';
import s from './overview.module.css';

export const dynamic = 'force-dynamic';

const AVATAR_COLORS = [
  '#6366f1','#8b5cf6','#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6',
];
function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}
function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'ឥឡូវ';
  if (s < 3600) return `${Math.floor(s/60)} នាទីមុន`;
  if (s < 86400) return `${Math.floor(s/3600)} ម៉ោងមុន`;
  return `${Math.floor(s/86400)} ថ្ងៃមុន`;
}

const WEEKDAYS_KH = ['អាទិត្យ','ចន្ទ','អង្គារ','ពុធ','ព្រហស្បតិ៍','សុក្រ','សៅរ៍'];
const MONTHS_KH   = ['មករា','កុម្ភៈ','មីនា','មេសា','ឧសភា','មិថុនា','កក្កដា','សីហា','កញ្ញា','តុលា','វិច្ឆិកា','ធ្នូ'];

export default async function DashboardOverview() {
  const session = await getSession();
  const now = new Date();
  const dateStr = `${WEEKDAYS_KH[now.getDay()]}, ${now.getDate()} ${MONTHS_KH[now.getMonth()]} ${now.getFullYear()}`;
  const hour = now.getHours();
  const greeting = hour < 12 ? 'អរុណសួស្ដី' : hour < 17 ? 'ទិវាសួស្ដី' : 'សាយណ្ហសួស្ដី';
  const userName = (session?.name as string) || 'Admin';
  const role = (session?.role as string) || 'MONITOR';

  let studentCount = 0, teacherCount = 0, courseCount = 0, examCount = 0,
      pendingCount = 0, recentStudents: any[] = [], recentSessions: any[] = [];

  try {
    [studentCount, teacherCount, courseCount, examCount, pendingCount, recentStudents, recentSessions] =
      await Promise.all([
        prisma.student.count(),
        prisma.teacher.count(),
        prisma.course.count(),
        prisma.exam.count({ where: { isActive: true } }),
        prisma.examRequest.count({ where: { status: 'PENDING' } }),
        prisma.student.findMany({
          take: 6,
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, studentCode: true, createdAt: true, grade: true },
        }),
        prisma.examSession.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            exam: { select: { title: true } },
            _count: { select: { participations: true } },
          },
        }),
      ]);
  } catch { /* tables not ready */ }

  const stats = [
    {
      label: 'សិស្សសរុប', value: studentCount, icon: '👨‍🎓',
      bg: '#eef2ff', color: '#6366f1',
      footer: 'បញ្ជីសិស្សសកម្ម', href: '/dashboard/students',
    },
    {
      label: 'គ្រូបង្រៀន', value: teacherCount, icon: '👨‍🏫',
      bg: '#f5f3ff', color: '#8b5cf6',
      footer: 'គ្រូបង្រៀនសរុប', href: '/dashboard/teachers',
    },
    {
      label: 'វគ្គសិក្សា', value: courseCount, icon: '📚',
      bg: '#eff6ff', color: '#0ea5e9',
      footer: 'វគ្គដែលមាន', href: '/dashboard/courses',
    },
    {
      label: 'ប្រឡងសកម្ម', value: examCount, icon: '📝',
      bg: '#ecfdf5', color: '#10b981',
      footer: 'ការប្រឡងបើក', href: '/dashboard/exams',
    },
    {
      label: 'ស្នើរសូម', value: pendingCount, icon: '📋',
      bg: '#fffbeb', color: '#f59e0b',
      footer: 'រង់ចាំការអនុម័ត', href: '/dashboard/exam-requests',
    },
  ];

  const QUICK_ACTIONS = [
    { href: '/dashboard/students',   icon: '👨‍🎓', label: 'គ្រប់គ្រងសិស្ស',    bg: '#eef2ff', color: '#6366f1' },
    { href: '/dashboard/teachers',   icon: '👨‍🏫', label: 'គ្រប់គ្រងគ្រូ',     bg: '#f5f3ff', color: '#8b5cf6' },
    { href: '/dashboard/attendance', icon: '✅',  label: 'កត់ត្រាវត្តមាន',   bg: '#ecfdf5', color: '#10b981' },
    { href: '/dashboard/exams',      icon: '📝',  label: 'គ្រប់គ្រងប្រឡង',   bg: '#eff6ff', color: '#0ea5e9' },
    { href: '/dashboard/schedule',   icon: '📅',  label: 'មើលកាលវិភាគ',    bg: '#fff7ed', color: '#f97316' },
    { href: '/dashboard/exam-reports', icon: '📊', label: 'របាყការណ៍ប្រឡង', bg: '#fdf4ff', color: '#a855f7' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className={s.header}>
        <div className={s.greeting}>{greeting}! {userName} 👋</div>
        <div className={s.greetingMeta}>
          <span className={s.greetingDate}>📅 {dateStr}</span>
          <span className={s.roleBadge}>
            {role === 'ADMIN' ? 'អ្នកគ្រប់គ្រង' : 'អ្នកត្រួតពិនិត្យ'}
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className={s.statGrid}>
        {stats.map((st) => (
          <Link key={st.label} href={st.href} style={{ textDecoration: 'none' }}>
            <div className={s.statCard}>
              <div className={s.statTop}>
                <div className={s.statIconWrap} style={{ background: st.bg }}>
                  {st.icon}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={s.statValue} style={{ color: st.color }}>{st.value}</div>
                </div>
              </div>
              <div className={s.statLabel}>{st.label}</div>
              <div className={s.statFooter}>
                <span>→</span>
                <span>{st.footer}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Content: Activity + Sessions */}
      <div className={s.contentGrid}>
        {/* Recent Students */}
        <div className={s.panel}>
          <div className={s.panelHeader}>
            <div className={s.panelTitle}>👥 សិស្សថ្មីៗ</div>
            <Link href="/dashboard/students" className={s.panelLink}>មើលទាំងអស់ →</Link>
          </div>
          <div className={s.activityList}>
            {recentStudents.length === 0 ? (
              <div className={s.activityEmpty}>មិនទាន់មានទិន្នន័យ</div>
            ) : recentStudents.map(st => (
              <div key={st.id} className={s.activityItem}>
                <div className={s.activityAvatar} style={{ background: avatarColor(st.name) }}>
                  {initials(st.name)}
                </div>
                <div className={s.activityBody}>
                  <div className={s.activityName}>{st.name}</div>
                  <div className={s.activitySub}>
                    {st.studentCode}{st.grade ? ` · ${st.grade}` : ''}
                  </div>
                </div>
                <div className={s.activityTime}>{timeAgo(new Date(st.createdAt))}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Exam Sessions + Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Recent Sessions */}
          <div className={s.panel} style={{ animation: 'none' }}>
            <div className={s.panelHeader}>
              <div className={s.panelTitle}>🎯 ការប្រឡងថ្មីៗ</div>
              <Link href="/dashboard/exams" className={s.panelLink}>មើលទាំងអស់ →</Link>
            </div>
            <div className={s.sessionList}>
              {recentSessions.length === 0 ? (
                <div className={s.activityEmpty}>មិនទាន់មានការប្រឡង</div>
              ) : recentSessions.map((sess: any) => {
                const statusMap: Record<string,{label:string,cls:string,dot:string}> = {
                  IN_PROGRESS: { label: 'កំពុងប្រឡង', cls: s.statusInProgress, dot: '#10b981' },
                  COMPLETED:   { label: 'បានបញ្ចប់',  cls: s.statusCompleted,  dot: '#3b82f6' },
                  LOBBY:       { label: 'រង់ចាំ',      cls: s.statusLobby,      dot: '#f59e0b' },
                };
                const st = statusMap[sess.status] ?? { label: sess.status, cls: s.statusLobby, dot: '#94a3b8' };
                return (
                  <div key={sess.id} className={s.sessionItem}>
                    <div className={s.sessionDot} style={{ background: st.dot }} />
                    <div className={s.sessionBody}>
                      <div className={s.sessionTitle}>{sess.exam.title}</div>
                      <div className={s.sessionMeta}>
                        {sess._count.participations} នាក់ · {timeAgo(new Date(sess.createdAt))}
                      </div>
                    </div>
                    <span className={`${s.statusBadge} ${st.cls}`}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions 2×3 */}
          <div className={s.panel} style={{ animation: 'none' }}>
            <div className={s.panelHeader}>
              <div className={s.panelTitle}>⚡ ការដំណើរការរហ័ស</div>
            </div>
            <div className={s.quickGrid}>
              {QUICK_ACTIONS.map(q => (
                <Link
                  key={q.href}
                  href={q.href}
                  className={s.quickCard}
                  style={{
                    '--quick-bg': q.bg,
                    '--quick-border': q.color + '44',
                  } as React.CSSProperties}
                >
                  <div className={s.quickCardIcon} style={{ background: q.bg }}>
                    {q.icon}
                  </div>
                  <div className={s.quickCardLabel}>{q.label}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Row */}
      <div className={s.actionRow}>
        {[
          { href: '/dashboard/portfolios',   icon: '🗂️', label: 'ស្នាដៃសិស្ស',  desc: 'ស្នាដៃ & ឯកសារ', bg: '#fdf4ff', color: '#a855f7' },
          { href: '/dashboard/certificates', icon: '🎓', label: 'វិញ្ញាបនបត្រ',  desc: 'ចេញ & គ្រប់គ្រង', bg: '#ecfdf5', color: '#10b981' },
          { href: '/dashboard/pagodas',      icon: '🛕', label: 'បញ្ជីវត្ត',     desc: 'វត្ត & ស្ថាបនា',  bg: '#fff7ed', color: '#f97316' },
          { href: '/dashboard/classes',      icon: '🏫', label: 'ថ្នាក់រៀន',     desc: 'ថ្នាក់ & ក្រុម',   bg: '#eff6ff', color: '#0ea5e9' },
          { href: '/dashboard/users',        icon: '🔐', label: 'កំណត់សិទ្ធិ',   desc: 'អ្នកប្រើប្រាស់',  bg: '#fef2f2', color: '#ef4444' },
        ].map(a => (
          <Link key={a.href} href={a.href} className={s.actionCard}>
            <div className={s.actionIcon} style={{ background: a.bg }}>{a.icon}</div>
            <div className={s.actionBody}>
              <div className={s.actionTitle}>{a.label}</div>
              <div className={s.actionDesc}>{a.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
