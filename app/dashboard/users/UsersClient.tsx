'use client';
import { useState, useMemo } from 'react';
import styles from '../students/students.module.css';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface Props {
  initialUsers: User[];
  currentUserId: string;
}

const EMPTY = { name: '', email: '', password: '', role: 'MONITOR' };

const ROLE = {
  ADMIN:   { label: 'អ្នកគ្រប់គ្រង', bg: '#eef2ff', color: '#4338ca', border: 'rgba(99,102,241,0.25)' },
  MONITOR: { label: 'អ្នកត្រួតពិនិត្យ', bg: '#f0fdf4', color: '#15803d', border: 'rgba(22,163,74,0.25)' },
};

export default function UsersClient({ initialUsers, currentUserId }: Props) {
  const [users, setUsers]           = useState<User[]>(initialUsers);
  const [search, setSearch]         = useState('');
  const [modal, setModal]           = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [form, setForm]             = useState(EMPTY);
  const [error, setError]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [showPwd, setShowPwd]       = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const openAdd = () => {
    setForm(EMPTY); setEditTarget(null); setError(''); setShowPwd(false); setModal(true);
  };

  const openEdit = (u: User) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setEditTarget(u); setError(''); setShowPwd(false); setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      const url    = editTarget ? `/api/users/${editTarget.id}` : '/api/users';
      const method = editTarget ? 'PUT' : 'POST';
      const body   = editTarget
        ? { name: form.name, role: form.role, ...(form.password ? { password: form.password } : {}) }
        : form;

      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'មានបញ្ហាកើតឡើង'); return; }

      if (editTarget) {
        setUsers(prev => prev.map(u => u.id === editTarget.id ? data : u));
      } else {
        setUsers(prev => [...prev, data]);
      }
      setModal(false);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); alert(d.error); return; }
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
    } finally { setDeleteTarget(null); setDeleting(false); }
  };

  const set = (k: keyof typeof EMPTY, v: string) => setForm(p => ({ ...p, [k]: v }));

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('km-KH', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="animate-fade-in">
      <div className={styles.pageHeader}>
        <div>
          <h2>កំណត់សិទ្ធិប្រើប្រាស</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
            អ្នកប្រើប្រាស់សរុប:{' '}
            <strong style={{ color: 'var(--color-accent)' }}>{users.length}</strong> នាក់
          </p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ បន្ថែមអ្នកប្រើប្រាស់</button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>⌕</span>
          <input type="text" className={styles.searchInput}
            placeholder="ស្វែងរកតាមឈ្មោះ ឬអ៊ីមែល..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {search && <span className={styles.resultCount}>បង្ហាញ {filtered.length} / {users.length}</span>}
      </div>

      <div className={styles.tableWrapper}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👤</div>
            <p>{search ? 'រកមិនឃើញអ្នកប្រើប្រាស់' : 'មិនទាន់មានអ្នកប្រើប្រាស់ទេ'}</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th>#</th>
                <th>ឈ្មោះ</th>
                <th>អ៊ីមែល</th>
                <th>សិទ្ធិ</th>
                <th>ថ្ងៃបង្កើត</th>
                <th>ការគ្រប់គ្រង</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const r = ROLE[u.role as keyof typeof ROLE] ?? ROLE.MONITOR;
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className={styles.row}>
                    <td className={styles.indexCell}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                        }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className={styles.nameCell}>{u.name}</div>
                          {isSelf && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                              (អ្នក)
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={styles.mutedCell}>{u.email}</td>
                    <td>
                      <span style={{
                        background: r.bg, color: r.color,
                        border: `1px solid ${r.border}`,
                        padding: '3px 10px', borderRadius: 20,
                        fontSize: '0.75rem', fontWeight: 700,
                      }}>
                        {r.label}
                      </span>
                    </td>
                    <td className={styles.mutedCell}>{formatDate(u.createdAt)}</td>
                    <td>
                      <div className={styles.actionGroup}>
                        <button className={`${styles.actionBtn} ${styles.editBtn}`}
                          onClick={() => openEdit(u)} title="កែប្រែ">✏️</button>
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => !isSelf && setDeleteTarget(u)}
                          title={isSelf ? 'មិនអាចលុបខ្លួនឯង' : 'លុប'}
                          style={{ opacity: isSelf ? 0.35 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}
                        >🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div className={styles.modalOverlay} onClick={() => !submitting && setModal(false)}>
          <div className={`glass-panel ${styles.modalCard}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editTarget ? `កែប្រែ — ${editTarget.name}` : 'បន្ថែមអ្នកប្រើប្រាស់ថ្មី'}</h3>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.formError}>{error}</div>}

              <div className={styles.formGroup}>
                <label>ឈ្មោះពេញ *</label>
                <input type="text" className={styles.input} required autoFocus
                  placeholder="ឧ. សុខ ដារ៉ា"
                  value={form.name} onChange={e => set('name', e.target.value)} />
              </div>

              {!editTarget && (
                <div className={styles.formGroup}>
                  <label>អ៊ីមែល *</label>
                  <input type="email" className={styles.input} required
                    placeholder="user@school.edu"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
              )}

              <div className={styles.formGroup}>
                <label>{editTarget ? 'ពាក្យសម្ងាត់ថ្មី (ទុកទំនេរ ប្រសិនមិនផ្លាស់ប្ដូរ)' : 'ពាក្យសម្ងាត់ *'}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className={styles.input}
                    required={!editTarget}
                    placeholder="យ៉ាងហោចណាស់ ៦ តួអក្សរ"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    style={{ paddingRight: 40 }}
                  />
                  <button type="button"
                    onClick={() => setShowPwd(p => !p)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>សិទ្ធិប្រើប្រាស</label>
                <select className={styles.input} value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="MONITOR">អ្នកត្រួតពិនិត្យ (Monitor)</option>
                  <option value="ADMIN">អ្នកគ្រប់គ្រង (Admin)</option>
                </select>
              </div>

              <div style={{
                background: '#f8fafc', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.6,
              }}>
                <strong style={{ color: 'var(--color-text-primary)' }}>អ្នកគ្រប់គ្រង</strong> — មានសិទ្ធិពេញលេញ បន្ថែម កែប្រែ និងលុបទិន្នន័យ<br />
                <strong style={{ color: 'var(--color-text-primary)' }}>អ្នកត្រួតពិនិត្យ</strong> — អាចមើលប៉ុណ្ណោះ
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn}
                  onClick={() => setModal(false)} disabled={submitting}>បោះបង់</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={`glass-panel ${styles.confirmCard}`} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#f87171' }}>⚠️ លុបអ្នកប្រើប្រាស់?</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 14, lineHeight: 1.7, fontSize: '0.92rem' }}>
              តើអ្នកប្រាកដជាចង់លុប{' '}
              <strong style={{ color: 'var(--color-text-primary)' }}>{deleteTarget.name}</strong>?
              គណនីនេះ<strong style={{ color: 'var(--color-text-primary)' }}> មិនអាចស្ដារវិញបានទេ</strong>។
            </p>
            <div className={styles.formActions} style={{ marginTop: 28 }}>
              <button className={styles.cancelBtn}
                onClick={() => setDeleteTarget(null)} disabled={deleting}>បោះបង់</button>
              <button className="btn-primary"
                style={{ background: 'rgba(239,68,68,0.85)' }}
                onClick={handleDelete} disabled={deleting}>
                {deleting ? 'កំពុងលុប...' : 'លុបចោល'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
