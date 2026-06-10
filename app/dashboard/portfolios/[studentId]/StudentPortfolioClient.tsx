'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { parsePermissions, canInsert, canWrite, canDelete } from '../../../../lib/permissions';
import Link from 'next/link';
import styles from '../../students/students.module.css';
import cardStyles from '../portfolios.module.css';

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

interface Course { id: string; name: string; }
interface StudentInfo { id: string; studentCode: string; name: string; photoUrl?: string | null; }
interface PortfolioItem {
  id: string; title: string; fileUrl: string;
  studentId: string; courseId: string; course: Course;
  createdAt: string; updatedAt: string;
}
interface Props {
  student: StudentInfo; courses: Course[];
  initialPortfolios: PortfolioItem[]; userRole: string; userPerms: string;
}

const EMPTY = { title: '', fileUrl: '', courseId: '' };

export default function StudentPortfolioClient({ student, courses, initialPortfolios, userRole, userPerms }: Props) {
  const permMap = useMemo(() => parsePermissions(userPerms), [userPerms]);
  const canIns = canInsert(permMap, 'portfolios', userRole);
  const canWri = canWrite(permMap, 'portfolios', userRole);
  const canDel = canDelete(permMap, 'portfolios', userRole);
  
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>(initialPortfolios);
  const router = useRouter();
  useEffect(() => { setPortfolios(initialPortfolios); }, [initialPortfolios]);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [fileMode, setFileMode] = useState<'upload' | 'url'>('upload');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewTarget, setViewTarget] = useState<PortfolioItem | null>(null);

  const accent = useMemo(() => accentFor(student.id), [student.id]);

  const uploadFile = async (file: File) => {
    setUploading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload?folder=portfolios', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm(prev => ({ ...prev, fileUrl: data.url }));
      } else {
        setError(data.error || 'បរាជ័យក្នុងការបញ្ចូលឯកសារ');
      }
    } catch {
      setError('មានបញ្ហាក្នុងការបញ្ចូលឯកសារ');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) uploadFile(file);
  };

  const [dragOver, setDragOver] = useState(false);
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragOver(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const openAdd = () => {
    setError(''); setEditingId(null); setForm(EMPTY); setFileMode('upload'); setModal(true);
  };

  const openEdit = (p: PortfolioItem) => {
    setError(''); setEditingId(p.id);
    setForm({ title: p.title, fileUrl: p.fileUrl, courseId: p.courseId });
    setFileMode(p.fileUrl && !/^https?:\/\//i.test(p.fileUrl) ? 'upload' : (p.fileUrl ? 'url' : 'upload'));
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      const url = editingId ? `/api/portfolios/${editingId}` : '/api/portfolios';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, studentId: student.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'មានបញ្ហាកើតឡើង'); return; }
      if (editingId) {
        setPortfolios(prev => prev.map(p => p.id === editingId ? data : p));
      } else {
        setPortfolios(prev => [data, ...prev]);
      }
      setModal(false);
      setEditingId(null);
      setForm(EMPTY);
      window.location.reload();
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try {
      await fetch(`/api/portfolios/${deleteTarget}`, { method: 'DELETE' });
      setPortfolios(prev => prev.filter(p => p.id !== deleteTarget));
      window.location.reload();
    } finally { setDeleteTarget(null); setDeleting(false); }
  };

  const set = (k: keyof typeof EMPTY, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="animate-fade-in">
      <Link href="/dashboard/portfolios" className={cardStyles.backBtn}>← ត្រឡប់ទៅថតសិស្ស</Link>

      <div className={styles.pageHeader} style={{ marginTop: 16 }}>
        <div className={cardStyles.studentHeader}>
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={student.name} className={cardStyles.studentHeaderAvatar} style={{ objectFit: 'cover' }} />
          ) : (
            <div className={cardStyles.studentHeaderAvatar} style={{ background: `linear-gradient(135deg, ${accent.color}, ${accent.light})` }}>
              {initials(student.name)}
            </div>
          )}
          <div>
            <h2>{student.name}</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
              <span className={cardStyles.studentCode}>{student.studentCode}</span>
              {' • '}ស្នាដៃ <strong style={{ color: 'var(--color-accent)' }}>{portfolios.length}</strong>
            </p>
          </div>
        </div>
        {canIns && <button className="btn-primary" onClick={openAdd}>+ បន្ថែមស្នាដៃ</button>}
      </div>

      {portfolios.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🗂️</div>
          <p>សិស្សនេះមិនទាន់មានស្នាដៃទេ</p>
        </div>
      ) : (
        <div className={cardStyles.portfolioGrid}>
          {portfolios.map((p, i) => {
            const courseAccent = accentFor(p.course.id);
            return (
              <div
                key={p.id}
                className={cardStyles.portfolioCard}
                style={{ '--card-accent': courseAccent.color, '--card-accent-light': courseAccent.light, animationDelay: `${i * 40}ms` } as React.CSSProperties}
              >
                <div className={cardStyles.cardBody}>
                  <div className={cardStyles.portfolioInfo} style={{ marginBottom: 14 }}>
                    <span className={cardStyles.portfolioTitle}>{p.title}</span>
                    <span className={cardStyles.courseTag}>{p.course.name}</span>
                  </div>

                  {p.fileUrl ? (
                    <a href={p.fileUrl} target="_blank" rel="noreferrer" className={cardStyles.fileLink}>
                      📄 មើលឯកសារ
                    </a>
                  ) : (
                    <span className={cardStyles.noFile}>— គ្មានឯកសារ</span>
                  )}
                </div>

                <div className={cardStyles.cardActions}>
                  <button className={cardStyles.iconBtn} onClick={() => setViewTarget(p)} title="មើល">👁️</button>
                  {(canWri || canDel) && (
                    <>
                      {canWri && <button className={cardStyles.iconBtn} onClick={() => openEdit(p)} title="កែប្រែ">✏️</button>}
                      {canDel && <button className={`${cardStyles.iconBtn} ${cardStyles.deleteBtn}`} onClick={() => setDeleteTarget(p.id)} title="លុប">🗑️</button>}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className={styles.modalOverlay} onClick={() => !submitting && setModal(false)}>
          <div className={`glass-panel ${styles.modalCard}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingId ? 'កែប្រែស្នាដៃ' : 'បន្ថែមស្នាដៃ'} — {student.name}</h3>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.formError}>{error}</div>}
              <div className={styles.formGroup}>
                <label>ចំណងជើង *</label>
                <input type="text" className={styles.input} required autoFocus
                  value={form.title} onChange={e => set('title', e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>វគ្គ *</label>
                <select className={styles.input} required value={form.courseId} onChange={e => set('courseId', e.target.value)}>
                  <option value="">-- ជ្រើសវគ្គ --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>ឯកសារ / រូបភាព</label>
                <div className={cardStyles.modeToggle}>
                  <button type="button"
                    className={`${cardStyles.modeBtn} ${fileMode === 'upload' ? cardStyles.modeBtnActive : ''}`}
                    onClick={() => { setFileMode('upload'); setForm(prev => ({ ...prev, fileUrl: '' })); }}>
                    ⬆ ផ្ទុកឡើងឯកសារ
                  </button>
                  <button type="button"
                    className={`${cardStyles.modeBtn} ${fileMode === 'url' ? cardStyles.modeBtnActive : ''}`}
                    onClick={() => { setFileMode('url'); setForm(prev => ({ ...prev, fileUrl: '' })); }}>
                    🔗 តំណភ្ជាប់ URL
                  </button>
                </div>

                {fileMode === 'upload' ? (
                  <div
                    className={`${cardStyles.uploadZone} ${dragOver ? cardStyles.uploadZoneActive : ''} ${uploading ? cardStyles.uploadZoneBusy : ''}`}
                    onDragOver={e => { e.preventDefault(); if (!uploading) setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <input type="file" id="portfolio-file-upload" style={{ display: 'none' }}
                      onChange={handleUpload} disabled={uploading} />

                    {form.fileUrl ? (
                      <div className={cardStyles.uploadResult}>
                        {/\.(png|jpe?g|gif|webp|svg)$/i.test(form.fileUrl) ? (
                          <img src={form.fileUrl} alt="preview" className={cardStyles.uploadPreviewImg} />
                        ) : (
                          <div className={cardStyles.uploadFileIcon}>📄</div>
                        )}
                        <div className={cardStyles.uploadFileName} title={form.fileUrl}>{form.fileUrl.split('/').pop()}</div>
                        <div className={cardStyles.uploadActionsRow}>
                          <a href={form.fileUrl} target="_blank" rel="noreferrer" className={cardStyles.uploadGhostBtn}>មើលឯកសារ</a>
                          <label htmlFor="portfolio-file-upload" className={cardStyles.uploadGhostBtn} style={{ cursor: uploading ? 'default' : 'pointer' }}>
                            {uploading ? 'កំពុងបញ្ចូល...' : 'ប្តូរឯកសារ'}
                          </label>
                          <button type="button" className={cardStyles.uploadGhostBtnDanger}
                            onClick={() => setForm(prev => ({ ...prev, fileUrl: '' }))} disabled={uploading}>
                            លុបចេញ
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label htmlFor="portfolio-file-upload" className={cardStyles.uploadPrompt}>
                        <div className={cardStyles.uploadIcon}>{uploading ? '⏳' : '⬆'}</div>
                        <div className={cardStyles.uploadPromptTitle}>
                          {uploading ? 'កំពុងផ្ទុកឡើង...' : 'ចុចដើម្បីជ្រើសរើស ឬអូសឯកសារមកដាក់ទីនេះ'}
                        </div>
                        <div className={cardStyles.uploadPromptHint}>គាំទ្ររូបភាព ​ ឯកសារ PDF, Word ។ល។</div>
                      </label>
                    )}
                  </div>
                ) : (
                  <input type="url" className={styles.input} placeholder="https://..."
                    style={{ marginTop: 10 }} autoFocus
                    value={form.fileUrl} onChange={e => set('fileUrl', e.target.value)} />
                )}
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setModal(false)} disabled={submitting}>បោះបង់</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={`glass-panel ${styles.confirmCard}`} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#f87171' }}>⚠️ លុបស្នាដៃ?</h3>
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

      {viewTarget && (
        <div className={styles.modalOverlay} onClick={() => setViewTarget(null)}>
          <div className={`glass-panel ${styles.modalCard}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{viewTarget.title}</h3>
              <button className={styles.closeBtn} onClick={() => setViewTarget(null)}>✕</button>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span className={cardStyles.courseTag} style={{ alignSelf: 'flex-start' }}>{viewTarget.course.name}</span>

              {viewTarget.fileUrl ? (
                /\.(png|jpe?g|gif|webp|svg)$/i.test(viewTarget.fileUrl) ? (
                  <img src={viewTarget.fileUrl} alt={viewTarget.title} style={{ width: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--color-border)', background: '#f8fafc' }} />
                ) : (
                  <div className={cardStyles.uploadFileIcon} style={{ alignSelf: 'center' }}>📄</div>
                )
              ) : (
                <span className={cardStyles.noFile}>— គ្មានឯកសារ</span>
              )}

              {viewTarget.fileUrl && (
                <a href={viewTarget.fileUrl} target="_blank" rel="noreferrer" className={cardStyles.fileLink} style={{ alignSelf: 'flex-start' }}>
                  📄 បើកឯកសារពេញ
                </a>
              )}

              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                បានបង្កើតនៅ {new Date(viewTarget.createdAt).toLocaleDateString('km-KH', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
