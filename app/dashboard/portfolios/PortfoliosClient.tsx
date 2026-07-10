'use client';
import { useState, useMemo } from 'react';
import { parsePermissions, canInsert } from '../../../lib/permissions';
import { useLocalCache } from '../../../lib/useLocalCache';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../students/students.module.css';
import cardStyles from './portfolios.module.css';

const ACCENT_PALETTE = [
  { color: '#6366f1', light: '#818cf8' },
  { color: '#10b981', light: '#34d399' },
  { color: '#f59e0b', light: '#fbbf24' },
  { color: '#ef4444', light: '#f87171' },
  { color: '#06b6d4', light: '#22d3ee' },
  { color: '#8b5cf6', light: '#a78bfa' },
];

function accentFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

interface StudentFolder {
  id: string; studentCode: string; name: string; photoUrl?: string | null;
  portfolioCount: number;
}
interface StudentOption { id: string; studentCode: string; name: string; photoUrl?: string | null; }
interface CourseOption { id: string; name: string; students: StudentOption[]; }
interface Props { userRole: string; userPerms: string; }
interface BrowseData { students: StudentFolder[]; courses: CourseOption[]; }

const fetchBrowseData = async (): Promise<BrowseData> => {
  const res = await fetch('/api/portfolios/browse');
  if (!res.ok) throw new Error('Failed to load portfolios');
  return res.json();
};

export default function PortfoliosClient({ userRole, userPerms }: Props) {
  const router = useRouter();
  const permMap = useMemo(() => parsePermissions(userPerms), [userPerms]);
  const canIns = canInsert(permMap, 'portfolios', userRole);
  const { data: browseData, loading: browseLoading, refresh: refreshBrowse } = useLocalCache<BrowseData>('portfolios-browse', fetchBrowseData);
  const students = browseData?.students ?? [];
  const courses = browseData?.courses ?? [];
  const [search, setSearch] = useState('');
  const [picker, setPicker] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;
    return students.filter(s =>
      s.name.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q)
    );
  }, [students, search]);

  const courseStudents = useMemo(() => {
    const course = courses.find(c => c.id === selectedCourse);
    return course ? course.students : [];
  }, [courses, selectedCourse]);

  const pickerFiltered = useMemo(() => {
    const q = pickerSearch.toLowerCase().trim();
    if (!q) return courseStudents;
    return courseStudents.filter(s =>
      s.name.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q)
    );
  }, [courseStudents, pickerSearch]);

  const totalWorks = useMemo(() => students.reduce((sum, s) => sum + s.portfolioCount, 0), [students]);

  const openPicker = () => { setSelectedCourse(''); setPickerSearch(''); setPicker(true); };
  const choosePickerStudent = (id: string) => { setPicker(false); router.push(`/dashboard/portfolios/${id}`); };

  if (browseLoading && browseData === null) {
    return (
      <div className="animate-fade-in" style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        កំពុងផ្ទុកទិន្នន័យស្នាដៃសិស្ស...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className={styles.pageHeader}>
        <div>
          <h2>ស្នាដៃសិស្ស</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
            សិស្ស <strong style={{ color: 'var(--color-accent)' }}>{students.length}</strong> នាក់
            {' • '}ស្នាដៃសរុប <strong style={{ color: 'var(--color-accent)' }}>{totalWorks}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={() => refreshBrowse()} disabled={browseLoading}>🔄 ផ្ទុកឡើងវិញ</button>
          {canIns && <button className="btn-primary" onClick={openPicker}>+ ជ្រើសសិស្ស</button>}
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>⌕</span>
          <input type="text" className={styles.searchInput} placeholder="ស្វែងរកសិស្សតាមឈ្មោះ ឬកូដ..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🗂️</div>
          <p>{search ? 'រកមិនឃើញសិស្ស' : 'មិនទាន់មានស្នាដៃសិស្សណាមួយនៅឡើយទេ'}</p>
        </div>
      ) : (
        <div className={cardStyles.folderGrid}>
          {filtered.map((s, i) => {
            const accent = accentFor(s.id);
            return (
              <Link
                key={s.id}
                href={`/dashboard/portfolios/${s.id}`}
                className={cardStyles.folderCard}
                style={{ '--card-accent': accent.color, '--card-accent-light': accent.light, animationDelay: `${i * 30}ms` } as React.CSSProperties}
              >
                <div className={cardStyles.cardTopRow}>
                  {s.photoUrl ? (
                    <img src={s.photoUrl} alt={s.name} className={cardStyles.studentAvatar} style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className={cardStyles.studentAvatar} style={{ background: `linear-gradient(135deg, ${accent.color}, ${accent.light})` }}>
                      {initials(s.name)}
                    </div>
                  )}
                  <div className={cardStyles.studentTitleWrap}>
                    <div className={cardStyles.studentName}>{s.name}</div>
                    <span className={cardStyles.studentCode}>{s.studentCode}</span>
                  </div>
                </div>
                <div className={cardStyles.folderMeta}>
                  <span className={cardStyles.folderCountBadge}>
                    📂 {s.portfolioCount > 0 ? `${s.portfolioCount} ស្នាដៃ` : 'មិនទាន់មានស្នាដៃ'}
                  </span>
                  <span className={cardStyles.openHint}>បើកមើល →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {picker && (
        <div className={styles.modalOverlay} onClick={() => setPicker(false)}>
          <div className={`glass-panel ${styles.modalCard}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>ជ្រើសរើសសិស្ស</h3>
              <button className={styles.closeBtn} onClick={() => setPicker(false)}>✕</button>
            </div>
            <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>មុខវិជ្ជា</label>
                <select
                  className={styles.input}
                  value={selectedCourse}
                  onChange={e => { setSelectedCourse(e.target.value); setPickerSearch(''); }}
                  autoFocus
                >
                  <option value="">-- ជ្រើសរើសមុខវិជ្ជា --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {selectedCourse && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>ស្វែងរកសិស្ស</label>
                  <input type="text" className={styles.input} placeholder="ស្វែងរកតាមឈ្មោះ ឬកូដ..."
                    value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} />
                </div>
              )}
            </div>
            {selectedCourse && (
              <div className={cardStyles.pickerList}>
                {pickerFiltered.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px 0' }}>
                    {pickerSearch ? 'រកមិនឃើញសិស្ស' : 'មិនមានសិស្សក្នុងមុខវិជ្ជានេះ'}
                  </p>
                ) : pickerFiltered.map(s => {
                  const accent = accentFor(s.id);
                  return (
                    <button key={s.id} type="button" className={cardStyles.pickerItem} onClick={() => choosePickerStudent(s.id)}>
                      {s.photoUrl ? (
                        <img src={s.photoUrl} alt={s.name} className={cardStyles.pickerAvatar} style={{ objectFit: 'cover' }} />
                      ) : (
                        <div className={cardStyles.pickerAvatar} style={{ background: `linear-gradient(135deg, ${accent.color}, ${accent.light})` }}>
                          {initials(s.name)}
                        </div>
                      )}
                      <div className={cardStyles.studentTitleWrap}>
                        <div className={cardStyles.studentName}>{s.name}</div>
                        <span className={cardStyles.studentCode}>{s.studentCode}</span>
                      </div>
                      <span className={cardStyles.pickerArrow}>→</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
