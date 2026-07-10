'use client';
import { useState, useMemo, useEffect } from 'react';
import { parsePermissions, canInsert, canWrite, canDelete } from '../../../lib/permissions';
import { useLocalCache } from '../../../lib/useLocalCache';
import { useRouter } from 'next/navigation';
import styles from '../students/students.module.css';
import cc from './classes.module.css';
import ExportModal from './ExportModal';

interface ClassRow {
  id: string;
  classCode: string;
  name: string;
  academicYear: string | null;
  educationLevel: string | null;
  grade: string | null;
  maxStudents: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  userRole: string;
  userPerms: string;
}

const fetchClasses = async (): Promise<ClassRow[]> => {
  const res = await fetch('/api/classes');
  if (!res.ok) throw new Error('Failed to load classes');
  return res.json();
};

function currentAcademicYear(): string {
  const y = new Date().getFullYear();
  return `${y}-${y + 1}`;
}

const CURRENT_YEAR = currentAcademicYear();

const EMPTY = {
  name: '', academicYear: CURRENT_YEAR, educationLevel: '', grade: '', maxStudents: '',
};

const LEVEL_COLORS: Record<string, [string, string]> = {
  'បឋមសិក្សា':    ['#10b981', '#34d399'],
  'មធ្យមសិក្សា':  ['#3b82f6', '#60a5fa'],
  'វិទ្យាល័យ':    ['#8b5cf6', '#a78bfa'],
  'បច្ចេកទេស':    ['#f59e0b', '#fbbf24'],
  'មហាវិទ្យាល័យ': ['#ec4899', '#f472b6'],
};

function levelColor(level: string | null): [string, string] {
  if (!level) return ['#6366f1', '#818cf8'];
  for (const [key, pair] of Object.entries(LEVEL_COLORS)) {
    if (level.includes(key)) return pair;
  }
  return ['#6366f1', '#818cf8'];
}

