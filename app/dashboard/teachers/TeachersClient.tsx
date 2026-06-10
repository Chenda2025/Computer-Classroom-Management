'use client';
import { useState, useMemo, useEffect } from 'react';
import { parsePermissions, canInsert, canWrite, canDelete } from '../../../lib/permissions';
import styles from '../students/students.module.css';
import tc from './teachers.module.css';
import ExportModal from './ExportModal';

interface Teacher {
  id: string;
  teacherCode: string;
  name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  subject: string | null;
  photoUrl?: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Course {
  id: string;
  name: string;
}

interface Props {
  initialTeachers: Teacher[];
  courses: Course[];
  userRole: string;
  userPerms: string;
}

const EMPTY = {
  name: '', phone: '',
  gender: '', dateOfBirth: '', nationality: '',
  subject: '', photoUrl: '',
};

const SUBJECT_COLORS: Record<string, string> = {
  'គណិតវិទ្យា':    '#6366f1',
  'ភាសាខ្មែរ':     '#10b981',
  'ភាសាអង់គ្លេស': '#f59e0b',
  'វិទ្យាសាស្ត្រ': '#3b82f6',
  'ប្រវត្តិវិទ្យា': '#8b5cf6',
  'ភូមិវិទ្យា':     '#14b8a6',
  'អក្សរសាស្ត្រ':  '#ec4899',
  'សិល្បៈ':         '#f97316',
  'IT':              '#06b6d4',
  'ក្រមសីលធម៌':    '#84cc16',
};

function subjectColor(subject: string | null) {
  if (!subject) return '#94a3b8';
  for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
    if (subject.includes(key)) return color;
  }
  return '#6366f1';
}

