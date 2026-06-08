'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import styles from '../students/students.module.css';
import k from './pagodas.module.css';

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    background: state.isFocused ? '#ffffff' : '#f8fafc',
    borderColor: state.isFocused ? 'var(--color-accent)' : 'var(--color-border)',
    borderWidth: '1.5px',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.1)' : 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem',
    minHeight: '44px',
    transition: 'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
    '&:hover': {
      borderColor: state.isFocused ? 'var(--color-accent)' : 'var(--color-border)',
    }
  }),
  menu: (base: any) => ({
    ...base,
    zIndex: 9999,
  }),
  menuPortal: (base: any) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: '0.9rem',
    backgroundColor: state.isSelected ? 'var(--color-accent)' : state.isFocused ? '#f1f5f9' : 'transparent',
    color: state.isSelected ? '#fff' : 'var(--color-text-primary)',
    cursor: 'pointer',
  }),
  singleValue: (base: any) => ({
    ...base,
    color: 'var(--color-text-primary)',
  }),
  placeholder: (base: any) => ({
    ...base,
    color: 'var(--color-text-muted)',
  }),
};

interface Monk {
  id: string; name: string; age: string | null; gender: string | null; phone: string | null;
}

interface Kuti {
  id: string; name: string; floor: string | null;
  number: string | null; headId: string | null; subHeadId: string | null; notes: string | null;
  pagodaId: string;
  head: Monk | null; subHead: Monk | null;
}

interface Pagoda {
  id: string; name: string; province: string | null; district: string | null;
  commune: string | null; village: string | null;
  phone: string | null; notes: string | null;
  _count: { kutis: number };
}

interface Props { initialPagodas: Pagoda[]; userRole: string; }

const EMPTY_PAGODA = { name: '', province: '', district: '', commune: '', village: '', phone: '', notes: '' };
const EMPTY_KUTI   = { pagodaId: '', name: '', floor: '', number: '', headId: '', subHeadId: '', notes: '' };
const EMPTY_MONK   = { id: '', name: '', age: '', gender: 'ប្រុស', phone: '' };

