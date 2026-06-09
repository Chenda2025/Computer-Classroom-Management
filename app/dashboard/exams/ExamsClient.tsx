'use client';
import { useState, useMemo } from 'react';
import { parsePermissions, canInsert, canWrite, canDelete } from '../../../lib/permissions';
import styles from '../students/students.module.css';
import cardStyles from './exams.module.css';

const EXAM_COLORS = [
  { color: '#6366f1', light: '#818cf8', bg: '#eef2ff' },
  { color: '#10b981', light: '#34d399', bg: '#ecfdf5' },
  { color: '#f59e0b', light: '#fbbf24', bg: '#fffbeb' },
  { color: '#3b82f6', light: '#60a5fa', bg: '#eff6ff' },
  { color: '#8b5cf6', light: '#a78bfa', bg: '#f5f3ff' },
  { color: '#ec4899', light: '#f472b6', bg: '#fdf2f8' },
  { color: '#14b8a6', light: '#2dd4bf', bg: '#f0fdfa' },
  { color: '#f97316', light: '#fb923c', bg: '#fff7ed' },
];

function examColor(index: number) {
  return EXAM_COLORS[index % EXAM_COLORS.length];
}

interface Course { id: string; name: string; }
interface Exam {
  id: string; title: string; type: string; isActive: boolean;
  courseId: string;
  course: { id: string; name: string };
  _count: { questions: number; results: number; examRequests: number };
  createdAt: string; updatedAt: string;
}
interface Props { initialExams: Exam[]; courses: Course[]; userRole: string; userPerms: string; }

const EMPTY = { title: '', type: 'OFFLINE', courseId: '', isActive: true };