export default function TeachersClient({ initialTeachers, courses, userRole, userPerms }: Props) {
  const permMap = useMemo(() => parsePermissions(userPerms), [userPerms]);
  const canIns = canInsert(permMap, 'teachers', userRole);
  const canWri = canWrite(permMap, 'teachers', userRole);
  const canDel = canDelete(permMap, 'teachers', userRole);
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGender, setFilterGender] = useState('');

  const [uploading, setUploading] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [infoTeacher, setInfoTeacher] = useState<Teacher | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);

  // View mode — persisted in localStorage
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  useEffect(() => {
    const saved = localStorage.getItem('teacherViewMode') as 'table' | 'card' | null;
    if (saved === 'card' || saved === 'table') setViewMode(saved);
  }, []);
  const switchViewMode = (mode: 'table' | 'card') => {
    setViewMode(mode);
    localStorage.setItem('teacherViewMode', mode);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('km-KH', { year: 'numeric', month: 'short', day: 'numeric' });

  const genderOptions = useMemo(
    () => Array.from(new Set(teachers.map(t => t.gender).filter(Boolean) as string[])),
    [teachers]
  );

  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach(t => {
      if (t.subject) {
        t.subject.split(',').forEach(s => set.add(s.trim()));
      }
    });
    return Array.from(set).filter(Boolean);
  }, [teachers]);

  const uniqueSubjects = allSubjects.length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return teachers.filter(t => {
      if (q && !(
        t.name.toLowerCase().includes(q) ||
        t.teacherCode.toLowerCase().includes(q) ||
        (t.phone && t.phone.includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q))
      )) return false;
      if (filterSubject && (!t.subject || !t.subject.includes(filterSubject))) return false;
      if (filterGender && t.gender !== filterGender) return false;
      return true;
    });
  }, [teachers, search, filterSubject, filterGender]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const allPageSelected = paginated.length > 0 && paginated.every(t => selectedIds.has(t.id));
  const somePageSelected = paginated.some(t => selectedIds.has(t.id));
  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => { const n = new Set(prev); paginated.forEach(t => n.delete(t.id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); paginated.forEach(t => n.add(t.id)); return n; });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload?folder=teachers', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) setForm(p => ({ ...p, photoUrl: data.url }));
    } finally { setUploading(false); }
  };

  const openAdd = () => { setForm(EMPTY); setEditingId(null); setEditingCode(''); setError(''); setModal(true); };
  const openEdit = (t: Teacher) => {
    setForm({ name: t.name, phone: t.phone ?? '', gender: t.gender ?? '',
      dateOfBirth: t.dateOfBirth ?? '', nationality: t.nationality ?? '', subject: t.subject ?? '',
      photoUrl: (t as any).photoUrl ?? '' });
    setEditingId(t.id); setEditingCode(t.teacherCode); setError(''); setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      const url = editingId ? `/api/teachers/${editingId}` : '/api/teachers';
      const res = await fetch(url, { method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'មានបញ្ហាកើតឡើង'); return; }
      if (editingId) setTeachers(prev => prev.map(t => t.id === editingId ? { ...t, ...data } : t));
      else setTeachers(prev => [data, ...prev]);
      setModal(false);
    } finally { setSubmitting(false); }
  };

  const [tgSendingProfile, setTgSendingProfile] = useState(false);

  const handleBulkTelegramProfiles = async () => {
    if (!confirm(`តើអ្នកពិតជាចង់ផ្ញើប្រវត្តិរូបគ្រូចំនួន ${selectedIds.size} នាក់ ចូល Telegram មែនទេ?`)) return;
    
    setTgSendingProfile(true);
    let successCount = 0;
    try {
      const selectedTeachers = teachers.filter(t => selectedIds.has(t.id));
      for (const t of selectedTeachers) {
        const caption = `🎓 <b>Profile: Full Information Teacher</b>\n` +
          `🆔 កូដ: ${t.teacherCode}\n` +
          `👤 ឈ្មោះ: ${t.name}\n` +
          `⚧ ភេទ: ${t.gender === 'M' ? 'ប្រុស' : t.gender === 'F' ? 'ស្រី' : t.gender || '—'}\n` +
          `📱 ទូរស័ព្ទ: ${t.phone || 'គ្មាន'}\n` +
          `📚 មុខវិជ្ជា: ${t.subject || '—'}\n` +
          `🗓 ថ្ងៃខែឆ្នាំកំណើត: ${t.dateOfBirth || '—'}`;

        const fd = new FormData();
        fd.append('caption', caption);
        
        if (t.photoUrl) {
          try {
            const photoRes = await fetch(t.photoUrl);
            if (photoRes.ok) {
              const blob = await photoRes.blob();
              fd.append('file', blob);
              fd.append('filename', 'profile.jpg');
            }
          } catch (e) {
            console.warn('Failed to fetch photo, sending text only', e);
          }
        }
        
        const res = await fetch('/api/export/telegram', { method: 'POST', body: fd });
        if (res.ok) successCount++;
        
        await new Promise(r => setTimeout(r, 500)); // anti-spam
      }
      alert(`ផ្ញើចូល Telegram បានជោគជ័យ ចំនួន ${successCount}/${selectedTeachers.length} ✓`);
      setSelectedIds(new Set());
    } catch (err: any) {
      alert('មានបញ្ហាពេលផ្ញើ៖ ' + err.message);
    } finally {
      setTgSendingProfile(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try {
      await fetch(`/api/teachers/${deleteTarget}`, { method: 'DELETE' });
      setTeachers(prev => prev.filter(t => t.id !== deleteTarget));
    } finally { setDeleteTarget(null); setDeleting(false); }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await fetch('/api/teachers', { method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }) });
      setTeachers(prev => prev.filter(t => !selectedIds.has(t.id)));
      setSelectedIds(new Set()); setBulkDeleteConfirm(false);
    } finally { setBulkDeleting(false); }
  };

  const set = (k: keyof typeof EMPTY, v: string) => setForm(p => ({ ...p, [k]: v }));

  // ── Pagination bar ──
  const PaginationBar = () => totalPages <= 1 ? null : (
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

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h2>បញ្ជីគ្រូបង្រៀន</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
            គ្រូសរុប: <strong style={{ color: 'var(--color-accent)' }}>{teachers.length}</strong> នាក់
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" onClick={() => setExportModal(true)}>
            📥 មើលរបាយការណ៍/នាំចេញ
          </button>
          {canIns && <button className="btn-primary" onClick={openAdd}>+ បន្ថែមគ្រូ</button>}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconBlue}`}>👨‍🏫</div>
          <div>
            <div className={styles.statLabel}>គ្រូបង្រៀនសរុប</div>
            <div className={styles.statValue}>{teachers.length}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconGreen}`}>📖</div>
          <div>
            <div className={styles.statLabel}>មុខវិជ្ជា</div>
            <div className={styles.statValue}>{uniqueSubjects}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconOrange}`}>♂♀</div>
          <div>
            <div className={styles.statLabel}>ប្រុស / ស្រី</div>
            <div className={styles.statValue}>
              {teachers.filter(t => t.gender === 'M').length}
              <span style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', margin: '0 4px' }}>/</span>
              {teachers.filter(t => t.gender === 'F').length}
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>⌕</span>
          <input type="text" className={styles.searchInput}
            placeholder="ស្វែងរកតាមឈ្មោះ, លេខកូដ, មុខវិជ្ជា..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); setSelectedIds(new Set()); }} />
        </div>

        <select className={styles.filterSelect} value={filterSubject}
          onChange={e => { setFilterSubject(e.target.value); setPage(1); setSelectedIds(new Set()); }}>
          <option value="">📖 មុខវិជ្ជាទាំងអស់</option>
          {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>

        <select className={styles.filterSelect} value={filterGender}
          onChange={e => { setFilterGender(e.target.value); setPage(1); setSelectedIds(new Set()); }}>
          <option value="">👤 ភេទទាំងអស់</option>
          {genderOptions.map(g => (
            <option key={g} value={g}>{g === 'M' ? 'ប្រុស' : g === 'F' ? 'ស្រី' : g}</option>
          ))}
        </select>

        {(search || filterSubject || filterGender) && (
          <span className={styles.resultCount}>{filtered.length} / {teachers.length} នាក់</span>
        )}

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

      {/* ── Empty state ── */}
      {paginated.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>👨‍🏫</div>
          <p>{(search || filterSubject || filterGender) ? 'រកមិនឃើញគ្រូដែលត្រូវនឹងការត្រង' : 'មិនទាន់មានគ្រូបង្រៀនទេ'}</p>
          {canIns && !search && !filterSubject && !filterGender && (
            <button className="btn-primary" onClick={openAdd} style={{ marginTop: 20 }}>បន្ថែមគ្រូដំបូង</button>
          )}
        </div>
      )}

      {/* ── Card grid ── */}
      {paginated.length > 0 && viewMode === 'card' && (
        <div className={tc.grid}>
          {paginated.map((t, i) => {
            const color = t.gender === 'M' ? '#4f46e5' : t.gender === 'F' ? '#db2777' : '#475569';
            const colorLight = t.gender === 'M' ? '#818cf8' : t.gender === 'F' ? '#f472b6' : '#94a3b8';
            const sc = subjectColor(t.subject);
            return (
              <div
                key={t.id}
                className={`${tc.card} ${selectedIds.has(t.id) ? tc.cardSelected : ''}`}
                style={{ '--card-color': color, '--card-color-light': colorLight, animationDelay: `${i * 45}ms` } as React.CSSProperties}
              >
                {/* Checkbox */}
                {canDel && (
                  <input type="checkbox" className={tc.cardCheck}
                    checked={selectedIds.has(t.id)}
                    onChange={() => toggleSelect(t.id)} />
                )}

                {/* Gradient hero */}
                <div className={tc.hero}>
                  <div className={tc.heroNumber}>{(safePage - 1) * PAGE_SIZE + i + 1}</div>
                  <div className={tc.avatarRing}>
                    {(t as any).photoUrl
                      ? <img src={(t as any).photoUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      : <div className={tc.avatarFallback}>{t.name.charAt(0)}</div>}
                  </div>
                  <div className={tc.heroName}>{t.name}</div>
                  <span className={tc.heroCode}>{t.teacherCode}</span>
                </div>

                {/* Subject badge */}
                {t.subject && (
                  <div className={tc.subjectWrap} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                    {t.subject.split(',').map(sub => {
                      const sName = sub.trim();
                      if (!sName) return null;
                      const sColor = subjectColor(sName);
                      return (
                        <span key={sName} className={tc.subjectBadge} style={{ background: sColor, color: '#ffffff', border: `1px solid ${sColor}`, fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 500 }}>
                          {sName}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Info */}
                <div className={tc.info}>
                  <div className={tc.infoRow}>
                    <span className={tc.infoIcon}>👤</span>
                    <span>{t.gender === 'M' ? 'ប្រុស' : t.gender === 'F' ? 'ស្រី' : '—'}</span>
                  </div>
                  <div className={tc.infoRow}>
                    <span className={tc.infoIcon}>📱</span>
                    <span>{t.phone ?? '—'}</span>
                  </div>
                  <div className={tc.infoRow}>
                    <span className={tc.infoIcon}>🗓</span>
                    <span>{t.dateOfBirth ?? '—'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className={tc.cardFooter}>
                  <button className={`${styles.actionBtn} ${tc.footerBtn} ${tc.infoBtn}`}
                    onClick={() => setInfoTeacher(t)} title="ព័ត៌មានលម្អិត">👁️ ព័ត៌មាន</button>
                  {canWri && (
                    <button className={`${styles.actionBtn} ${styles.editBtn} ${tc.footerBtn}`}
                      onClick={() => openEdit(t)}>✏️ កែប្រែ</button>
                  )}
                  {canDel && (
                    <button className={`${styles.actionBtn} ${styles.deleteBtn} ${tc.footerBtn}`}
                      onClick={() => setDeleteTarget(t.id)}>🗑️ លុប</button>
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
                {canDel && (
                  <th className={styles.checkCell}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={allPageSelected}
                      ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}
                <th>#</th>
                <th>លេខកូដ</th>
                <th>ឈ្មោះគ្រូ</th>
                <th>ភេទ</th>
                <th>លេខទូរស័ព្ទ</th>
                <th>មុខវិជ្ជា</th>
                <th>ថ្ងៃខែឆ្នាំកំណើត</th>
                <th>កាលបរិច្ឆេទ</th>
                <th></th>
                {(canWri || canDel) && <th>ការគ្រប់គ្រង</th>}
              </tr>
            </thead>
            <tbody>
              {paginated.map((t, i) => (
                <tr key={t.id} className={`${styles.row} ${selectedIds.has(t.id) ? styles.rowSelected : ''}`}>
                  {canDel && (
                    <td className={styles.checkCell}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelect(t.id)}
                      />
                    </td>
                  )}
                  <td className={styles.indexCell}>{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                  <td><span className={styles.codeBadge}>{t.teacherCode}</span></td>
                  <td className={styles.nameCell}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {(t as any).photoUrl
                        ? <img src={(t as any).photoUrl} alt="" className={styles.avatar} />
                        : <div className={styles.avatarPlaceholder}>{t.name.charAt(0)}</div>}
                      {t.name}
                    </div>
                  </td>
                  <td className={styles.mutedCell}>
                    {t.gender === 'M' ? 'ប្រុស' : t.gender === 'F' ? 'ស្រី' : '—'}
                  </td>
                  <td className={styles.mutedCell}>{t.phone ?? '—'}</td>
                  <td>
                    {!t.subject ? '—' : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {t.subject.split(',').map(sub => {
                          const sName = sub.trim();
                          if (!sName) return null;
                          const sColor = subjectColor(sName);
                          return (
                            <span key={sName} style={{ background: sColor, color: '#fff', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 500 }}>
                              {sName}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className={styles.mutedCell}>{t.dateOfBirth ?? '—'}</td>
                  <td className={styles.mutedCell}>{formatDate(t.createdAt)}</td>
                  <td>
                    <button
                      className={`${styles.actionBtn} ${styles.viewBtn}`}
                      onClick={() => setInfoTeacher(t)}
                      title="ព័ត៌មានលម្អិត"
                    >
                      👁️
                    </button>
                  </td>
                  {(canWri || canDel) && (
                    <td>
                      <div className={styles.actionGroup}>
                        {canWri && <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => openEdit(t)} title="កែប្រែ">✏️</button>}
                        {canDel && <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => setDeleteTarget(t.id)} title="លុប">🗑️</button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar />

      {/* ── Bulk bar ── */}
      {canDel && selectedIds.size > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>✓ បានជ្រើសរើស {selectedIds.size} នាក់</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={styles.bulkClearBtn} onClick={() => setExportModal(true)} style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}>
              📤 នាំចេញជារបាយការណ៍
            </button>
            <button className={styles.bulkClearBtn} onClick={handleBulkTelegramProfiles} disabled={tgSendingProfile} style={{ background: '#229ED9', color: '#fff', borderColor: '#229ED9' }}>
              {tgSendingProfile ? 'កំពុងផ្ញើ...' : '✈️ ផ្ញើចូល Telegram (កាត)'}
            </button>
            <button className={styles.bulkClearBtn} onClick={() => setSelectedIds(new Set())}>បោះបង់</button>
            <button className={styles.bulkDeleteBtn} onClick={() => setBulkDeleteConfirm(true)}>🗑️ លុប {selectedIds.size} នាក់</button>
          </div>
        </div>
      )}

      {/* ── Bulk delete confirm ── */}
      {bulkDeleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => !bulkDeleting && setBulkDeleteConfirm(false)}>
          <div className={`glass-panel ${styles.confirmCard}`} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#f87171' }}>⚠️ លុបគ្រូ {selectedIds.size} នាក់?</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 14, lineHeight: 1.7, fontSize: '0.92rem' }}>
              ទិន្នន័យ<strong style={{ color: 'var(--color-text-primary)' }}> មិនអាចស្ដារវិញបានទេ</strong>។
            </p>
            <div className={styles.formActions} style={{ marginTop: 28 }}>
              <button className={styles.cancelBtn} onClick={() => setBulkDeleteConfirm(false)} disabled={bulkDeleting}>បោះបង់</button>
              <button className="btn-primary" style={{ background: 'rgba(239,68,68,0.85)' }}
                onClick={handleBulkDelete} disabled={bulkDeleting}>
                {bulkDeleting ? 'កំពុងលុប...' : `លុបចោល ${selectedIds.size} នាក់`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit modal ── */}
      {modal && (
        <div className={styles.modalOverlay} onClick={() => !submitting && setModal(false)}>
          <div className={`glass-panel ${styles.modalCard}`} style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingId ? `កែប្រែ — ${editingCode}` : 'បន្ថែមគ្រូថ្មី'}</h3>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.formError}>{error}</div>}

              {/* ── Photo upload ── */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--color-border)', background: 'var(--color-surface-secondary, #f1f5f9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem' }}>
                  {form.photoUrl
                    ? <img src={form.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '👤'}
                </div>
                <input type="file" accept="image/*" id="teacher-photo-upload" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
                <label htmlFor="teacher-photo-upload" className="btn-primary" style={{ cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '0.78rem', padding: '5px 16px', opacity: uploading ? 0.6 : 1 }}>
                  {uploading ? 'កំពុងបញ្ចូល...' : form.photoUrl ? 'ប្តូររូបភាព' : '+ បន្ថែមរូបភាព'}
                </label>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>ឈ្មោះពេញ *</label>
                  <input type="text" className={styles.input} required autoFocus
                    placeholder="ឈ្មោះ និងនាមត្រកូល"
                    value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label>ភេទ</label>
                  <select className={styles.input} value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">-- ជ្រើសរើស --</option>
                    <option value="M">ប្រុស
                    </option>
                    <option value="F">ស្រី</option>
                  </select>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>លេខទូរស័ព្ទ</label>
                <input type="tel" className={styles.input} placeholder="012 345 678"
                  value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>ថ្ងៃខែឆ្នាំកំណើត</label>
                  <input type="date" className={styles.input}
                    value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label>សញ្ជាតិ</label>
                  <input type="text" className={styles.input} placeholder="ខ្មែរ"
                    value={form.nationality} onChange={e => set('nationality', e.target.value)} />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>មុខវិជ្ជា</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {courses.map(c => {
                    const selected = form.subject ? form.subject.split(',').map(s => s.trim()).filter(Boolean) : [];
                    const isChecked = selected.includes(c.name);
                    return (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isChecked ? '#0D044A' : '#f1f5f9', color: isChecked ? '#ffffff' : '#2602F2', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', cursor: 'pointer', border: isChecked ? '1px solid #0D044A' : '1px solid #2602F2', transition: 'all 0.2s' }}>
                        <input type="checkbox" checked={isChecked} style={{ margin: 0, accentColor: isChecked ? '#ffffff' : '#2602F2' }} onChange={e => {
                          if (e.target.checked) {
                            set('subject', [...selected, c.name].join(', '));
                          } else {
                            set('subject', selected.filter(s => s !== c.name).join(', '));
                          }
                        }} />
                        {c.name}
                      </label>
                    );
                  })}
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
            <h3 style={{ color: '#f87171' }}>⚠️ លុបគ្រូ?</h3>
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
      
      {exportModal && (
        <ExportModal
          teachers={selectedIds.size > 0 ? filtered.filter(t => selectedIds.has(t.id)) : filtered}
          onClose={() => setExportModal(false)}
        />
      )}

      {/* ── Info Modal ── */}
      {infoTeacher && (() => {
        const color = infoTeacher.gender === 'M' ? '#4f46e5' : infoTeacher.gender === 'F' ? '#db2777' : '#475569';
        const colorLight = infoTeacher.gender === 'M' ? '#818cf8' : infoTeacher.gender === 'F' ? '#f472b6' : '#94a3b8';
        return (
          <div className={styles.modalOverlay} onClick={() => setInfoTeacher(null)}>
            <div className={tc.infoModal} onClick={e => e.stopPropagation()}>
              <div className={tc.infoBanner} style={{ background: `linear-gradient(135deg, ${color}, ${colorLight})` }}>
                <div className={tc.infoBannerAvatar}>
                  {infoTeacher.photoUrl
                    ? <img src={infoTeacher.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color }}>{infoTeacher.name.charAt(0)}</span>}
                </div>
                <div className={tc.infoBannerText}>
                  <div className={tc.infoBannerName}>{infoTeacher.name}</div>
                  <div className={tc.infoBannerSub}>
                    {infoTeacher.teacherCode}{infoTeacher.subject ? ` • ${infoTeacher.subject}` : ''}
                  </div>
                </div>
                <button className={tc.infoBannerClose} onClick={() => setInfoTeacher(null)}>✕</button>
              </div>

              <div className={tc.infoBody}>
                <div className={tc.infoGrid}>
                  <div className={tc.infoItem}>
                    <div className={tc.infoItemLabel}>👤 ភេទ</div>
                    <div className={tc.infoItemValue}>{infoTeacher.gender === 'M' ? 'ប្រុស' : infoTeacher.gender === 'F' ? 'ស្រី' : '—'}</div>
                  </div>
                  <div className={tc.infoItem}>
                    <div className={tc.infoItemLabel}>🗓 ថ្ងៃខែឆ្នាំកំណើត</div>
                    <div className={tc.infoItemValue}>{infoTeacher.dateOfBirth ?? '—'}</div>
                  </div>
                  <div className={tc.infoItem}>
                    <div className={tc.infoItemLabel}>📱 ទូរស័ព្ទ</div>
                    <div className={tc.infoItemValue}>{infoTeacher.phone ?? '—'}</div>
                  </div>
                  <div className={tc.infoItem}>
                    <div className={tc.infoItemLabel}>🌏 សញ្ជាតិ</div>
                    <div className={tc.infoItemValue}>{infoTeacher.nationality ?? '—'}</div>
                  </div>
                </div>

                <div className={tc.infoItem}>
                  <div className={tc.infoItemLabel}>📖 មុខវិជ្ជា</div>
                  <div className={tc.infoItemValue} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                    {!infoTeacher.subject ? '—' : infoTeacher.subject.split(',').map(sub => {
                      const sName = sub.trim();
                      if (!sName) return null;
                      const sColor = subjectColor(sName);
                      return (
                        <span key={sName} style={{ background: sColor, color: '#ffffff', border: `1px solid ${sColor}`, fontSize: '0.85rem', padding: '2px 10px', borderRadius: '12px', fontWeight: 500 }}>
                          {sName}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {infoTeacher.notes && (
                  <div className={tc.infoItem}>
                    <div className={tc.infoItemLabel}>📝 កំណត់ចំណាំ</div>
                    <div className={tc.infoItemValue} style={{ fontWeight: 500 }}>{infoTeacher.notes}</div>
                  </div>
                )}

                <div className={tc.infoMeta}>
                  <div className={tc.infoMetaRow}>
                    <span className={tc.infoMetaKey}>🗓 បង្កើតនៅ</span>
                    <span className={tc.infoMetaVal}>
                      {new Date(infoTeacher.createdAt).toLocaleDateString('km-KH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div className={tc.infoMetaRow}>
                    <span className={tc.infoMetaKey}>🔄 ធ្វើបច្ចុប្បន្នភាព</span>
                    <span className={tc.infoMetaVal}>
                      {new Date(infoTeacher.updatedAt).toLocaleDateString('km-KH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                <button className={tc.infoCloseBtn} onClick={() => setInfoTeacher(null)}>បិទ</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
