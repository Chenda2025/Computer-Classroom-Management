'use client';
import { useState, useMemo } from 'react';
import s from './users.module.css';
import { MODULES, PERM_ACTIONS, parsePermissions, type PermAction, type PermMap } from '../../../lib/permissions';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string;
  createdAt: string;
}
interface Props { initialUsers: User[]; currentUserId: string; }

const EMPTY = { name: '', email: '', password: '', role: 'MONITOR' };

const ROLE_STYLE = {
  ADMIN:   { label: 'អ្នកគ្រប់គ្រង',    bg: '#eef2ff', color: '#4338ca', border: 'rgba(99,102,241,0.3)' },
  MONITOR: { label: 'អ្នកត្រួតពិនិត្យ', bg: '#f0fdf4', color: '#15803d', border: 'rgba(22,163,74,0.3)' },
};


const AVATAR_GRADIENTS = [
  ['#6366f1','#8b5cf6'], ['#10b981','#059669'], ['#f59e0b','#d97706'],
  ['#3b82f6','#2563eb'], ['#ec4899','#db2777'], ['#14b8a6','#0d9488'],
];
function avatarGrad(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg,${a},${b})`;
}

const GROUPS = ['ការគ្រប់គ្រង', 'ការប្រឡង', 'ផ្សេងៗ'] as const;

export default function UsersClient({ initialUsers, currentUserId }: Props) {
  const [users, setUsers]           = useState<User[]>(initialUsers);
  const [search, setSearch]         = useState('');
  const [modal, setModal]           = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [form, setForm]             = useState(EMPTY);
  const [formError, setFormError]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [showPwd, setShowPwd]       = useState(false);
  const [permTarget, setPermTarget] = useState<User | null>(null);
  const [permMap, setPermMap]       = useState<PermMap>({});
  const [permSaving, setPermSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  const adminCount   = users.filter(u => u.role === 'ADMIN').length;
  const monitorCount = users.filter(u => u.role === 'MONITOR').length;

  /* ── handlers ── */
  const openAdd = () => { setForm(EMPTY); setEditTarget(null); setFormError(''); setShowPwd(false); setModal(true); };
  const openEdit = (u: User) => { setForm({ name: u.name, email: u.email, password: '', role: u.role }); setEditTarget(u); setFormError(''); setShowPwd(false); setModal(true); };
  const openPerms = (u: User) => { setPermMap(parsePermissions(u.permissions)); setPermTarget(u); };
  const setField = (k: keyof typeof EMPTY, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setFormError('');
    try {
      const url    = editTarget ? `/api/users/${editTarget.id}` : '/api/users';
      const method = editTarget ? 'PUT' : 'POST';
      const body   = editTarget
        ? { name: form.name, role: form.role, ...(form.password ? { password: form.password } : {}) }
        : form;
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? 'មានបញ្ហាកើតឡើង'); return; }
      if (editTarget) setUsers(p => p.map(u => u.id === editTarget.id ? { ...u, ...data } : u));
      else setUsers(p => [...p, { ...data, permissions: '{}' }]);
      setModal(false);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); alert(d.error); return; }
      setUsers(p => p.filter(u => u.id !== deleteTarget.id));
    } finally { setDeleteTarget(null); setDeleting(false); }
  };

  const handleSavePerms = async () => {
    if (!permTarget) return; setPermSaving(true);
    try {
      const res = await fetch(`/api/users/${permTarget.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permMap }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? 'មានបញ្ហា'); return; }
      setUsers(p => p.map(u => u.id === permTarget.id ? { ...u, permissions: data.permissions } : u));
      setPermTarget(null);
    } finally { setPermSaving(false); }
  };

  const toggleAction = (moduleKey: string, action: PermAction) => {
    setPermMap(p => {
      const current = p[moduleKey] ?? [];
      const next = current.includes(action)
        ? current.filter(a => a !== action)
        : [...current, action];
      const n = { ...p };
      next.length === 0 ? delete n[moduleKey] : (n[moduleKey] = next);
      return n;
    });
  };

  const grantAll = (action: PermAction | 'none' | 'all') => {
    if (action === 'none') { setPermMap({}); return; }
    const allActions: PermAction[] = ['view', 'insert', 'write', 'delete'];
    const actions = action === 'all' ? allActions : [action];
    const n: PermMap = {};
    MODULES.forEach(m => { n[m.key] = actions; });
    setPermMap(n);
  };

  const permSummary = (u: User) => {
    if (u.role === 'ADMIN') return { label: 'ទាំងអស់', color: '#6366f1', bg: '#eef2ff', border: 'rgba(99,102,241,0.3)' };
    const pm = parsePermissions(u.permissions);
    const count = Object.values(pm).filter(arr => Array.isArray(arr) && arr.length > 0).length;
    if (count === 0) return { label: 'គ្មានសិទ្ធិ', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' };
    if (count === MODULES.length) return { label: 'ទាំងអស់', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' };
    return { label: `${count}/${MODULES.length}`, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' };
  };

  const permCount = useMemo(
    () => Object.values(permMap).filter(arr => Array.isArray(arr) && arr.length > 0).length,
    [permMap],
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('km-KH', { year: 'numeric', month: 'short', day: 'numeric' });

  /* ── render ── */
  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <h2>កំណត់សិទ្ធិប្រើប្រាស</h2>
          <div className={s.headerSub}>
            <span>គ្រប់គ្រងគណនី និងការចូលប្រើរបស់អ្នកប្រើប្រាស់</span>
          </div>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ បន្ថែមអ្នកប្រើប្រាស់</button>
      </div>

      {/* Stats */}
      <div className={s.statsRow}>
        {[
          { icon: '👥', num: users.length,   label: 'អ្នកប្រើប្រាស់សរុប', bg: 'var(--color-accent-light)',  color: 'var(--color-accent)' },
          { icon: '🔑', num: adminCount,      label: 'អ្នកគ្រប់គ្រង',      bg: '#eef2ff',                    color: '#4338ca' },
          { icon: '👁️', num: monitorCount,    label: 'អ្នកត្រួតពិនិត្យ',   bg: '#f0fdf4',                    color: '#15803d' },
        ].map(st => (
          <div key={st.label} className={s.statCard}>
            <div className={s.statIcon} style={{ background: st.bg, color: st.color, fontSize: '1.2rem' }}>{st.icon}</div>
            <div className={s.statBody}>
              <div className={s.statNum} style={{ color: st.color }}>{st.num}</div>
              <div className={s.statLabel}>{st.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className={s.toolbar}>
        <div className={s.searchWrapper}>
          <span className={s.searchIcon}>⌕</span>
          <input className={s.searchInput} placeholder="ស្វែងរកតាមឈ្មោះ ឬអ៊ីមែល..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {search && (
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            {filtered.length} / {users.length} នាក់
          </span>
        )}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className={s.empty}>
          <div className={s.emptyIcon}>👤</div>
          <p>{search ? 'រកមិនឃើញអ្នកប្រើប្រាស់' : 'មិនទាន់មានអ្នកប្រើប្រាស់ទេ'}</p>
        </div>
      ) : (
        <div className={s.grid}>
          {filtered.map((u, idx) => {
            const rs  = ROLE_STYLE[u.role as keyof typeof ROLE_STYLE] ?? ROLE_STYLE.MONITOR;
            const ps  = permSummary(u);
            const isSelf = u.id === currentUserId;
            return (
              <div key={u.id} className={s.card} style={{ animationDelay: `${idx * 30}ms` }}>
                {/* Top */}
                <div className={s.cardTop}>
                  <div className={s.avatar} style={{ background: avatarGrad(u.name) }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={s.cardInfo}>
                    <div className={s.cardName}>{u.name}</div>
                    <div className={s.cardEmail}>{u.email}</div>
                    {isSelf && <span className={s.selfTag}>គណនីរបស់អ្នក</span>}
                  </div>
                </div>

                {/* Meta row */}
                <div className={s.cardMeta}>
                  <span className={s.roleBadge} style={{ background: rs.bg, color: rs.color, borderColor: rs.border }}>
                    {rs.label}
                  </span>
                  <span className={s.permBadge} style={{ background: ps.bg, color: ps.color, borderColor: ps.border }}>
                    🔐 {ps.label}
                  </span>
                  <span className={s.cardDate}>{formatDate(u.createdAt)}</span>
                </div>

                {/* Actions */}
                <div className={s.cardActions}>
                  {u.role !== 'ADMIN' && (
                    <button className={`${s.actionBtn} ${s.permBtn}`} onClick={() => openPerms(u)}>
                      🔐 <span>សិទ្ធិ</span>
                    </button>
                  )}
                  <button className={`${s.actionBtn} ${s.editBtn}`} onClick={() => openEdit(u)}>
                    ✏️ <span>កែប្រែ</span>
                  </button>
                  <button
                    className={`${s.actionBtn} ${s.deleteBtn}`}
                    onClick={() => !isSelf && setDeleteTarget(u)}
                    disabled={isSelf}
                    title={isSelf ? 'មិនអាចលុបខ្លួនឯង' : 'លុប'}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Permission Modal ── */}
      {permTarget && (
        <div className={s.overlay} onClick={() => !permSaving && setPermTarget(null)}>
          <div className={`${s.modal} ${s.modalWide}`} onClick={e => e.stopPropagation()}>
            {/* Head */}
            <div className={s.modalHead}>
              <div>
                <h3>🔐 កំណត់ការចូលប្រើ</h3>
                <div className={s.modalSub}>
                  {permTarget.name} · {permCount}/{MODULES.length} ផ្នែក
                </div>
              </div>
              <button className={s.closeBtn} onClick={() => setPermTarget(null)}>✕</button>
            </div>

            {/* Quick set */}
            <div className={s.quickBar}>
              <span className={s.quickLabel}>ជ្រើសទាំងអស់</span>
              <button className={s.quickBtn} type="button" onClick={() => grantAll('none')}
                style={{ background: '#f1f5f9', color: '#94a3b8', borderColor: '#cbd5e1' }}>
                គ្មាន
              </button>
              {PERM_ACTIONS.map(o => (
                <button key={o.value} className={s.quickBtn} type="button"
                  onClick={() => grantAll(o.value)}
                  style={{ background: o.bg, color: o.color, borderColor: o.border }}>
                  {o.label}
                </button>
              ))}
              <button className={s.quickBtn} type="button" onClick={() => grantAll('all')}
                style={{ background: '#eef2ff', color: '#4338ca', borderColor: 'rgba(99,102,241,0.4)' }}>
                ទាំងអស់
              </button>
            </div>

            {/* Module list */}
            <div className={s.permBody}>
              {GROUPS.map(group => {
                const mods = MODULES.filter(m => m.group === group);
                return (
                  <div key={group} className={s.permGroup}>
                    <div className={s.permGroupLabel}>{group}</div>
                    {mods.map(m => {
                      const active = permMap[m.key] ?? [];
                      const hasAny = active.length > 0;
                      return (
                        <div key={m.key} className={`${s.permRow} ${hasAny ? s.permRowActive : ''}`}>
                          <span className={s.permIcon}>{m.icon}</span>
                          <span className={s.permModuleLabel}>{m.label}</span>
                          <div className={s.pillGroup}>
                            {PERM_ACTIONS.map(o => {
                              const on = active.includes(o.value);
                              return (
                                <button key={o.value} type="button" className={s.pill}
                                  onClick={() => toggleAction(m.key, o.value)}
                                  style={{
                                    background: on ? o.color : 'transparent',
                                    color: on ? '#fff' : o.color,
                                    borderColor: on ? o.color : o.border,
                                  }}>
                                  {on && <span style={{ marginRight: 3, fontSize: '0.65rem' }}>✓</span>}
                                  {o.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className={s.modalFoot}>
              <button className={s.cancelBtn} onClick={() => setPermTarget(null)} disabled={permSaving}>បោះបង់</button>
              <button className="btn-primary" onClick={handleSavePerms} disabled={permSaving}>
                {permSaving ? 'កំពុងរក្សាទុក...' : '💾 រក្សាទុក'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div className={s.overlay} onClick={() => !submitting && setModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <div>
                <h3>{editTarget ? 'កែប្រែគណនី' : 'បន្ថែមអ្នកប្រើប្រាស់ថ្មី'}</h3>
                {editTarget && <div className={s.modalSub}>{editTarget.name}</div>}
              </div>
              <button className={s.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={s.formBody}>
                {formError && <div className={s.formError}>{formError}</div>}

                <div className={s.formGroup}>
                  <label>ឈ្មោះពេញ *</label>
                  <input className={s.input} type="text" required autoFocus
                    placeholder="ឧ. សុខ ដារ៉ា"
                    value={form.name} onChange={e => setField('name', e.target.value)} />
                </div>

                {!editTarget && (
                  <div className={s.formGroup}>
                    <label>អ៊ីមែល *</label>
                    <input className={s.input} type="email" required
                      placeholder="user@school.edu"
                      value={form.email} onChange={e => setField('email', e.target.value)} />
                  </div>
                )}

                <div className={s.formGroup}>
                  <label>{editTarget ? 'ពាក្យសម្ងាត់ថ្មី (ទុកទំនេរប្រសិនមិនផ្លាស់ប្ដូរ)' : 'ពាក្យសម្ងាត់ *'}</label>
                  <div className={s.inputWrap}>
                    <input className={s.input} type={showPwd ? 'text' : 'password'}
                      required={!editTarget} placeholder="យ៉ាងហោចណាស់ ៦ តួអក្សរ"
                      value={form.password} onChange={e => setField('password', e.target.value)}
                      style={{ paddingRight: 40 }} />
                    <button type="button" className={s.eyeBtn} onClick={() => setShowPwd(p => !p)}>
                      {showPwd ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className={s.formGroup}>
                  <label>តួនាទី</label>
                  <select className={s.input} value={form.role} onChange={e => setField('role', e.target.value)}>
                    <option value="MONITOR">អ្នកត្រួតពិនិត្យ (Monitor)</option>
                    <option value="ADMIN">អ្នកគ្រប់គ្រង (Admin)</option>
                  </select>
                </div>

                <div className={s.hint}>
                  <strong>អ្នកគ្រប់គ្រង</strong> — មានសិទ្ធិពេញលេញ បន្ថែម កែប្រែ និងលុប<br />
                  <strong>អ្នកត្រួតពិនិត្យ</strong> — ចូលប្រើតែផ្នែកដែលបានអនុញ្ញាត (🔐 សិទ្ធិ)
                </div>
              </div>

              <div className={s.modalFoot}>
                <button type="button" className={s.cancelBtn} onClick={() => setModal(false)} disabled={submitting}>បោះបង់</button>
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
        <div className={s.overlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={s.confirmModal} onClick={e => e.stopPropagation()}>
            <div className={s.confirmIcon}>🗑️</div>
            <div className={s.confirmTitle}>លុបអ្នកប្រើប្រាស់?</div>
            <p className={s.confirmText}>
              តើអ្នកប្រាកដជាចង់លុប <strong>{deleteTarget.name}</strong>?
              គណនីនេះ <strong>មិនអាចស្ដារវិញបានទេ</strong>។
            </p>
            <div className={s.modalFoot} style={{ marginTop: 20, padding: 0, background: 'none', border: 'none' }}>
              <button className={s.cancelBtn} onClick={() => setDeleteTarget(null)} disabled={deleting}>បោះបង់</button>
              <button className="btn-primary" style={{ background: '#dc2626' }}
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