export default function ExamsClient({ initialExams, courses, userRole, userPerms }: Props) {
  const permMap = useMemo(() => parsePermissions(userPerms), [userPerms]);
  const canIns = canInsert(permMap, 'exams', userRole);
  const canWri = canWrite(permMap, 'exams', userRole);
  const canDel = canDelete(permMap, 'exams', userRole);
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return exams;
    return exams.filter(e => e.title.toLowerCase().includes(q) || e.course.name.toLowerCase().includes(q));
  }, [exams, search]);

  const openAdd = () => { setForm(EMPTY); setEditingId(null); setError(''); setModal(true); };
  const openEdit = (e: Exam) => {
    setForm({ title: e.title, type: e.type, courseId: e.courseId, isActive: e.isActive });
    setEditingId(e.id); setError(''); setModal(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSubmitting(true); setError('');
    try {
      const url = editingId ? `/api/exams/${editingId}` : '/api/exams';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'មានបញ្ហាកើតឡើង'); return; }
      if (editingId) setExams(prev => prev.map(e => e.id === editingId ? { ...e, ...data } : e));
      else setExams(prev => [data, ...prev]);
      setModal(false);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try {
      await fetch(`/api/exams/${deleteTarget}`, { method: 'DELETE' });
      setExams(prev => prev.filter(e => e.id !== deleteTarget));
    } finally { setDeleteTarget(null); setDeleting(false); }
  };

  const startLiveExam = async (examId: string) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/live-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      window.location.href = `/dashboard/live-exams/${data.id}/admin`;
    } catch (error) {
      alert('មានបញ្ហាកើតឡើង');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className={styles.pageHeader}>
        <div>
          <h2>ការប្រឡង</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
            ប្រឡងសរុប: <strong style={{ color: 'var(--color-accent)' }}>{exams.length}</strong>
          </p>
        </div>
        {canIns && <button className="btn-primary" onClick={openAdd}>+ បន្ថែមប្រឡង</button>}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>⌕</span>
          <input type="text" className={styles.searchInput}
            placeholder="ស្វែងរកប្រឡង..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📝</div>
          <p>{search ? 'រកមិនឃើញប្រឡង' : 'មិនទាន់មានប្រឡងទេ'}</p>
          {canIns && !search && <button className="btn-primary" onClick={openAdd} style={{ marginTop: 20 }}>បន្ថែមប្រឡងដំបូង</button>}
        </div>
      ) : (
        <div className={cardStyles.examGrid}>
          {filtered.map((e, i) => {
            const clr = examColor(i);
            return (
              <div
                key={e.id}
                className={cardStyles.examCard}
                style={{ '--card-accent': clr.color, '--card-accent-light': clr.light, animationDelay: `${i * 40}ms` } as React.CSSProperties}
              >
                <div className={cardStyles.cardBody}>
                  <div className={cardStyles.cardTopRow}>
                    <div className={cardStyles.examIcon} style={{ background: `linear-gradient(135deg, ${clr.color}, ${clr.light})` }}>
                      {e.type === 'ONLINE' ? '🌐' : '📝'}
                    </div>
                    <div className={cardStyles.examTitleWrap}>
                      <div className={cardStyles.examTitle}>{e.title}</div>
                      <span className={cardStyles.courseTag}>{e.course.name}</span>
                    </div>
                  </div>
                  <div className={cardStyles.badgeRow}>
                    <span className={cardStyles.typeBadge} style={{ background: clr.bg, color: clr.color }}>{e.type}</span>
                    <span className={e.isActive ? cardStyles.statusActive : cardStyles.statusInactive}>
                      {e.isActive ? '✓ សកម្ម' : 'បិទ'}
                    </span>
                  </div>
                </div>

                <div className={cardStyles.cardMetrics}>
                  <div className={cardStyles.metric}>
                    <span className={cardStyles.metricIcon}>❓</span>
                    <span className={cardStyles.metricVal} style={{ color: clr.color }}>{e._count.questions}</span>
                    <span className={cardStyles.metricLbl}>សំណួរ</span>
                  </div>
                  <div className={cardStyles.metricDivider} />
                  <div className={cardStyles.metric}>
                    <span className={cardStyles.metricIcon}>📨</span>
                    <span className={cardStyles.metricVal} style={{ color: '#2563eb' }}>{e._count.examRequests}</span>
                    <span className={cardStyles.metricLbl}>ស្នើសុំ</span>
                  </div>
                  <div className={cardStyles.metricDivider} />
                  <div className={cardStyles.metric}>
                    <span className={cardStyles.metricIcon}>📊</span>
                    <span className={cardStyles.metricVal} style={{ color: '#d97706' }}>{e._count.results}</span>
                    <span className={cardStyles.metricLbl}>លទ្ធផល</span>
                  </div>
                </div>

                {(canIns || canWri || canDel) && (
                  <div className={cardStyles.cardActions}>
                    {canIns && <button className={cardStyles.iconBtn} onClick={() => startLiveExam(e.id)} title="បើកបន្ទប់ប្រឡងអនឡាញ">🌐</button>}
                    <button
                      className={cardStyles.manageBtn}
                      style={{ color: clr.color, borderColor: clr.color + '44', background: clr.bg }}
                      onClick={() => window.location.href = `/dashboard/exams/${e.id}/questions`}
                    >
                      👁️ មើលសំណួរ
                    </button>
                    {canWri && <button className={cardStyles.iconBtn} onClick={() => openEdit(e)} title="កែប្រែ">✏️</button>}
                    {canDel && <button className={`${cardStyles.iconBtn} ${cardStyles.deleteBtn}`} onClick={() => setDeleteTarget(e.id)} title="លុប">🗑️</button>}
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
              <h3>{editingId ? 'កែប្រែប្រឡង' : 'បន្ថែមប្រឡង'}</h3>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.formError}>{error}</div>}
              <div className={styles.formGroup}>
                <label>ចំណងជើងប្រឡង *</label>
                <input type="text" className={styles.input} required autoFocus
                  placeholder="ឧ. ប្រឡងចុងឆមាស"
                  value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className={styles.formGroup}>
                <label>វគ្គសិក្សា *</label>
                <select className={styles.input} required
                  value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))}>
                  <option value="">-- ជ្រើសរើស --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>ប្រភេទ</label>
                  <select className={styles.input}
                    value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    <option value="OFFLINE">OFFLINE</option>
                    <option value="ONLINE">ONLINE</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>ស្ថានភាព</label>
                  <select className={styles.input}
                    value={form.isActive ? 'true' : 'false'}
                    onChange={e => setForm(p => ({ ...p, isActive: e.target.value === 'true' }))}>
                    <option value="true">✓ សកម្ម</option>
                    <option value="false">បិទ</option>
                  </select>
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setModal(false)} disabled={submitting}>បោះបង់</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={`glass-panel ${styles.confirmCard}`} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#f87171' }}>⚠️ លុបប្រឡង?</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 14, lineHeight: 1.7, fontSize: '0.92rem' }}>
              ទិន្នន័យ<strong style={{ color: 'var(--color-text-primary)' }}> មិនអាចស្ដារវិញបានទេ</strong>។
            </p>
            <div className={styles.formActions} style={{ marginTop: 28 }}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)} disabled={deleting}>បោះបង់</button>
              <button className="btn-primary" style={{ background: 'rgba(239,68,68,0.85)' }}
                onClick={handleDelete} disabled={deleting}>{deleting ? 'កំពុងលុប...' : 'លុបចោល'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
