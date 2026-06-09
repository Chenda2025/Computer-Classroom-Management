'use client';
import { useState, useMemo } from 'react';
import styles from '../students/students.module.css';
import CertificatePrintModal from './CertificatePrintModal';
import ExportModal from './ExportModal';

interface ExamResult { id: string; score: number; createdAt: string; exam: { course: { name: string }, questions?: { points: number }[] } }
interface ExamParticipation { id: string; currentScore: number; createdAt: string; session: { exam: { course: { name: string }, questions?: { points: number }[] } }; }
interface Enrollment { id: string; createdAt: string; course: { name: string }; }
interface Student { id: string; studentCode: string; name: string; photoUrl?: string | null; gender?: string | null; dateOfBirth?: string | null; grade?: string | null; enrollments?: Enrollment[]; examParticipations?: ExamParticipation[]; results?: ExamResult[]; }
interface Certificate {
  id: string; title: string; issuedDate: string; description: string | null;
  studentId: string; student: Student; createdAt: string; updatedAt: string;
}
interface Props { initialCertificates: Certificate[]; students: Student[]; userRole: string; }

const EMPTY = { studentId: '', title: '', issuedDate: '', description: '' };

export default function CertificatesClient({ initialCertificates, students, userRole }: Props) {
  const isAdmin = userRole === 'ADMIN';
  const [certs, setCerts] = useState<Certificate[]>(initialCertificates);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [printTarget, setPrintTarget] = useState<Certificate | null>(null);
  const [showExport, setShowExport] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return certs;
    return certs.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.student.name.toLowerCase().includes(q) ||
      c.student.studentCode.toLowerCase().includes(q)
    );
  }, [certs, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'មានបញ្ហាកើតឡើង'); return; }
      setCerts(prev => [data, ...prev]);
      setModal(false);
      setForm(EMPTY);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try {
      await fetch(`/api/certificates/${deleteTarget}`, { method: 'DELETE' });
      setCerts(prev => prev.filter(c => c.id !== deleteTarget));
    } finally { setDeleteTarget(null); setDeleting(false); }
  };

  const set = (k: keyof typeof EMPTY, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="animate-fade-in">
      <div className={styles.pageHeader}>
        <div>
          <h2>វិញ្ញាបនបត្រ</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
            សរុប: <strong style={{ color: 'var(--color-accent)' }}>{certs.length}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => setShowExport(true)}>📤 ទាញយករបាយការណ៍</button>
          {isAdmin && <button className="btn-primary" onClick={() => { setError(''); setForm(EMPTY); setModal(true); }}>+ ចេញវិញ្ញាបនបត្រ</button>}
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>⌕</span>
          <input type="text" className={styles.searchInput} placeholder="ស្វែងរកតាមឈ្មោះ, លេខកូដ..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className={styles.tableWrapper}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎓</div>
            <p>{search ? 'រកមិនឃើញ' : 'មិនទាន់មានវិញ្ញាបនបត្រទេ'}</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr><th>#</th><th>ចំណងជើង</th><th>សិស្ស</th><th>ថ្ងៃចេញ</th><th>ការពិពណ៌នា</th>{isAdmin && <th>ការគ្រប់គ្រង</th>}</tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className={styles.row}>
                  <td className={styles.indexCell}>{i + 1}</td>
                  <td className={styles.nameCell}>{c.title}</td>
                  <td>
                    <div>{c.student.name}</div>
                    <div className={styles.mutedCell} style={{ fontSize: '0.75rem' }}>{c.student.studentCode}</div>
                  </td>
                  <td className={styles.mutedCell}>{c.issuedDate}</td>
                  <td className={styles.mutedCell}>{c.description ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className={styles.actionBtn} onClick={() => setPrintTarget(c)} title="មើល និងបោះពុម្ព">👁️/🖨️</button>
                      {isAdmin && (
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => setDeleteTarget(c.id)} title="លុប">🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className={styles.modalOverlay} onClick={() => !submitting && setModal(false)}>
          <div className={`glass-panel ${styles.modalCard}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>ចេញវិញ្ញាបនបត្រ</h3>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.formError}>{error}</div>}
              <div className={styles.formGroup}>
                <label>សិស្ស *</label>
                <select className={styles.input} required value={form.studentId} onChange={e => set('studentId', e.target.value)}>
                  <option value="">-- ជ្រើសសិស្ស --</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.studentCode})</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>ចំណងជើងវិញ្ញាបនបត្រ *</label>
                <input type="text" className={styles.input} required autoFocus
                  placeholder="ឧ. វិញ្ញាបនបត្របញ្ចប់វគ្គ"
                  value={form.title} onChange={e => set('title', e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>ថ្ងៃចេញ *</label>
                <input type="date" className={styles.input} required
                  value={form.issuedDate} onChange={e => set('issuedDate', e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>ការពិពណ៌នា</label>
                <textarea className={`${styles.input} ${styles.textarea}`} rows={2}
                  value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setModal(false)} disabled={submitting}>បោះបង់</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'កំពុងរក្សាទុក...' : 'ចេញវិញ្ញាបនបត្រ'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={`glass-panel ${styles.confirmCard}`} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#f87171' }}>⚠️ លុបវិញ្ញាបនបត្រ?</h3>
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

      {printTarget && (
        <CertificatePrintModal
          certificate={printTarget}
          onClose={() => setPrintTarget(null)}
        />
      )}

      {showExport && (
        <ExportModal
          data={filtered}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