export default function ClassesClient({ userRole, userPerms }: Props) {
  const permMap = useMemo(() => parsePermissions(userPerms), [userPerms]);
  const router = useRouter();
  const canIns = canInsert(permMap, 'classes', userRole);
  const canWri = canWrite(permMap, 'classes', userRole);
  const canDel = canDelete(permMap, 'classes', userRole);
  const { data: cachedClasses, loading: classesLoading, refresh: refreshClasses, setData: setClasses } = useLocalCache<ClassRow[]>('classes', fetchClasses);
  const classes = cachedClasses ?? [];
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  useEffect(() => {
    const saved = localStorage.getItem('classViewMode') as 'table' | 'card' | null;
    if (saved === 'card' || saved === 'table') setViewMode(saved);
  }, []);
  const switchViewMode = (mode: 'table' | 'card') => {
    setViewMode(mode);
    localStorage.setItem('classViewMode', mode);
  };

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [infoClass, setInfoClass] = useState<ClassRow | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  const [exportModal, setExportModal] = useState(false);
  const [tgSendingProfile, setTgSendingProfile] = useState(false);

  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return classes.filter(c => {
      if (q && !(
        c.name.toLowerCase().includes(q) ||
        c.classCode.toLowerCase().includes(q)
      )) return false;
      if (filterYear && c.academicYear !== filterYear) return false;
      return true;
    });
  }, [classes, search, filterYear]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length && paginated.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map(c => c.id)));
    }
  };

  const resetPage = () => { setPage(1); setSelectedIds(new Set()); };

  const openAdd = () => { setForm(EMPTY); setEditingId(null); setEditingCode(''); setError(''); setModal(true); };
  const openEdit = (c: ClassRow) => {
    setForm({
      name: c.name, academicYear: c.academicYear ?? '', educationLevel: c.educationLevel ?? '',
      grade: c.grade ?? '', maxStudents: c.maxStudents != null ? String(c.maxStudents) : '',
    });
    setEditingId(c.id); setEditingCode(c.classCode); setError(''); setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      const url = editingId ? `/api/classes/${editingId}` : '/api/classes';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, academicYear: form.academicYear, educationLevel: form.educationLevel, grade: form.grade, maxStudents: form.maxStudents ? Number(form.maxStudents) : null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'មានបញ្ហាកើតឡើង'); return; }
      if (editingId) setClasses(prev => prev.map(c => c.id === editingId ? { ...c, ...data } : c));
      else setClasses(prev => [data, ...prev]);
      setModal(false);
      window.location.reload();
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try {
      await fetch(`/api/classes/${deleteTarget}`, { method: 'DELETE' });
      setClasses(prev => prev.filter(c => c.id !== deleteTarget));
      window.location.reload();
    } finally { setDeleteTarget(null); setDeleting(false); }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await fetch('/api/classes', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      setClasses(prev => prev.filter(c => !selectedIds.has(c.id)));
      setSelectedIds(new Set()); setBulkDeleteConfirm(false);
      window.location.reload();
    } finally { setBulkDeleting(false); }
  };

  const handleBulkTelegramProfiles = async () => {
    if (!confirm(`តើអ្នកពិតជាចង់ផ្ញើព័ត៌មានថ្នាក់រៀនចំនួន ${selectedIds.size} ចូល Telegram មែនទេ?`)) return;
    
    setTgSendingProfile(true);
    let successCount = 0;
    try {
      const selectedClasses = classes.filter(c => selectedIds.has(c.id));
      for (const c of selectedClasses) {
        const caption = `🎓 <b>ថ្នាក់រៀន (Class Info)</b>\n` +
          `🏫 ឈ្មោះថ្នាក់: ${c.name}\n` +
          `🆔 លេខកូដ: ${c.classCode}\n` +
          `📅 ឆ្នាំសិក្សា: ${c.academicYear || '—'}\n` +
          `👥 សមត្ថភាព: ${c.maxStudents ? c.maxStudents + ' នាក់' : '—'}`;

        const fd = new FormData();
        fd.append('caption', caption);
        
        const res = await fetch('/api/export/telegram', { method: 'POST', body: fd });
        if (res.ok) successCount++;
        
        await new Promise(r => setTimeout(r, 500)); // anti-spam
      }
      alert(`ផ្ញើចូល Telegram បានជោគជ័យ ចំនួន ${successCount}/${selectedClasses.length} ✓`);
      setSelectedIds(new Set());
    } catch (err: any) {
      alert('មានបញ្ហាពេលផ្ញើ៖ ' + err.message);
    } finally {
      setTgSendingProfile(false);
    }
  };

  const set = (k: keyof typeof EMPTY, v: string) => setForm(p => ({ ...p, [k]: v }));

  const PaginationBar = () => totalPages <= 1 ? null : (
    <div className={styles.pagination}>
      <span className={styles.paginationInfo}>
        {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length} ថ្នាក់
      </span>
      <div className={styles.paginationBtns}>
        <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 2)
          .reduce<(number | '...')[]>((acc, n, idx, arr) => {
            if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...');
            acc.push(n); return acc;
          }, [])
          .map((n, idx) => n === '...'
            ? <span key={`e-${idx}`} className={styles.pageEllipsis}>…</span>
            : <button key={n} className={`${styles.pageBtn} ${safePage === n ? styles.pageBtnActive : ''}`}
                onClick={() => setPage(n as number)}>{n}</button>
          )}
        <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
      </div>
    </div>
  );

  if (classesLoading && cachedClasses === null) {
    return (
      <div className="animate-fade-in" style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        កំពុងផ្ទុកទិន្នន័យថ្នាក់រៀន...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h2>បញ្ជីថ្នាក់រៀន</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
            ថ្នាក់សរុប: <strong style={{ color: 'var(--color-accent)' }}>{classes.length}</strong> ថ្នាក់
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" onClick={() => refreshClasses()} disabled={classesLoading}>
            🔄 ផ្ទុកឡើងវិញ
          </button>
          <button className="btn-secondary" onClick={() => setExportModal(true)}>
            📥 មើលរបាយការណ៍/នាំចេញ
          </button>
          {canIns && <button className="btn-primary" onClick={openAdd}>+ បន្ថែមថ្នាក់ថ្មី</button>}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className={styles.statsRow} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconBlue}`}>🏫</div>
          <div>
            <div className={styles.statLabel}>ថ្នាក់សរុប</div>
            <div className={styles.statValue}>{classes.length}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconOrange}`}>👥</div>
          <div>
            <div className={styles.statLabel}>សមត្ថភាពសរុប</div>
            <div className={styles.statValue}>
              {classes.reduce((s, c) => s + (c.maxStudents ?? 0), 0)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>⌕</span>
          <input type="text" className={styles.searchInput}
            placeholder="ស្វែងរកតាមឈ្មោះ, លេខកូដ, ថ្នាក់..."
            value={search} onChange={e => { setSearch(e.target.value); resetPage(); }} />
        </div>

        <select className={styles.filterSelect} value={filterYear}
          onChange={e => { setFilterYear(e.target.value); resetPage(); }}>
          <option value="">📅 ឆ្នាំសិក្សាទាំងអស់</option>
          {Array.from(new Set(classes.map(c => c.academicYear).filter(Boolean) as string[])).sort()
            .map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {(search || filterYear) && (
          <span className={styles.resultCount}>{filtered.length} / {classes.length} ថ្នាក់</span>
        )}

        <div className={styles.viewToggle} style={{ marginLeft: 'auto' }}>
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

      {/* ── Empty state ── */}
      {paginated.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏫</div>
          <p>{(search || filterYear) ? 'រកមិនឃើញថ្នាក់ដែលត្រូវនឹងការត្រង' : 'មិនទាន់មានថ្នាក់រៀនទេ'}</p>
          {canIns && !search && !filterYear && (
            <button className="btn-primary" onClick={openAdd} style={{ marginTop: 20 }}>បន្ថែមថ្នាក់ដំបូង</button>
          )}
        </div>
      )}

      {/* ── Card grid ── */}
      {paginated.length > 0 && viewMode === 'card' && (
        <div className={cc.grid}>
          {paginated.map((c, i) => {
            const [col, colLight] = levelColor(c.educationLevel);
            return (
              <div
                key={c.id}
                className={`${cc.card} ${selectedIds.has(c.id) ? cc.cardSelected : ''}`}
                style={{ '--card-color': col, '--card-color-light': colLight, animationDelay: `${i * 45}ms` } as React.CSSProperties}
              >
                {canDel && (
                  <input type="checkbox" className={cc.cardCheck}
                    checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} />
                )}

                <div className={cc.hero}>
                  <div className={cc.heroNumber}>{(safePage - 1) * PAGE_SIZE + i + 1}</div>
                  <div className={cc.heroIcon}>🏫</div>
                  <div className={cc.heroName}>{c.name}</div>
                  <span className={cc.heroCode}>{c.classCode}</span>
                </div>

                <div className={cc.badgeWrap}>
                  {c.educationLevel && (
                    <span className={cc.badge} style={{ background: col + '18', color: col, border: `1px solid ${col}33` }}>
                      📚 {c.educationLevel}
                    </span>
                  )}
                  {c.grade && (
                    <span className={cc.badge} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                      🎓 {c.grade}
                    </span>
                  )}
                </div>

                <div className={cc.info}>
                  <div className={cc.infoRow}>
                    <span className={cc.infoIcon}>📅</span>
                    <span>{c.academicYear ?? '—'}</span>
                  </div>
                  <div className={cc.infoRow}>
                    <span className={cc.infoIcon}>👥</span>
                    <span>សមត្ថភាព: <strong>{c.maxStudents ?? '—'}</strong> នាក់</span>
                  </div>
                </div>

                {c.maxStudents != null && (
                  <div className={cc.capacityWrap}>
                    <div className={cc.capacityLabel}>
                      <span>សមត្ថភាព</span>
                      <span>{c.maxStudents} នាក់</span>
                    </div>
                    <div className={cc.capacityBar}>
                      <div className={cc.capacityFill} style={{ width: '100%' }} />
                    </div>
                  </div>
                )}

                <div className={cc.cardFooter}>
                  <button className={`${styles.actionBtn} ${cc.footerBtn} ${cc.infoBtn}`}
                    onClick={() => setInfoClass(c)} title="ព័ត៌មានលម្អិត">👁️ ព័ត៌មាន</button>
                  {canWri && (
                    <button className={`${styles.actionBtn} ${styles.editBtn} ${cc.footerBtn}`}
                      onClick={() => openEdit(c)}>✏️ កែប្រែ</button>
                  )}
                  {canDel && (
                    <button className={`${styles.actionBtn} ${styles.deleteBtn} ${cc.footerBtn}`}
                      onClick={() => setDeleteTarget(c.id)}>🗑️ លុប</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Table view ── */}
      {paginated.length > 0 && viewMode === 'table' && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.checkCell}>
                  <input type="checkbox" className={styles.checkbox} onChange={toggleSelectAll} checked={paginated.length > 0 && selectedIds.size === paginated.length} />
                </th>
                <th>លេខរៀង</th>
                <th>ឈ្មោះថ្នាក់</th>
                <th>កម្រិត/ផ្នែក</th>
                <th>ឆ្នាំសិក្សា</th>
                <th>សមត្ថភាព</th>
                <th style={{ textAlign: 'right' }}>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c, i) => {
                const [col] = levelColor(c.educationLevel);
                return (
                  <tr key={c.id} className={`${styles.row} ${selectedIds.has(c.id) ? styles.rowSelected : ''}`}>
                    <td className={styles.checkCell}>
                      {canDel && <input type="checkbox" className={styles.checkbox} checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} />}
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                      {(safePage - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className={cc.heroIcon} style={{ background: `${col}18`, color: col, padding: 8, borderRadius: 8, fontSize: '1rem', width: 'auto', height: 'auto', display: 'flex' }}>🏫</div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.name}</div>
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{c.classCode}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {c.educationLevel && <span style={{ color: col, fontSize: '0.85rem', fontWeight: 600 }}>📚 {c.educationLevel}</span>}
                        {c.grade && <span style={{ color: '#475569', fontSize: '0.85rem' }}>🎓 {c.grade}</span>}
                      </div>
                    </td>
                    <td>
                      <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>
                        📅 {c.academicYear ?? '—'}
                      </span>
                    </td>
                    <td>
                      {c.maxStudents != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.maxStudents}</span>
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>នាក់</span>
                        </div>
                      ) : <span style={{ color: 'var(--color-text-secondary)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button className={`${styles.iconBtn} ${styles.infoBtn}`} onClick={() => setInfoClass(c)} title="ព័ត៌មានលម្អិត">👁️</button>
                        {canWri && <button className={`${styles.iconBtn} ${styles.editBtn}`} onClick={() => openEdit(c)} title="កែប្រែ">✏️</button>}
                        {canDel && <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => setDeleteTarget(c.id)} title="លុប">🗑️</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar />

      {/* ── Bulk bar ── */}
      {canDel && selectedIds.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--color-surface)', padding: '12px 24px', borderRadius: 30, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 16, zIndex: 100, border: '1px solid var(--color-border)' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>✓ បានជ្រើសរើស {selectedIds.size} ថ្នាក់</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setExportModal(true)} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 20, cursor: 'pointer' }}>
              📤 នាំចេញជារបាយការណ៍
            </button>
            <button onClick={handleBulkTelegramProfiles} disabled={tgSendingProfile} style={{ background: '#229ED9', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 20, cursor: tgSendingProfile ? 'not-allowed' : 'pointer', opacity: tgSendingProfile ? 0.7 : 1 }}>
              {tgSendingProfile ? 'កំពុងផ្ញើ...' : '✈️ ផ្ញើចូល Telegram (កាត)'}
            </button>
            <button onClick={() => setSelectedIds(new Set())} style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', padding: '6px 12px', borderRadius: 20, cursor: 'pointer' }}>បោះបង់</button>
            <button onClick={() => setBulkDeleteConfirm(true)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: 20, cursor: 'pointer' }}>🗑️ លុប {selectedIds.size} ថ្នាក់</button>
          </div>
        </div>
      )}

      {/* ── Info Modal ── */}
      {infoClass && (() => {
        const [col, colLight] = levelColor(infoClass.educationLevel);
        return (
          <div className={styles.modalOverlay} onClick={() => setInfoClass(null)}>
            <div className={cc.infoModal} onClick={e => e.stopPropagation()}>
              <div className={cc.infoBanner} style={{ background: `linear-gradient(135deg, ${col}, ${colLight})` }}>
                <div className={cc.infoBannerAvatar} style={{ color: col }}>🏫</div>
                <div className={cc.infoBannerText}>
                  <div className={cc.infoBannerName}>{infoClass.name}</div>
                  <div className={cc.infoBannerSub}>{infoClass.classCode}</div>
                </div>
                <button className={cc.infoBannerClose} onClick={() => setInfoClass(null)}>✕</button>
              </div>

              <div className={cc.infoBody}>
                <div className={cc.infoGrid}>
                  <div className={cc.infoItem}>
                    <div className={cc.infoItemLabel}>📅 ឆ្នាំសិក្សា</div>
                    <div className={cc.infoItemValue}>{infoClass.academicYear ?? '—'}</div>
                  </div>
                  <div className={cc.infoItem}>
                    <div className={cc.infoItemLabel}>👥 សមត្ថភាព</div>
                    <div className={cc.infoItemValue}>{infoClass.maxStudents != null ? `${infoClass.maxStudents} នាក់` : '—'}</div>
                  </div>
                </div>

                {infoClass.notes && (
                  <div className={cc.infoItem}>
                    <div className={cc.infoItemLabel}>📝 កំណត់ចំណាំ</div>
                    <div className={cc.infoItemValue} style={{ fontWeight: 500 }}>{infoClass.notes}</div>
                  </div>
                )}

                <div className={cc.infoMeta}>
                  <div className={cc.infoMetaRow}>
                    <span className={cc.infoMetaKey}>🗓 បង្កើតនៅ</span>
                    <span className={cc.infoMetaVal}>
                      {new Date(infoClass.createdAt).toLocaleDateString('km-KH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div className={cc.infoMetaRow}>
                    <span className={cc.infoMetaKey}>🔄 ធ្វើបច្ចុប្បន្នភាព</span>
                    <span className={cc.infoMetaVal}>
                      {new Date(infoClass.updatedAt).toLocaleDateString('km-KH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                <button className={cc.infoCloseBtn} onClick={() => setInfoClass(null)}>បិទ</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Export Modal ── */}
      {exportModal && (
        <ExportModal
          classes={selectedIds.size > 0 ? filtered.filter(c => selectedIds.has(c.id)) : filtered}
          onClose={() => setExportModal(false)}
        />
      )}

      {/* ── Bulk delete confirm ── */}
      {bulkDeleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => !bulkDeleting && setBulkDeleteConfirm(false)}>
          <div className={`glass-panel ${styles.confirmCard}`} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#f87171' }}>⚠️ លុបថ្នាក់ {selectedIds.size} ថ្នាក់?</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 14, lineHeight: 1.7, fontSize: '0.92rem' }}>
              ទិន្នន័យ<strong style={{ color: 'var(--color-text-primary)' }}> មិនអាចស្ដារវិញបានទេ</strong>។
            </p>
            <div className={styles.formActions} style={{ marginTop: 28 }}>
              <button className={styles.cancelBtn} onClick={() => setBulkDeleteConfirm(false)} disabled={bulkDeleting}>បោះបង់</button>
              <button className="btn-primary" style={{ background: 'rgba(239,68,68,0.85)' }}
                onClick={handleBulkDelete} disabled={bulkDeleting}>
                {bulkDeleting ? 'កំពុងលុប...' : `លុបចោល ${selectedIds.size} ថ្នាក់`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit modal ── */}
      {modal && (
        <div className={styles.modalOverlay} onClick={() => !submitting && setModal(false)}>
          <div className={`glass-panel ${styles.modalCard}`} style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingId ? `កែប្រែ — ${editingCode}` : 'បន្ថែមថ្នាក់ថ្មី'}</h3>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.formError}>{error}</div>}

              <div className={styles.formGroup}>
                <label>ឈ្មោះថ្នាក់ *</label>
                <input type="text" className={styles.input} required autoFocus
                  placeholder="ឧ. ថ្នាក់ទី ១២A"
                  value={form.name} onChange={e => set('name', e.target.value)} />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>ឆ្នាំសិក្សា</label>
                  <input className={styles.input} value={CURRENT_YEAR} readOnly
                    style={{ background: 'var(--color-surface-secondary, #f8fafc)', cursor: 'default', color: 'var(--color-text-secondary)' }} />
                </div>
                <div className={styles.formGroup}>
                  <label>ចំនួនសិស្សអតិបរមា</label>
                  <input type="number" className={styles.input} min={1} max={200}
                    placeholder="ឧ. 40"
                    value={form.maxStudents} onChange={e => set('maxStudents', e.target.value)} />
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

      {/* ── Single delete confirm ── */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={`glass-panel ${styles.confirmCard}`} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#f87171' }}>⚠️ លុបថ្នាក់?</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 14, lineHeight: 1.7, fontSize: '0.92rem' }}>
              ទិន្នន័យ<strong style={{ color: 'var(--color-text-primary)' }}> មិនអាចស្ដារវិញបានទេ</strong>។
            </p>
            <div className={styles.formActions} style={{ marginTop: 28 }}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)} disabled={deleting}>បោះបង់</button>
              <button className="btn-primary" style={{ background: 'rgba(239,68,68,0.85)' }}
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
