'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import styles from '../students.module.css';
import cardStyles from './cards.module.css';

const Avatar = ({ id, name, imgClass, fallbackClass, style }: { id: string, name: string, imgClass: string, fallbackClass: string, style?: any }) => {
  const [error, setError] = useState(false);
  if (error) return <div className={fallbackClass} style={style}>{name.charAt(0)}</div>;
  return <img src={`/api/students/${id}/photo`} alt={name} className={imgClass} style={style} onError={() => setError(true)} />;
};

interface Student {
  id: string;
  studentCode: string;
  name: string;
  phone: string | null;
  photoUrl?: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  wat: string | null;
  kuti: string | null;
  kutiHead: string | null;
  academicYear: string | null;
  educationLevel: string | null;
  grade: string | null;
  notes: string | null;
  createdAt: string;
  _count: { enrollments: number };
  enrollments: { courseId: string }[];
}

interface Props {
  initialStudents: Student[];
  courses: { id: string; name: string }[];
  userRole: string;
}

function isComplete(s: Student) {
  return !!(s.gender && s.dateOfBirth && s.wat);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('km-KH', { year: 'numeric', month: 'short', day: 'numeric' });
}

const PAGE_SIZE = 15;

export default function StudentsCardClient({ initialStudents, courses, userRole }: Props) {
  const isAdmin = userRole === 'ADMIN';
  const [students] = useState<Student[]>(initialStudents);
  const [search, setSearch] = useState('');
  const [pagodaFilter, setPagodaFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [page, setPage] = useState(1);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  const uniquePagodas = useMemo(
    () => Array.from(new Set(students.map(s => s.wat).filter(Boolean))).sort() as string[],
    [students]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return students.filter(s => {
      if (q && !s.name.toLowerCase().includes(q) && !s.studentCode.toLowerCase().includes(q) && !(s.phone && s.phone.includes(q))) return false;
      if (pagodaFilter && s.wat !== pagodaFilter) return false;
      if (courseFilter && !s.enrollments.some(e => e.courseId === courseFilter)) return false;
      return true;
    });
  }, [students, search, pagodaFilter, courseFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const hasFilter = !!(search || pagodaFilter || courseFilter);

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className={cardStyles.pageHeader}>
        <div className={cardStyles.headerLeft}>
          <Link href="/dashboard/students" className={cardStyles.backBtn}>← ត្រឡប់</Link>
          <div>
            <h2 className={cardStyles.pageTitle}>🪪 កាតសិស្ស</h2>
            <p className={cardStyles.pageSubtitle}>
              {hasFilter
                ? `បង្ហាញ ${filtered.length} / ${students.length} នាក់`
                : `សិស្សសរុប ${students.length} នាក់`}
            </p>
          </div>
        </div>
        <div className={cardStyles.headerStats}>
          <div className={cardStyles.miniStat}>
            <span className={cardStyles.miniStatVal}>{students.length}</span>
            <span className={cardStyles.miniStatLbl}>សិស្ស</span>
          </div>
          <div className={cardStyles.miniStat}>
            <span className={cardStyles.miniStatVal}>{uniquePagodas.length}</span>
            <span className={cardStyles.miniStatLbl}>វត្ត</span>
          </div>
          <div className={cardStyles.miniStat}>
            <span className={cardStyles.miniStatVal}>{students.filter(isComplete).length}</span>
            <span className={cardStyles.miniStatLbl}>ព័ត៌មានពេញ</span>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className={cardStyles.toolbar}>
        <div className={styles.searchWrapper} style={{ maxWidth: 360 }}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="ស្វែងរកតាមឈ្មោះ, លេខកូដ..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={pagodaFilter}
          onChange={e => { setPagodaFilter(e.target.value); setPage(1); }}
        >
          <option value="">🏛️ វត្តទាំងអស់</option>
          {uniquePagodas.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <select
          className={styles.filterSelect}
          value={courseFilter}
          onChange={e => { setCourseFilter(e.target.value); setPage(1); }}
        >
          <option value="">📚 វគ្គទាំងអស់</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {hasFilter && (
          <button className={styles.clearFilterBtn}
            onClick={() => { setSearch(''); setPagodaFilter(''); setCourseFilter(''); setPage(1); }}>
            ✕ លុបការច្រោះ
          </button>
        )}
      </div>

      {/* ── Card Grid ── */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔍</div>
          <p>រកមិនឃើញសិស្សដែលត្រូវនឹងការស្វែងរក</p>
        </div>
      ) : (
        <div className={cardStyles.grid}>
          {paginated.map((student, i) => {
            const complete = isComplete(student);
            return (
              <div
                key={student.id}
                className={`${cardStyles.card} ${complete ? cardStyles.cardComplete : cardStyles.cardIncomplete}`}
                onClick={() => setViewStudent(student)}
              >
                {/* Gradient hero */}
                <div className={`${cardStyles.hero} ${complete ? cardStyles.heroComplete : cardStyles.heroIncomplete}`}>
                  <div className={cardStyles.heroIndex}>{(safePage - 1) * PAGE_SIZE + i + 1}</div>
                  <div className={cardStyles.avatarRing}>
                    <Avatar id={student.id} name={student.name} imgClass={cardStyles.avatar} fallbackClass={cardStyles.avatarFallback} />
                  </div>
                  {complete
                    ? <span className={cardStyles.statusBadgeOk}>✓ ពេញ</span>
                    : <span className={cardStyles.statusBadgeWarn}>⚠ មិនពេញ</span>}
                </div>

                {/* Body */}
                <div className={cardStyles.body}>
                  <div className={cardStyles.name}>{student.name}</div>
                  <span className={cardStyles.code}>{student.studentCode}</span>

                  <div className={cardStyles.infoGrid}>
                    <div className={cardStyles.infoItem}>
                      <span className={cardStyles.infoIcon}>👤</span>
                      <span>{student.gender === 'M' ? 'ប្រុស' : student.gender === 'F' ? 'ស្រី' : '—'}</span>
                    </div>
                    <div className={cardStyles.infoItem}>
                      <span className={cardStyles.infoIcon}>📱</span>
                      <span>{student.phone ?? '—'}</span>
                    </div>
                    <div className={cardStyles.infoItem}>
                      <span className={cardStyles.infoIcon}>🏛️</span>
                      <span className={cardStyles.infoTrunc}>{student.wat ?? '—'}</span>
                    </div>
                    <div className={cardStyles.infoItem}>
                      <span className={cardStyles.infoIcon}>🎓</span>
                      <span className={cardStyles.infoTrunc}>{student.grade ?? '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className={cardStyles.footer}>
                  <span className={cardStyles.enrollBadge}>📚 {student._count.enrollments} វគ្គ</span>
                  <span className={cardStyles.dateText}>{formatDate(student.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length} នាក់
          </span>
          <div className={styles.paginationBtns}>
            <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 2)
              .reduce<(number | '...')[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(n);
                return acc;
              }, [])
              .map((n, idx) =>
                n === '...' ? (
                  <span key={`e-${idx}`} className={styles.pageEllipsis}>…</span>
                ) : (
                  <button key={n} className={`${styles.pageBtn} ${safePage === n ? styles.pageBtnActive : ''}`}
                    onClick={() => setPage(n as number)}>{n}</button>
                )
              )}
            <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
          </div>
        </div>
      )}

      {/* ── Profile Modal ── */}
      {viewStudent && (
        <div className={styles.modalOverlay}>
          <div className={styles.profileCard}>

            <div className={`${styles.profileHero} ${isComplete(viewStudent) ? styles.profileHeroComplete : styles.profileHeroIncomplete}`}>
              <button className={styles.profileClose} onClick={() => setViewStudent(null)}>✕</button>
              <div className={styles.profileAvatarRing}>
                <Avatar id={viewStudent.id} name={viewStudent.name} imgClass={styles.profileAvatar} fallbackClass={styles.profileAvatarFallback} />
              </div>
              <div className={styles.profileName}>{viewStudent.name}</div>
              <span className={styles.profileCode}>{viewStudent.studentCode}</span>
              <div className={styles.profileBadgeRow}>
                {isComplete(viewStudent)
                  ? <span className={styles.profileBadgeSuccess}>✓ ព័ត៌មានពេញ</span>
                  : <span className={styles.profileBadgeWarn}>⚠ មិនទាន់ពេញ</span>}
                <span className={styles.profileBadgeNeutral}>📚 {viewStudent._count.enrollments} វគ្គ</span>
              </div>
            </div>

            <div className={styles.profileBody}>
              <div className={styles.profileSection}>
                <div className={styles.profileSectionTitle}>👤 ព័ត៌មានផ្ទាល់ខ្លួន</div>
                <div className={styles.profileRow}>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>ភេទ</span>
                    <span className={styles.profileItemValue}>
                      {viewStudent.gender === 'M' ? '♂ ប្រុស' : viewStudent.gender === 'F' ? '♀ ស្រី' : '—'}
                    </span>
                  </div>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>ថ្ងៃខែឆ្នាំកំណើត</span>
                    <span className={styles.profileItemValue}>{viewStudent.dateOfBirth ?? '—'}</span>
                  </div>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>លេខទូរស័ព្ទ</span>
                    <span className={styles.profileItemValue}>{viewStudent.phone ?? '—'}</span>
                  </div>
                </div>
              </div>

              <div className={styles.profileSection}>
                <div className={styles.profileSectionTitle}>🏛️ ទីតាំងស្នាក់នៅ</div>
                <div className={styles.profileRow}>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>វត្ត</span>
                    <span className={styles.profileItemValue}>{viewStudent.wat ?? '—'}</span>
                  </div>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>កុដិ</span>
                    <span className={styles.profileItemValue}>{viewStudent.kuti ?? '—'}</span>
                  </div>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>មេកុដិ</span>
                    <span className={styles.profileItemValue}>{viewStudent.kutiHead ?? '—'}</span>
                  </div>
                </div>
              </div>

              <div className={styles.profileSection}>
                <div className={styles.profileSectionTitle}>🎓 ការសិក្សា</div>
                <div className={styles.profileRow}>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>ឆ្នាំសិក្សា</span>
                    <span className={styles.profileItemValue}>{viewStudent.academicYear ?? '—'}</span>
                  </div>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>កម្រិតសិក្សា</span>
                    <span className={styles.profileItemValue}>{viewStudent.educationLevel ?? '—'}</span>
                  </div>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>ថ្នាក់ទី</span>
                    <span className={styles.profileItemValue}>{viewStudent.grade ?? '—'}</span>
                  </div>
                </div>
              </div>

              {viewStudent.notes && (
                <div className={styles.profileSection}>
                  <div className={styles.profileSectionTitle}>📝 ចំណាំ</div>
                  <p className={styles.profileNotes}>{viewStudent.notes}</p>
                </div>
              )}

              <div className={styles.profileFooter}>
                <span className={styles.profileFooterDate}>
                  🗓 ចុះឈ្មោះ: {formatDate(viewStudent.createdAt)}
                </span>
                {isAdmin && (
                  <Link
                    href="/dashboard/students"
                    className="btn-primary"
                    style={{ fontSize: '0.82rem', padding: '7px 16px', textDecoration: 'none' }}
                  >
                    ✏️ ទៅកែប្រែ
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
