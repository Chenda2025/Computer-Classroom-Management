'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { parsePermissions, canInsert, canWrite, canDelete } from '../../../lib/permissions';
import { useRouter } from 'next/navigation';
import styles from '../students/students.module.css';
import cardStyles from './exam-requests.module.css';
import ExportModal from './ExportModal';

const STATUS_ACCENT: Record<string, { color: string; light: string }> = {
  PENDING:  { color: '#f59e0b', light: '#fbbf24' },
  APPROVED: { color: '#10b981', light: '#34d399' },
  REJECTED: { color: '#ef4444', light: '#f87171' },
};

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('km-KH', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface StudentRef { id: string; studentCode: string; name: string; gender?: string | null; photoUrl: string | null; }
interface ExamRef { id: string; title: string; course: { name: string }; }
interface Request {
  id: string; studentId: string; examId: string; status: string; note: string | null;
  student: StudentRef; exam: ExamRef; createdAt: string; updatedAt: string;
}
interface Student extends StudentRef { enrollments: { courseId: string }[]; }
interface ExamOption extends ExamRef { courseId: string; }
interface Course { id: string; name: string; }
interface Props { initialRequests: Request[]; students: Student[]; exams: ExamOption[]; courses: Course[]; userRole: string; userPerms: string; }

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  PENDING:  { color: '#92400e', bg: '#fef3c7', label: 'រង់ចាំ' },
  APPROVED: { color: '#047857', bg: '#d1fae5', label: 'អនុម័ត' },
  REJECTED: { color: '#dc2626', bg: '#fee2e2', label: 'បដិសេធ' },
};