export default function PagodasClient({ initialPagodas, userRole }: Props) {
  const isAdmin = userRole === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'pagodas' | 'kutis'>('pagodas');

  // Data State
  const [pagodas, setPagodas] = useState<Pagoda[]>(initialPagodas);
  const [kutis, setKutis] = useState<Kuti[]>([]);
  const [headMonks, setHeadMonks] = useState<Monk[]>([]);
  const [subHeadMonks, setSubHeadMonks] = useState<Monk[]>([]);
  const [search, setSearch] = useState('');
  const [filterPagodaId, setFilterPagodaId] = useState<string>('');

  // Modals & Forms
  const [pagodaModal, setPagodaModal] = useState(false);
  const [pagodaForm, setPagodaForm] = useState(EMPTY_PAGODA);
  const [editingPagodaId, setEditingPagodaId] = useState<string | null>(null);
  const [pagodaSubmitting, setPagodaSubmitting] = useState(false);

  const [kutiModal, setKutiModal] = useState(false);
  const [kutiFormList, setKutiFormList] = useState<any[]>([{ ...EMPTY_KUTI }]);
  const [editingKutiId, setEditingKutiId] = useState<string | null>(null);
  const [kutiSubmitting, setKutiSubmitting] = useState(false);

  const [monkModal, setMonkModal] = useState(false);
  const [monkFormList, setMonkFormList] = useState<Monk[]>([{ ...EMPTY_MONK }]);
  const [monkSubmitting, setMonkSubmitting] = useState(false);
  // To remember which field to update when a new monk is added from the kuti form
  const [monkTargetField, setMonkTargetField] = useState<'headId' | 'subHeadId' | null>(null);
  // To remember which Kuti row we are adding a monk for
  const [monkTargetRowIndex, setMonkTargetRowIndex] = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'pagoda' | 'kuti', id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch initial data for Kutis and Monks when the component mounts
  useEffect(() => {
    fetch('/api/head-monks').then(res => res.json()).then(setHeadMonks).catch(console.error);
    fetch('/api/sub-head-monks').then(res => res.json()).then(setSubHeadMonks).catch(console.error);
    fetch('/api/kutis').then(res => res.json()).then(setKutis).catch(console.error);
  }, []);

  const PAGE_SIZE = 15;
  const [pagodaPage, setPagodaPage] = useState(1);
  const [kutiPage, setKutiPage] = useState(1);

  const filteredPagodas = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return pagodas;
    return pagodas.filter(p => p.name.toLowerCase().includes(q));
  }, [pagodas, search]);

  const filteredKutis = useMemo(() => {
    const q = search.toLowerCase().trim();
    return kutis.filter(ku => {
      if (filterPagodaId && ku.pagodaId !== filterPagodaId) return false;
      if (!q) return true;
      return ku.name.toLowerCase().includes(q) ||
        (ku.head?.name && ku.head.name.toLowerCase().includes(q)) ||
        (ku.subHead?.name && ku.subHead.name.toLowerCase().includes(q));
    });
  }, [kutis, search, filterPagodaId]);

  const totalPagodaPages = Math.max(1, Math.ceil(filteredPagodas.length / PAGE_SIZE));
  const safePagodaPage = Math.min(pagodaPage, totalPagodaPages);
  const paginatedPagodas = filteredPagodas.slice((safePagodaPage - 1) * PAGE_SIZE, safePagodaPage * PAGE_SIZE);

  const totalKutiPages = Math.max(1, Math.ceil(filteredKutis.length / PAGE_SIZE));
  const safeKutiPage = Math.min(kutiPage, totalKutiPages);
  const paginatedKutis = filteredKutis.slice((safeKutiPage - 1) * PAGE_SIZE, safeKutiPage * PAGE_SIZE);

  // ── Handlers: Pagodas ──
  const openAddPagoda = () => { setPagodaForm(EMPTY_PAGODA); setEditingPagodaId(null); setPagodaModal(true); };
  const handlePagodaSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); setPagodaSubmitting(true);
    try {
      const url = editingPagodaId ? `/api/pagodas/${editingPagodaId}` : '/api/pagodas';
      const res = await fetch(url, {
        method: editingPagodaId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pagodaForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (editingPagodaId) {
        setPagodas(prev => prev.map(p => p.id === editingPagodaId ? { ...p, ...data, _count: p._count } : p));
      } else {
        setPagodas(prev => [...prev, { ...data, _count: { kutis: 0 } }]);
      }
      setPagodaModal(false);
    } catch (e) {
      alert(e);
    } finally { setPagodaSubmitting(false); }
  };

  // ── Handlers: Kutis ──
  const openAddKuti = () => { setKutiFormList([{ ...EMPTY_KUTI }]); setEditingKutiId(null); setKutiModal(true); };
  const openEditKuti = (kuti: any) => { setKutiFormList([{ pagodaId: kuti.pagodaId, name: kuti.name, floor: kuti.floor, number: kuti.number, headId: kuti.headId, subHeadId: kuti.subHeadId, notes: kuti.notes }]); setEditingKutiId(kuti.id); setKutiModal(true); };
  const handleKutiSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); setKutiSubmitting(true);
    try {
      const url = editingKutiId ? `/api/kutis/${editingKutiId}` : '/api/kutis';
      const payload = editingKutiId ? kutiFormList[0] : kutiFormList;
      const res = await fetch(url, {
        method: editingKutiId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (editingKutiId) {
        setKutis(prev => prev.map(k => k.id === editingKutiId ? data : k));
      } else {
        const newKutis = Array.isArray(data) ? data : [data];
        setKutis(prev => [...prev, ...newKutis]);
        // Update pagoda count locally
        const addedCounts: Record<string, number> = {};
        newKutis.forEach((k: any) => { addedCounts[k.pagodaId] = (addedCounts[k.pagodaId] || 0) + 1; });
        setPagodas(prev => prev.map(p => addedCounts[p.id] ? { ...p, _count: { kutis: p._count.kutis + addedCounts[p.id] } } : p));
      }
      setKutiModal(false);
    } catch (e) {
      alert(e);
    } finally { setKutiSubmitting(false); }
  };

  // ── Handlers: Monks ──
  const openAddMonk = (targetField: 'headId' | 'subHeadId', rowIndex?: number) => {
    setMonkFormList([{ ...EMPTY_MONK }]);
    setMonkTargetField(targetField);
    setMonkTargetRowIndex(rowIndex ?? null);
    setMonkModal(true);
  };
  const handleMonkSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); setMonkSubmitting(true);
    try {
      const endpoint = monkTargetField === 'headId' ? '/api/head-monks' : '/api/sub-head-monks';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(monkFormList),
      });
      const dataArray = await res.json();
      if (!res.ok) throw new Error(dataArray.error || 'Failed to save');
      
      if (monkTargetField === 'headId') {
        setHeadMonks(prev => [...prev, ...dataArray].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        setSubHeadMonks(prev => [...prev, ...dataArray].sort((a, b) => a.name.localeCompare(b.name)));
      }

      if (kutiModal && monkTargetField && dataArray.length > 0) {
        setKutiFormList(prev => prev.map((f, i) => i === monkTargetRowIndex ? { ...f, [monkTargetField]: dataArray[0].id } : f));
      }
      setMonkModal(false);
    } catch (e) {
      alert(e);
    } finally { setMonkSubmitting(false); }
  };


  // ── Handlers: Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try {
      if (deleteTarget.type === 'pagoda') {
        await fetch(`/api/pagodas/${deleteTarget.id}`, { method: 'DELETE' });
        setPagodas(prev => prev.filter(p => p.id !== deleteTarget.id));
      } else {
        await fetch(`/api/kutis/${deleteTarget.id}`, { method: 'DELETE' });
        const targetKuti = kutis.find(k => k.id === deleteTarget.id);
        setKutis(prev => prev.filter(ku => ku.id !== deleteTarget.id));
        if (targetKuti) {
          setPagodas(prev => prev.map(p => p.id === targetKuti.pagodaId ? { ...p, _count: { kutis: Math.max(0, p._count.kutis - 1) } } : p));
        }
      }
    } finally { setDeleteTarget(null); setDeleting(false); }
  };

  const getPagodaName = (id: string) => pagodas.find(p => p.id === id)?.name ?? '—';

  return (
    <>
      <div className="animate-fade-in">
        <div className={styles.pageHeader}>
          <div>
            <h2>គ្រប់គ្រងទីតាំង</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
              វត្តសរុប: <strong style={{ color: 'var(--color-accent)' }}>{pagodas.length}</strong> | 
              កុដិសរុប: <strong style={{ color: 'var(--color-accent)' }}>{kutis.length}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {isAdmin && <button className="btn-outline" onClick={openAddPagoda}>+ បន្ថែមវត្ត</button>}
            {isAdmin && <button className="btn-primary" onClick={openAddKuti}>+ បន្ថែមកុដិ</button>}
          </div>
        </div>

      <div className={k.tabs}>
        <button className={`${k.tab} ${activeTab === 'pagodas' ? k.tabActive : ''}`} onClick={() => setActiveTab('pagodas')}>បញ្ជីវត្ត</button>
        <button className={`${k.tab} ${activeTab === 'kutis' ? k.tabActive : ''}`} onClick={() => setActiveTab('kutis')}>បញ្ជីកុដិ</button>
      </div>

      <div className={styles.toolbar} style={{ display: 'flex', gap: 16 }}>
        <div className={styles.searchWrapper} style={{ flex: 1 }}>
          <span className={styles.searchIcon}>⌕</span>
          <input type="text" className={styles.searchInput}
            placeholder="ស្វែងរក..."
            value={search} onChange={e => { setSearch(e.target.value); setPagodaPage(1); setKutiPage(1); }} />
        </div>
        {activeTab === 'kutis' && (
          <div style={{ width: 250 }}>
            <Select 
              styles={selectStyles}
              placeholder="-- ត្រងតាមវត្ត --"
              options={pagodas.map(p => ({ value: p.id, label: p.name }))}
              value={filterPagodaId ? { value: filterPagodaId, label: pagodas.find(p => p.id === filterPagodaId)?.name } : null}
              onChange={(option: any) => { setFilterPagodaId(option?.value || ''); setKutiPage(1); }}
              isClearable
            />
          </div>
        )}
      </div>

      {/* ── Pagoda cards ── */}
      {activeTab === 'pagodas' && (
        paginatedPagodas.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏛️</div>
            <p>{search ? 'រកមិនឃើញវត្ត' : 'មិនទាន់មានវត្តទេ'}</p>
          </div>
        ) : (
          <div className={k.cardGrid}>
            {paginatedPagodas.map((p, i) => (
              <div key={p.id} className={k.pagodaCard} style={{ animationDelay: `${i * 40}ms` }}>
                <div className={k.pagodaHero}>
                  <span className={k.cardNum}>{(safePagodaPage - 1) * PAGE_SIZE + i + 1}</span>
                  <div className={k.pagodaIconWrap}>🏛️</div>
                  <div className={k.pagodaName}>{p.name}</div>
                  <span className={k.kutiCountBadge}>🏠 {p._count.kutis} កុដិ</span>
                </div>
                <div className={k.cardInfo}>
                  <div className={k.cardInfoRow}><span className={k.cardInfoIcon}>📍</span><span>{[p.province, p.district].filter(Boolean).join(', ') || '—'}</span></div>
                  <div className={k.cardInfoRow}><span className={k.cardInfoIcon}>🏘️</span><span>{[p.commune, p.village].filter(Boolean).join(', ') || '—'}</span></div>
                  <div className={k.cardInfoRow}><span className={k.cardInfoIcon}>📱</span><span>{p.phone ?? '—'}</span></div>
                </div>
                {isAdmin && (
                  <div className={k.cardFooter}>
                    <button className={`${styles.actionBtn} ${styles.editBtn} ${k.footerBtn}`} onClick={() => {
                      setPagodaForm({ name: p.name, province: p.province ?? '', district: p.district ?? '', commune: p.commune ?? '', village: p.village ?? '', phone: p.phone ?? '', notes: p.notes ?? '' });
                      setEditingPagodaId(p.id); setPagodaModal(true);
                    }}>✏️ កែប្រែ</button>
                    <button className={`${styles.actionBtn} ${styles.deleteBtn} ${k.footerBtn}`} onClick={() => setDeleteTarget({ type: 'pagoda', id: p.id })}>🗑️ លុប</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Kuti cards ── */}
      {activeTab === 'kutis' && (
        paginatedKutis.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏠</div>
            <p>{search ? 'រកមិនឃើញកុដិ' : 'មិនទាន់មានកុដិទេ'}</p>
          </div>
        ) : (
          <div className={k.cardGrid}>
            {paginatedKutis.map((ku, i) => (
              <div key={ku.id} className={k.kutiCard} style={{ animationDelay: `${i * 40}ms` }}>
                <div className={k.kutiHero}>
                  <span className={k.cardNum}>{(safeKutiPage - 1) * PAGE_SIZE + i + 1}</span>
                  <div className={k.kutiIconWrap}>🏠</div>
                  <div className={k.kutiName}>{ku.name}</div>
                  <span className={k.pagodaTag}>{getPagodaName(ku.pagodaId)}</span>
                </div>
                <div className={k.cardInfo}>
                  <div className={k.cardInfoRow}><span className={k.cardInfoIcon}>👤</span><span>{ku.head?.name ?? '—'} <span className={k.infoLabel}>មេកុដិ</span></span></div>
                  <div className={k.cardInfoRow}><span className={k.cardInfoIcon}>👤</span><span>{ku.subHead?.name ?? '—'} <span className={k.infoLabel}>អនុ</span></span></div>
                  {ku.floor && <div className={k.cardInfoRow}><span className={k.cardInfoIcon}>🏢</span><span>ជាន់ {ku.floor}</span></div>}
                  {ku.number && <div className={k.cardInfoRow}><span className={k.cardInfoIcon}>#</span><span>លេខ {ku.number}</span></div>}
                </div>
                {isAdmin && (
                  <div className={k.cardFooter}>
                    <button className={`${styles.actionBtn} ${styles.editBtn} ${k.footerBtn}`} onClick={() => openEditKuti(ku)}>✏️ កែប្រែ</button>
                    <button className={`${styles.actionBtn} ${styles.deleteBtn} ${k.footerBtn}`} onClick={() => setDeleteTarget({ type: 'kuti', id: ku.id })}>🗑️ លុប</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Pagoda pagination ── */}
      {activeTab === 'pagodas' && totalPagodaPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            បង្ហាញ {(safePagodaPage - 1) * PAGE_SIZE + 1}–{Math.min(safePagodaPage * PAGE_SIZE, filteredPagodas.length)} / {filteredPagodas.length} វត្ត
          </span>
          <div className={styles.paginationBtns}>
            <button className={styles.pageBtn} onClick={() => setPagodaPage(p => Math.max(1, p - 1))} disabled={safePagodaPage === 1}>‹</button>
            {Array.from({ length: totalPagodaPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPagodaPages || Math.abs(n - safePagodaPage) <= 2)
              .reduce<(number | '...')[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(n);
                return acc;
              }, [])
              .map((n, idx) =>
                n === '...' ? (
                  <span key={`e-${idx}`} className={styles.pageEllipsis}>…</span>
                ) : (
                  <button key={n} className={`${styles.pageBtn} ${safePagodaPage === n ? styles.pageBtnActive : ''}`} onClick={() => setPagodaPage(n as number)}>{n}</button>
                )
              )}
            <button className={styles.pageBtn} onClick={() => setPagodaPage(p => Math.min(totalPagodaPages, p + 1))} disabled={safePagodaPage === totalPagodaPages}>›</button>
          </div>
        </div>
      )}

      {/* ── Kuti pagination ── */}
      {activeTab === 'kutis' && totalKutiPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            បង្ហាញ {(safeKutiPage - 1) * PAGE_SIZE + 1}–{Math.min(safeKutiPage * PAGE_SIZE, filteredKutis.length)} / {filteredKutis.length} កុដិ
          </span>
          <div className={styles.paginationBtns}>
            <button className={styles.pageBtn} onClick={() => setKutiPage(p => Math.max(1, p - 1))} disabled={safeKutiPage === 1}>‹</button>
            {Array.from({ length: totalKutiPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalKutiPages || Math.abs(n - safeKutiPage) <= 2)
              .reduce<(number | '...')[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(n);
                return acc;
              }, [])
              .map((n, idx) =>
                n === '...' ? (
                  <span key={`e-${idx}`} className={styles.pageEllipsis}>…</span>
                ) : (
                  <button key={n} className={`${styles.pageBtn} ${safeKutiPage === n ? styles.pageBtnActive : ''}`} onClick={() => setKutiPage(n as number)}>{n}</button>
                )
              )}
            <button className={styles.pageBtn} onClick={() => setKutiPage(p => Math.min(totalKutiPages, p + 1))} disabled={safeKutiPage === totalKutiPages}>›</button>
          </div>
        </div>
      )}
    </div>

      {/* ── Pagoda Modal ── */}
      {pagodaModal && (
        <div className={styles.modalOverlay} onClick={() => !pagodaSubmitting && setPagodaModal(false)} style={{ zIndex: 1000 }}>
          <div className={`glass-panel ${styles.modalCard}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingPagodaId ? 'កែប្រែវត្ត' : 'បន្ថែមវត្ត'}</h3>
              <button className={styles.closeBtn} onClick={() => setPagodaModal(false)}>✕</button>
            </div>
            <form onSubmit={handlePagodaSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label>ឈ្មោះវត្ត *</label>
                <input type="text" className={styles.input} required autoFocus
                  value={pagodaForm.name} onChange={e => setPagodaForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setPagodaModal(false)} disabled={pagodaSubmitting}>បោះបង់</button>
                <button type="submit" className="btn-primary" disabled={pagodaSubmitting}>រក្សាទុក</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Kuti Modal ── */}
      {kutiModal && (
        <div className={styles.modalOverlay} onClick={() => !kutiSubmitting && setKutiModal(false)} style={{ zIndex: 500 }}>
          <div className={`glass-panel ${styles.modalCard}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingKutiId ? 'កែប្រែកុដិ' : 'បន្ថែមកុដិ'}</h3>
              <button className={styles.closeBtn} onClick={() => setKutiModal(false)}>✕</button>
            </div>
            <form onSubmit={handleKutiSubmit} className={styles.form}>
              <div className={styles.formGroup} style={{ marginBottom: 16 }}>
                <label>ជ្រើសរើសវត្ត *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <Select 
                      styles={selectStyles}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      menuPosition="fixed"
                      placeholder="-- សូមជ្រើសរើសវត្ត --"
                      options={pagodas.map(p => ({ value: p.id, label: p.name }))}
                      value={kutiFormList[0]?.pagodaId ? { value: kutiFormList[0].pagodaId, label: pagodas.find(p => p.id === kutiFormList[0].pagodaId)?.name } : null}
                      onChange={(option: any) => setKutiFormList(prev => prev.map(f => ({ ...f, pagodaId: option?.value || '' })))}
                      isClearable
                    />
                  </div>
                  <button type="button" className="btn-secondary" style={{ padding: '0 12px' }} onClick={openAddPagoda} title="បន្ថែមវត្តថ្មី">+</button>
                </div>
              </div>
              
              <div style={{ maxHeight: '55vh', overflowY: 'auto', paddingRight: 8 }}>
                {kutiFormList.map((form, index) => (
                  <div key={index} style={{ borderBottom: index < kutiFormList.length - 1 ? '1px dashed var(--color-border)' : 'none', paddingBottom: index < kutiFormList.length - 1 ? 16 : 0, marginBottom: index < kutiFormList.length - 1 ? 16 : 0 }}>
                    <div className={styles.formGroup}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label>ឈ្មោះកុដិទី {index + 1} *</label>
                        {kutiFormList.length > 1 && (
                          <button type="button" onClick={() => setKutiFormList(prev => prev.filter((_, i) => i !== index))} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.8rem' }}>លុប</button>
                        )}
                      </div>
                      <input type="text" className={styles.input} required autoFocus={index === 0}
                        value={form.name} onChange={e => {
                          const newList = [...kutiFormList];
                          newList[index].name = e.target.value;
                          setKutiFormList(newList);
                        }} />
                    </div>
                    <div className={styles.formRow} style={{ marginTop: 12 }}>
                      <div className={styles.formGroup}>
                        <label>មេកុដិ</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <Select 
                              styles={selectStyles}
                              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                              menuPosition="fixed"
                              placeholder="-- ជ្រើសរើស --"
                              options={headMonks.map(m => ({ value: m.id, label: m.name }))}
                              value={form.headId ? { value: form.headId, label: headMonks.find(m => m.id === form.headId)?.name } : null}
                              onChange={(option: any) => {
                                const newList = [...kutiFormList];
                                newList[index].headId = option?.value || '';
                                setKutiFormList(newList);
                              }}
                              isClearable
                            />
                          </div>
                          <button type="button" className="btn-secondary" style={{ padding: '0 12px' }} onClick={() => openAddMonk('headId', index)} title="បន្ថែមព្រះសង្ឃថ្មី">+</button>
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>អនុកុដិ</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <Select 
                              styles={selectStyles}
                              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                              menuPosition="fixed"
                              placeholder="-- ជ្រើសរើស --"
                              options={subHeadMonks.map(m => ({ value: m.id, label: m.name }))}
                              value={form.subHeadId ? { value: form.subHeadId, label: subHeadMonks.find(m => m.id === form.subHeadId)?.name } : null}
                              onChange={(option: any) => {
                                const newList = [...kutiFormList];
                                newList[index].subHeadId = option?.value || '';
                                setKutiFormList(newList);
                              }}
                              isClearable
                            />
                          </div>
                          <button type="button" className="btn-secondary" style={{ padding: '0 12px' }} onClick={() => openAddMonk('subHeadId', index)} title="បន្ថែមព្រះសង្ឃថ្មី">+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!editingKutiId && (
                <div style={{ marginTop: 8 }}>
                  <button type="button" className="btn-secondary" style={{ width: '100%' }} onClick={() => {
                    const last = kutiFormList[kutiFormList.length - 1];
                    setKutiFormList(prev => [...prev, { ...EMPTY_KUTI, pagodaId: last ? last.pagodaId : '' }]);
                  }}>
                    + បន្ថែមកុដិមួយទៀត
                  </button>
                </div>
              )}
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setKutiModal(false)} disabled={kutiSubmitting}>បោះបង់</button>
                <button type="submit" className="btn-primary" disabled={kutiSubmitting}>រក្សាទុក</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Monk Modal ── */}
      {monkModal && (
        <div className={styles.modalOverlay} onClick={() => !monkSubmitting && setMonkModal(false)} style={{ zIndex: 1000 }}>
          <div className={`glass-panel ${styles.modalCard}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>បន្ថែមព្រះសង្ឃថ្មី</h3>
              <button className={styles.closeBtn} onClick={() => setMonkModal(false)}>✕</button>
            </div>
            <form onSubmit={handleMonkSubmit} className={styles.form}>
              <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 8 }}>
                {monkFormList.map((form, index) => (
                  <div key={index} style={{ borderBottom: index < monkFormList.length - 1 ? '1px dashed var(--color-border)' : 'none', paddingBottom: index < monkFormList.length - 1 ? 16 : 0, marginBottom: index < monkFormList.length - 1 ? 16 : 0 }}>
                    <div className={styles.formGroup}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label>ឈ្មោះព្រះសង្ឃទី {index + 1} *</label>
                        {monkFormList.length > 1 && (
                          <button type="button" onClick={() => setMonkFormList(prev => prev.filter((_, i) => i !== index))} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.8rem' }}>លុប</button>
                        )}
                      </div>
                      <input type="text" className={styles.input} required autoFocus={index === 0}
                        value={form.name} onChange={e => {
                          const newList = [...monkFormList];
                          newList[index].name = e.target.value;
                          setMonkFormList(newList);
                        }} />
                    </div>
                    <div className={styles.formRow} style={{ marginTop: 12 }}>
                      <div className={styles.formGroup}>
                        <label>អាយុ</label>
                        <input type="number" className={styles.input} value={form.age ?? ''} onChange={e => {
                          const newList = [...monkFormList];
                          newList[index].age = e.target.value;
                          setMonkFormList(newList);
                        }} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>ភេទ</label>
                        <select className={styles.input} value={form.gender ?? 'ប្រុស'} onChange={e => {
                          const newList = [...monkFormList];
                          newList[index].gender = e.target.value;
                          setMonkFormList(newList);
                        }}>
                          <option value="ប្រុស">ប្រុស</option>
                          <option value="ស្រី">ស្រី</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: 8 }}>
                <button type="button" className="btn-secondary" style={{ width: '100%' }} onClick={() => setMonkFormList(prev => [...prev, { ...EMPTY_MONK }])}>
                  + បន្ថែមព្រះសង្ឃមួយអង្គទៀត
                </button>
              </div>

              <div className={styles.formActions} style={{ marginTop: 16 }}>
                <button type="button" className={styles.cancelBtn} onClick={() => setMonkModal(false)} disabled={monkSubmitting}>បោះបង់</button>
                <button type="submit" className="btn-primary" disabled={monkSubmitting}>រក្សាទុក</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => !deleting && setDeleteTarget(null)} style={{ zIndex: 2000 }}>
          <div className={`glass-panel ${styles.confirmCard}`} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#f87171' }}>⚠️ លុប{deleteTarget.type === 'pagoda' ? 'វត្ត' : 'កុដិ'}?</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 14, lineHeight: 1.7, fontSize: '0.92rem' }}>
              តើអ្នកពិតជាចង់លុបមែនទេ?
            </p>
            <div className={styles.formActions} style={{ marginTop: 28 }}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)} disabled={deleting}>បោះបង់</button>
              <button className="btn-primary" style={{ background: 'rgba(239,68,68,0.85)' }} onClick={handleDelete} disabled={deleting}>លុបចោល</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
