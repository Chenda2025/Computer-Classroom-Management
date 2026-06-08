'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
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

interface StudentRef { id: string; studentCode: string; name: string; gender?: string | null; photoUrl: string | null; }
interface ExamRef { id: string; title: string; course: { name: string }; }
interface Request {
  id: string; studentId: string; examId: string; status: string; note: string | null;
  student: StudentRef; exam: ExamRef; createdAt: string; updatedAt: string;
}
interface Student extends StudentRef { enrollments: { courseId: string }[]; }
interface ExamOption extends ExamRef { courseId: string; }
interface Course { id: string; name: string; }
interface Props { initialRequests: Request[]; students: Student[]; exams: ExamOption[]; courses: Course[]; userRole: string; }

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  PENDING:  { color: '#92400e', bg: '#fef3c7', label: 'រង់ចាំ' },
  APPROVED: { color: '#047857', bg: '#d1fae5', label: 'អនុម័ត' },
  REJECTED: { color: '#dc2626', bg: '#fee2e2', label: 'បដិសេធ' },
};

export default function ExamRequestsClient({ initialRequests, students, exams, courses, userRole }: Props) {
  const isAdmin = userRole === 'ADMIN';
  const [requests, setRequests] = useState<Request[]>(initialRequests);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ courseId: '', studentId: '', examId: '', note: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [examsLoading, setExamsLoading] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const examsLoadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (examsLoadingTimer.current) clearTimeout(examsLoadingTimer.current);
  }, []);

  const studentsInCourse = useMemo(
    () => students.filter(s => s.enrollments.some(en => en.courseId === form.courseId)),
    [students, form.courseId]
  );
  const examsInCourse = useMemo(
    () => exams.filter(e => e.courseId === form.courseId),
    [exams, form.courseId]
  );
  const selectedStudent = useMemo(
    () => students.find(s => s.id === form.studentId) ?? null,
    [students, form.studentId]
  );

  const selectCourse = (courseId: string) => {
    setForm({ courseId, studentId: '', examId: '', note: form.note });
    if (examsLoadingTimer.current) clearTimeout(examsLoadingTimer.current);
    if (!courseId) { setExamsLoading(false); return; }
    setExamsLoading(true);
    examsLoadingTimer.current = setTimeout(() => setExamsLoading(false), 350);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return requests;
    return requests.filter(r =>
      r.student.name.toLowerCase().includes(q) ||
      r.exam.title.toLowerCase().includes(q) ||
      r.student.studentCode.toLowerCase().includes(q)
    );
  }, [requests, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/exam-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: form.studentId, examId: form.examId, note: form.note }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'មានបញ្ហាកើតឡើង'); return; }
      setRequests(prev => [data, ...prev]);
      setModal(false);
      setForm({ courseId: '', studentId: '', examId: '', note: '' });
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
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/exam-requests/${id}`, { method: 'DELETE' });
    setRequests(prev => prev.filter(r => r.id !== id));
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
          {(isAdmin || userRole === 'MONITOR') && (
            <button
              className={styles.exportHeaderBtn}
              onClick={() => setExportModal(true)}
              disabled={filtered.length === 0}
            >
              📤 ទាញយករបាយការណ៍
            </button>
          )}
          {isAdmin && <button className="btn-primary" onClick={() => { setError(''); setModal(true); }}>+ ស្នើរសូម</button>}
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>⌕</span>
          <input type="text" className={styles.searchInput}
            placeholder="ស្វែងរកតាមឈ្មោះ, ប្រឡង..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <p>{search ? 'រកមិនឃើញ' : 'មិនទាន់មានការស្នើរសូមទេ'}</p>
        </div>
      ) : (
        <div className={cardStyles.requestGrid}>
          {filtered.map((r, i) => {
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

                {isAdmin && (
                  <div className={cardStyles.cardActions}>
                    {r.status !== 'APPROVED' && (
                      <button className={`${cardStyles.statusBtn} ${cardStyles.approveBtn}`} onClick={() => updateStatus(r.id, 'APPROVED')}>✓ អនុម័ត</button>
                    )}
                    {r.status !== 'REJECTED' && (
                      <button className={`${cardStyles.statusBtn} ${cardStyles.rejectBtn}`} onClick={() => updateStatus(r.id, 'REJECTED')}>✗ បដិសេធ</button>
                    )}
                    <button className={`${cardStyles.iconBtn} ${cardStyles.deleteBtn}`} onClick={() => handleDelete(r.id)} title="លុប">🗑️</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className={styles.modalOverlay} onClick={() => !submitting && setModal(false)}>
          <div className={`glass-panel ${styles.modalCard}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>ស្នើរសូមប្រឡង</h3>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.formError}>{error}</div>}
              <div className={styles.formGroup}>
                <label>វគ្គសិក្សា *</label>
                <select className={styles.input} required
                  value={form.courseId} onChange={e => selectCourse(e.target.value)}>
                  <option value="">-- ជ្រើសរើសវគ្គសិក្សា --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>សិស្ស *</label>
                <select className={styles.input} required disabled={!form.courseId}
                  value={form.studentId} onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))}>
                  <option value="">{form.courseId ? '-- ជ្រើសរើសសិស្ស --' : '-- សូមជ្រើសរើសវគ្គសិក្សាមុន --'}</option>
                  {studentsInCourse.map(s => <option key={s.id} value={s.id}>{s.name} ({s.studentCode})</option>)}
                </select>
                {form.courseId && studentsInCourse.length === 0 && (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: 4 }}>មិនមានសិស្សចុះឈ្មោះក្នុងវគ្គនេះទេ</div>
                )}
                {selectedStudent && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                    {selectedStudent.photoUrl ? (
                      <img src={selectedStudent.photoUrl} alt={selectedStudent.name} className={styles.avatar} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>{initials(selectedStudent.name)}</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>{selectedStudent.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{selectedStudent.studentCode}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label>ប្រឡង *</label>
                <select className={styles.input} required disabled={!form.courseId || examsLoading}
                  value={form.examId} onChange={e => setForm(p => ({ ...p, examId: e.target.value }))}>
                  {examsLoading ? (
                    <option value="">⏳ កំពុងផ្ទុកប្រឡង...</option>
                  ) : (
                    <>
                      <option value="">{form.courseId ? '-- ជ្រើសរើសប្រឡង --' : '-- សូមជ្រើសរើសវគ្គសិក្សាមុន --'}</option>
                      {examsInCourse.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </>
                  )}
                </select>
                {!examsLoading && form.courseId && examsInCourse.length === 0 && (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: 4 }}>មិនមានប្រឡងសម្រាប់វគ្គនេះទេ</div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label>ចំណាំ</label>
                <textarea className={`${styles.input} ${styles.textarea}`} rows={2}
                  placeholder="ចំណាំ..."
                  value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setModal(false)} disabled={submitting}>បោះបង់</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'កំពុងរក្សាទុក...' : 'ស្នើរសូម'}
                </button>
              </div>
            </form>
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