export default function ExamRequestsClient({ initialRequests, students, exams, courses, userRole, userPerms }: Props) {
  const permMap = useMemo(() => parsePermissions(userPerms), [userPerms]);
  const router = useRouter();
  const canIns = canInsert(permMap, 'exam-requests', userRole);
  const canWri = canWrite(permMap, 'exam-requests', userRole);
  const canDel = canDelete(permMap, 'exam-requests', userRole);
  const [requests, setRequests] = useState<Request[]>(initialRequests);
  useEffect(() => { setRequests(initialRequests); }, [initialRequests]);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  useEffect(() => {
    const saved = localStorage.getItem('examRequestViewMode') as 'table' | 'card' | null;
    if (saved === 'card' || saved === 'table') setViewMode(saved);
  }, []);
  const switchViewMode = (mode: 'table' | 'card') => {
    setViewMode(mode);
    localStorage.setItem('examRequestViewMode', mode);
  };
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ courseId: '', studentIds: [] as string[], examId: '', note: '' });
  const [studentSearch, setStudentSearch] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [examsLoading, setExamsLoading] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const examsLoadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (examsLoadingTimer.current) clearTimeout(examsLoadingTimer.current);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const studentsInCourse = useMemo(
    () => students.filter(s => s.enrollments.some(en => en.courseId === form.courseId)),
    [students, form.courseId]
  );
  const examsInCourse = useMemo(
    () => exams.filter(e => e.courseId === form.courseId),
    [exams, form.courseId]
  );

  const courseStudentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => s.enrollments.forEach(en => {
      counts[en.courseId] = (counts[en.courseId] ?? 0) + 1;
    }));
    return counts;
  }, [students]);

  const coursesWithRequests = useMemo(() => {
    const names = new Set(requests.map(r => r.exam.course.name));
    return courses.filter(c => names.has(c.name));
  }, [courses, requests]);

  const filteredCourseOptions = useMemo(() => {
    if (!dropdownSearch.trim()) return coursesWithRequests;
    const q = dropdownSearch.toLowerCase();
    return coursesWithRequests.filter(c => c.name.toLowerCase().includes(q));
  }, [coursesWithRequests, dropdownSearch]);

  const selectCourse = (courseId: string) => {
    setForm({ courseId, studentIds: [], examId: '', note: form.note });
    if (examsLoadingTimer.current) clearTimeout(examsLoadingTimer.current);
    if (!courseId) { setExamsLoading(false); return; }
    setExamsLoading(true);
    examsLoadingTimer.current = setTimeout(() => setExamsLoading(false), 350);
  };

  const filtered = useMemo(() => {
    let result = requests;
    if (filterCourse) {
      const courseName = courses.find(c => c.id === filterCourse)?.name;
      if (courseName) result = result.filter(r => r.exam.course.name === courseName);
    }
    const q = search.toLowerCase().trim();
    if (!q) return result;
    return result.filter(r =>
      r.student.name.toLowerCase().includes(q) ||
      r.exam.title.toLowerCase().includes(q) ||
      r.student.studentCode.toLowerCase().includes(q)
    );
  }, [requests, search, filterCourse, courses]);

  const groupedRequests = useMemo(() => {
    const groups: Record<string, Request[]> = {};
    filtered.forEach(r => {
      const c = r.exam.course.name;
      if (!groups[c]) groups[c] = [];
      groups[c].push(r);
    });
    return groups;
  }, [filtered]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/exam-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: form.studentIds, examId: form.examId, note: form.note }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'មានបញ្ហាកើតឡើង'); return; }
      setRequests(prev => [...data, ...prev]);
      setModal(false);
      setForm({ courseId: '', studentIds: [], examId: '', note: '' });
      window.location.reload();
    } finally { setSubmitting(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/exam-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      setRequests(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
      window.location.reload();
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/exam-requests/${id}`, { method: 'DELETE' });
    setRequests(prev => prev.filter(r => r.id !== id));
    window.location.reload();
  };

  return (
    <div className="animate-fade-in">
      <div className={styles.pageHeader}>
        <div>
          <h2>ស្នើរសូមប្រឡង</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
            សំណើសរុប: <strong style={{ color: 'var(--color-accent)' }}>{requests.length}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {(userRole === 'ADMIN' || userRole === 'MONITOR') && (
            <button
              className={styles.exportHeaderBtn}
              onClick={() => setExportModal(true)}
              disabled={filtered.length === 0}
            >
              📤 ទាញយករបាយការណ៍
            </button>
          )}
          {canIns && <button className="btn-primary" onClick={() => { setError(''); setStep(1); setStudentSearch(''); setForm({ courseId: '', studentIds: [], examId: '', note: '' }); setModal(true); }}>+ ស្នើរសូម</button>}
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>⌕</span>
          <input type="text" className={styles.searchInput}
            placeholder="ស្វែងរកតាមឈ្មោះ, ប្រឡង..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className={cardStyles.courseDropdown} ref={dropdownRef}>
          <button
            type="button"
            className={`${cardStyles.courseDropdownTrigger} ${filterCourse ? cardStyles.courseDropdownTriggerActive : ''}`}
            onClick={() => { setDropdownOpen(o => !o); if (!dropdownOpen) setDropdownSearch(''); }}
          >
            <span>📖</span>
            <span className={cardStyles.courseDropdownLabel}>
              {filterCourse ? courses.find(c => c.id === filterCourse)?.name : 'វគ្គទាំងអស់'}
            </span>
            {filterCourse ? (
              <span
                className={cardStyles.courseDropdownClear}
                onClick={e => { e.stopPropagation(); setFilterCourse(''); setDropdownOpen(false); }}
              >✕</span>
            ) : (
              <span className={cardStyles.courseDropdownCaret}>{dropdownOpen ? '▲' : '▼'}</span>
            )}
          </button>
          {dropdownOpen && (
            <div className={cardStyles.courseDropdownPanel}>
              <div className={cardStyles.courseDropdownSearch}>
                <span className={cardStyles.courseDropdownSearchIcon}>⌕</span>
                <input
                  type="text"
                  autoFocus
                  className={cardStyles.courseDropdownSearchInput}
                  placeholder="ស្វែងរកវគ្គ..."
                  value={dropdownSearch}
                  onChange={e => setDropdownSearch(e.target.value)}
                />
              </div>
              <div className={cardStyles.courseDropdownList}>
                <button
                  type="button"
                  className={`${cardStyles.courseDropdownItem} ${!filterCourse ? cardStyles.courseDropdownItemActive : ''}`}
                  onClick={() => { setFilterCourse(''); setDropdownOpen(false); }}
                >
                  <span className={cardStyles.courseDropdownItemName}>វគ្គទាំងអស់</span>
                  <span className={cardStyles.courseDropdownCount}>{requests.length}</span>
                </button>
                {filteredCourseOptions.map(c => {
                  const count = requests.filter(r => r.exam.course.name === c.name).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`${cardStyles.courseDropdownItem} ${filterCourse === c.id ? cardStyles.courseDropdownItemActive : ''}`}
                      onClick={() => { setFilterCourse(c.id); setDropdownOpen(false); }}
                    >
                      <span className={cardStyles.courseDropdownItemName}>{c.name}</span>
                      <span className={cardStyles.courseDropdownCount}>{count}</span>
                    </button>
                  );
                })}
                {filteredCourseOptions.length === 0 && (
                  <div className={cardStyles.courseDropdownEmpty}>រកមិនឃើញ</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewToggleBtn} ${viewMode === 'table' ? styles.viewToggleActive : ''}`}
            onClick={() => switchViewMode('table')}
            title="មើលជាតារាង"
          >
            ☰
          </button>
          <button
            className={`${styles.viewToggleBtn} ${viewMode === 'card' ? styles.viewToggleActive : ''}`}
            onClick={() => switchViewMode('card')}
            title="មើលជាកាត"
          >
            ⊞
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <p>{search ? 'រកមិនឃើញ' : 'មិនទាន់មានការស្នើរសូមទេ'}</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th>#</th>
                <th>សិស្ស</th>
                <th>ប្រឡង</th>
                <th>វគ្គសិក្សា</th>
                <th>ចំណាំ</th>
                <th>ស្ថានភាព</th>
                <th>កាលបរិច្ឆេទ</th>
                {(canWri || canDel) && <th>ការគ្រប់គ្រង</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.PENDING;
                return (
                  <tr key={r.id} className={styles.row}>
                    <td className={styles.indexCell}>{i + 1}</td>
                    <td className={styles.nameCell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {r.student.photoUrl ? (
                          <img src={r.student.photoUrl} alt="" className={styles.avatar} style={{ objectFit: 'cover' }} />
                        ) : (
                          <div className={styles.avatarPlaceholder}>{initials(r.student.name)}</div>
                        )}
                        <div>
                          <div>{r.student.name}</div>
                          <span className={styles.codeBadge}>{r.student.studentCode}</span>
                        </div>
                      </div>
                    </td>
                    <td>{r.exam.title}</td>
                    <td className={styles.mutedCell}>{r.exam.course.name}</td>
                    <td className={styles.mutedCell}>{r.note ?? '—'}</td>
                    <td>
                      <span className={cardStyles.statusBadge} style={{ background: s.bg, color: s.color }}>
                        <span className={cardStyles.statusDot} />
                        {s.label}
                      </span>
                    </td>
                    <td className={styles.mutedCell}>{formatDate(r.createdAt)}</td>
                    {(canWri || canDel) && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {canWri && r.status !== 'APPROVED' && (
                            <button className={`${cardStyles.statusBtn} ${cardStyles.approveBtn}`} onClick={() => updateStatus(r.id, 'APPROVED')}>✓ អនុម័ត</button>
                          )}
                          {canWri && r.status !== 'REJECTED' && (
                            <button className={`${cardStyles.statusBtn} ${cardStyles.rejectBtn}`} onClick={() => updateStatus(r.id, 'REJECTED')}>✗ បដិសេធ</button>
                          )}
                          {canDel && <button className={`${cardStyles.iconBtn} ${cardStyles.deleteBtn}`} onClick={() => handleDelete(r.id)} title="លុប">🗑️</button>}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {Object.entries(groupedRequests).map(([courseName, reqs]) => (
            <div key={courseName} className="animate-fade-in">
              <h3 style={{ marginBottom: '16px', color: 'var(--color-text-primary)', borderBottom: '2px solid var(--color-border)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem' }}>
                <span style={{ fontSize: '1.4rem' }}>📖</span> {courseName}
                <span style={{ fontSize: '0.85rem', background: 'var(--color-primary-light, #e0e7ff)', color: 'var(--color-primary)', padding: '3px 10px', borderRadius: '20px', marginLeft: 'auto', fontWeight: 600 }}>
                  {reqs.length} សំណើ
                </span>
              </h3>
              <div className={cardStyles.requestGrid}>
                {reqs.map((r, i) => {
                  const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.PENDING;
                  const accent = STATUS_ACCENT[r.status] ?? STATUS_ACCENT.PENDING;
                  return (
                    <div
                      key={r.id}
                      className={cardStyles.requestCard}
                      style={{ '--card-accent': accent.color, '--card-accent-light': accent.light, animationDelay: `${i * 40}ms` } as React.CSSProperties}
                    >
                      <div className={cardStyles.cardBody}>
                        <div className={cardStyles.cardTopRow}>
                          {r.student.photoUrl ? (
                            <img src={r.student.photoUrl} alt={r.student.name} className={cardStyles.studentAvatar} style={{ objectFit: 'cover' }} />
                          ) : (
                            <div className={cardStyles.studentAvatar} style={{ background: `linear-gradient(135deg, ${accent.color}, ${accent.light})` }}>
                              {initials(r.student.name)}
                            </div>
                          )}
                          <div className={cardStyles.studentTitleWrap}>
                            <div className={cardStyles.studentName}>{r.student.name}</div>
                            <span className={cardStyles.studentCode}>{r.student.studentCode}</span>
                          </div>
                        </div>

                        <div className={cardStyles.examInfo}>
                          <span className={cardStyles.examTitle}>{r.exam.title}</span>
                          <span className={cardStyles.courseTag}>{r.exam.course.name}</span>
                        </div>

                        {r.note && <div className={cardStyles.noteText}>📝 {r.note}</div>}

                        <div className={cardStyles.badgeRow} style={{ marginTop: 12 }}>
                          <span className={cardStyles.statusBadge} style={{ background: s.bg, color: s.color }}>
                            <span className={cardStyles.statusDot} />
                            {s.label}
                          </span>
                        </div>
                      </div>

                      {(canWri || canDel) && (
                        <div className={cardStyles.cardActions}>
                          {canWri && r.status !== 'APPROVED' && (
                            <button className={`${cardStyles.statusBtn} ${cardStyles.approveBtn}`} onClick={() => updateStatus(r.id, 'APPROVED')}>✓ អនុម័ត</button>
                          )}
                          {canWri && r.status !== 'REJECTED' && (
                            <button className={`${cardStyles.statusBtn} ${cardStyles.rejectBtn}`} onClick={() => updateStatus(r.id, 'REJECTED')}>✗ បដិសេធ</button>
                          )}
                          {canDel && <button className={`${cardStyles.iconBtn} ${cardStyles.deleteBtn}`} onClick={() => handleDelete(r.id)} title="លុប">🗑️</button>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className={styles.modalOverlay} onClick={() => !submitting && setModal(false)}>
          <div
            className={`glass-panel ${styles.modalCard}`}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: step === 1 ? 660 : 520 }}
          >
            {/* ── Modal header ── */}
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {step === 2 && (
                  <button
                    type="button"
                    className={styles.closeBtn}
                    style={{ fontSize: '0.85rem', marginRight: 4 }}
                    onClick={() => { setStep(1); setStudentSearch(''); setForm(f => ({ ...f, studentIds: [], examId: '' })); }}
                  >←</button>
                )}
                <div>
                  <h3>ស្នើរសូមប្រឡង</h3>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    ជំហាន {step}/2 — {step === 1 ? 'ជ្រើសរើសវគ្គសិក្សា' : 'ជ្រើសរើសសិស្ស និង ប្រឡង'}
                  </div>
                </div>
              </div>
              <button className={styles.closeBtn} onClick={() => setModal(false)} disabled={submitting}>✕</button>
            </div>

            {/* ── Step 1: Course picker ── */}
            {step === 1 && (
              <div style={{ padding: '16px 22px 24px' }}>
                <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                  ជ្រើសរើសវគ្គសិក្សាដែលចង់ស្នើរសូម:
                </p>
                <div className={cardStyles.coursePickGrid}>
                  {courses.map((c, i) => {
                    const COLORS = ['#6366f1','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316'];
                    const color = COLORS[i % COLORS.length];
                    const count = courseStudentCounts[c.id] ?? 0;
                    const examCount = exams.filter(e => e.courseId === c.id).length;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`${cardStyles.coursePickCard} ${form.courseId === c.id ? cardStyles.coursePickCardSelected : ''}`}
                        style={{ '--pick-color': color } as React.CSSProperties}
                        onClick={() => { selectCourse(c.id); setStep(2); setStudentSearch(''); }}
                        disabled={count === 0}
                      >
                        <div className={cardStyles.coursePickAvatar} style={{ background: `linear-gradient(135deg,${color},${color}aa)` }}>
                          {c.name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()}
                        </div>
                        <div className={cardStyles.coursePickName}>{c.name}</div>
                        <div className={cardStyles.coursePickMeta}>
                          <span>👥 {count} នាក់</span>
                          <span>📝 {examCount} ប្រឡង</span>
                        </div>
                        {count === 0 && <span className={cardStyles.coursePickNoStudents}>គ្មានសិស្ស</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Step 2: Student + exam picker ── */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className={styles.form}>
                {error && <div className={styles.formError}>{error}</div>}

                {/* Selected course badge */}
                <div className={cardStyles.selectedCourseBadge}>
                  📚 {courses.find(c => c.id === form.courseId)?.name}
                </div>

                {/* Student picker */}
                <div className={styles.formGroup}>
                  <label>
                    សិស្ស *
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>
                      {' '}({form.studentIds.length} នាក់ បានជ្រើស)
                    </span>
                  </label>

                  <div className={cardStyles.studentPickerTools}>
                    <div className={cardStyles.studentPickerSearch}>
                      <span>⌕</span>
                      <input
                        type="text"
                        placeholder="ស្វែងរកសិស្ស..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <button type="button" className={cardStyles.selectAllBtn}
                      onClick={() => setForm(p => ({ ...p, studentIds: studentsInCourse.map(s => s.id) }))}>
                      ទាំងអស់
                    </button>
                    {form.studentIds.length > 0 && (
                      <button type="button" className={cardStyles.deselectBtn}
                        onClick={() => setForm(p => ({ ...p, studentIds: [] }))}>
                        ដោះជ្រើស
                      </button>
                    )}
                  </div>

                  <div className={cardStyles.studentPickerList}>
                    {studentsInCourse.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        មិនមានសិស្សចុះឈ្មោះ
                      </div>
                    ) : (
                      studentsInCourse
                        .filter(s => !studentSearch ||
                          s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                          s.studentCode.toLowerCase().includes(studentSearch.toLowerCase()))
                        .map(s => {
                          const selected = form.studentIds.includes(s.id);
                          return (
                            <label key={s.id} className={`${cardStyles.studentPickItem} ${selected ? cardStyles.studentPickItemSelected : ''}`}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={e => {
                                  if (e.target.checked) setForm(p => ({ ...p, studentIds: [...p.studentIds, s.id] }));
                                  else setForm(p => ({ ...p, studentIds: p.studentIds.filter(id => id !== s.id) }));
                                }}
                                style={{ margin: 0, width: 15, height: 15, accentColor: 'var(--color-accent)', flexShrink: 0 }}
                              />
                              {s.photoUrl ? (
                                <img src={s.photoUrl} alt="" className={cardStyles.studentPickAvatar} />
                              ) : (
                                <div className={`${cardStyles.studentPickAvatar} ${cardStyles.studentPickAvatarFallback}`}>
                                  {initials(s.name)}
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className={cardStyles.studentPickName}>{s.name}</div>
                                <div className={cardStyles.studentPickCode}>{s.studentCode}</div>
                              </div>
                            </label>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* Exam select */}
                <div className={styles.formGroup}>
                  <label>ប្រឡង *</label>
                  <select className={styles.input} required disabled={examsLoading}
                    value={form.examId} onChange={e => setForm(p => ({ ...p, examId: e.target.value }))}>
                    {examsLoading ? (
                      <option value="">⏳ កំពុងផ្ទុក...</option>
                    ) : (
                      <>
                        <option value="">-- ជ្រើសរើសប្រឡង --</option>
                        {examsInCourse.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                      </>
                    )}
                  </select>
                  {!examsLoading && examsInCourse.length === 0 && (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                      មិនមានប្រឡងសម្រាប់វគ្គនេះ
                    </div>
                  )}
                </div>

                {/* Note */}
                <div className={styles.formGroup}>
                  <label>ចំណាំ</label>
                  <textarea className={`${styles.input} ${styles.textarea}`} rows={2}
                    placeholder="ចំណាំ..."
                    value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
                </div>

                <div className={styles.formActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setModal(false)} disabled={submitting}>
                    បោះបង់
                  </button>
                  <button type="submit" className="btn-primary"
                    disabled={submitting || form.studentIds.length === 0 || !form.examId}>
                    {submitting ? 'កំពុងរក្សាទុក...' : `ស្នើរសូម (${form.studentIds.length} នាក់)`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {exportModal && (
        <ExportModal
          requests={filtered}
          onClose={() => setExportModal(false)}
        />
      )}
    </div>
  );
}
