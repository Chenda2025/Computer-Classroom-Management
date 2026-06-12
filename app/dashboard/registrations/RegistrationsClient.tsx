'use client';
import { useMemo, useState, useEffect } from 'react';
import { parsePermissions, canWrite, canDelete } from '../../../lib/permissions';
import { useRouter } from 'next/navigation';
import styles from '../students/students.module.css';

interface Registration {
  id: string;
  status: string;
  name: string;
  nameEn: string | null;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  wat: string | null;
  kuti: string | null;
  kutiHead: string | null;
  parentName: string | null;
  parentPhone: string | null;
  academicYear: string | null;
  educationLevel: string | null;
  grade: string | null;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props { initialRegistrations: Registration[]; userRole: string; userPerms: string; }

const RegistrationAvatar = ({ id, name, className, style, fallback }: { id: string; name: string; className?: string; style?: React.CSSProperties; fallback: React.ReactNode }) => {
  const [error, setError] = useState(false);
  if (error) return <>{fallback}</>;
  return <img src={`/api/registrations/${id}/photo`} alt={name} className={className} style={style} onError={() => setError(true)} />;
};

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  PENDING:  { color: '#92400e', bg: '#fef3c7', label: 'រង់ចាំ' },
  APPROVED: { color: '#047857', bg: '#d1fae5', label: 'អនុម័ត' },
  REJECTED: { color: '#dc2626', bg: '#fee2e2', label: 'បដិសេធ' },
};

const TABS: { key: string; label: string }[] = [
  { key: 'PENDING', label: 'រង់ចាំ' },
  { key: 'APPROVED', label: 'អនុម័ត' },
  { key: 'REJECTED', label: 'បដិសេធ' },
  { key: 'ALL', label: 'ទាំងអស់' },
];

export default function RegistrationsClient({ initialRegistrations, userRole, userPerms }: Props) {
  const permMap = useMemo(() => parsePermissions(userPerms), [userPerms]);
  const router = useRouter();
  const canWri = canWrite(permMap, 'registrations', userRole);
  const canDel = canDelete(permMap, 'registrations', userRole);

  const [registrations, setRegistrations] = useState<Registration[]>(initialRegistrations);
  useEffect(() => { setRegistrations(initialRegistrations); }, [initialRegistrations]);
  const [tab, setTab] = useState('PENDING');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<Registration | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Registration | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const isToday = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  const filtered = useMemo(() => {
    if (tab === 'ALL') return registrations;
    if (tab === 'APPROVED' || tab === 'REJECTED') {
      return registrations.filter(r => r.status === tab && isToday(r.updatedAt));
    }
    return registrations.filter(r => r.status === tab);
  }, [registrations, tab]);

  const pendingCount = useMemo(() => registrations.filter(r => r.status === 'PENDING').length, [registrations]);

  const tabCounts = useMemo(() => ({
    PENDING: registrations.filter(r => r.status === 'PENDING').length,
    APPROVED: registrations.filter(r => r.status === 'APPROVED' && isToday(r.updatedAt)).length,
    REJECTED: registrations.filter(r => r.status === 'REJECTED' && isToday(r.updatedAt)).length,
    ALL: registrations.length,
  } as Record<string, number>), [registrations]);

  const KHMER_MONTHS = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()} ${KHMER_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/register`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {}
  };

  const [tgSendingProfile, setTgSendingProfile] = useState(false);
  const handleSendProfileTelegram = async (r: Registration) => {
    setTgSendingProfile(true);
    try {
      const st = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
      const caption = `--- &gt;<b>ព័ត៌មានសំណើចុះឈ្មោះសិស្ស</b>&lt; ---\n` +
        `<b>ឈ្មោះ៖</b> ${r.name}\n` +
        (r.nameEn ? `<b>ឈ្មោះ(EN)៖</b> ${r.nameEn}\n` : '') +
        `<b>ស្ថានភាព៖</b> ${st.label}\n` +
        `<b>ភេទ៖</b> ${r.gender === 'M' ? 'ប្រុស' : r.gender === 'F' ? 'ស្រី' : '—'}\n` +
        `<b>ថ្ងៃខែឆ្នាំកំណើត៖</b> ${r.dateOfBirth || '—'}\n` +
        `<b>លេខទូរស័ព្ទ៖</b> ${r.phone || '—'}\n\n` +
        `<b>ទីតាំងស្នាក់នៅ៖</b> វត្ត${r.wat || '—'} កុដិ${r.kuti || '—'}\n` +
        `<b>ការសិក្សា៖</b> ${r.educationLevel || '—'} ថ្នាក់ទី ${r.grade || '—'}`;

      const fd = new FormData();
      fd.append('caption', caption);

      try {
        const photoRes = await fetch(`/api/registrations/${r.id}/photo`);
        if (photoRes.ok) {
          const blob = await photoRes.blob();
          fd.append('file', blob);
          fd.append('filename', 'profile.jpg');
        }
      } catch (e) {
        console.warn('Failed to fetch photo, sending text only', e);
      }

      const res = await fetch('/api/export/telegram', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('បរាជ័យក្នុងការផ្ញើ');
      alert('ផ្ញើចូល Telegram បានជោគជ័យ! ✓');
    } catch (err: any) {
      alert('មានបញ្ហាពេលផ្ញើ៖ ' + err.message);
    } finally {
      setTgSendingProfile(false);
    }
  };

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setError('');
    setBusyId(id);
    try {
      const res = await fetch(`/api/registrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'មានបញ្ហា'); return; }
      const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      window.location.reload();
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { setRejectError('សូមបញ្ចូលមូលហេតុនៃការបដិសេធ'); return; }
    setRejectError('');
    setBusyId(rejectTarget.id);
    try {
      const res = await fetch(`/api/registrations/${rejectTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setRejectError(data.error || 'មានបញ្ហា'); return; }
      setRejectTarget(null);
      setRejectReason('');
      setViewing(null);
      window.location.reload();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('តើអ្នកប្រាកដជាចង់លុបសំណើនេះមែនទេ?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/registrations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRegistrations(prev => prev.filter(r => r.id !== id));
        window.location.reload();
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* ── Page Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h2>ការស្នើសុំចុះឈ្មោះសិស្ស</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
            កំពុងរង់ចាំ:{' '}
            <strong style={{ color: 'var(--color-accent)' }}>{pendingCount}</strong> សំណើ
          </p>
        </div>
        <button className="btn-primary" onClick={copyLink} type="button">
          {linkCopied ? '✓ បានចម្លង!' : '🔗 ចម្លងតំណចុះឈ្មោះ'}
        </button>
      </div>

      {error && <div className={styles.formError} style={{ marginBottom: 16 }}>{error}</div>}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const active = tab === t.key;
          const count = tabCounts[t.key] ?? 0;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                borderRadius: 999,
                border: '1px solid var(--color-border)',
                background: active ? 'var(--color-accent)' : 'var(--color-surface)',
                color: active ? '#fff' : 'var(--color-text-secondary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {t.label}
              {count > 0 && (
                <span
                  style={{
                    background: active
                      ? 'rgba(255, 255, 255, 0.28)'
                      : t.key === 'PENDING'
                        ? '#ef4444'
                        : 'var(--color-accent-light)',
                    color: active
                      ? '#fff'
                      : t.key === 'PENDING'
                        ? '#fff'
                        : 'var(--color-accent-hover)',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '1px 7px',
                    borderRadius: 999,
                    minWidth: 18,
                    textAlign: 'center',
                    lineHeight: '1.4',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th></th>
              <th>ឈ្មោះ</th>
              <th>លេខទូរស័ព្ទ</th>
              <th>វត្ត / កុដិ</th>
              <th>ការសិក្សា</th>
              <th>កាលបរិច្ឆេទ</th>
              <th>ស្ថានភាព</th>
              <th>សកម្មភាព</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const st = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
              return (
                <tr key={r.id} className={styles.row}>
                  <td>
                    <RegistrationAvatar id={r.id} name={r.name} className={styles.avatar} fallback={<div className={styles.avatarPlaceholder}>{r.name.charAt(0)}</div>} />
                  </td>
                  <td className={styles.nameCell}>
                    {r.name}
                    {r.nameEn && <div className={styles.mutedCell}>{r.nameEn}</div>}
                  </td>
                  <td className={styles.mutedCell}>{r.phone || '—'}</td>
                  <td className={styles.mutedCell}>{r.wat ? `វត្ត${r.wat}${r.kuti ? ` / កុដិ${r.kuti}` : ''}` : '—'}</td>
                  <td className={styles.mutedCell}>{r.educationLevel ? `${r.educationLevel}${r.grade ? ` ${r.grade}` : ''}` : '—'}</td>
                  <td className={styles.mutedCell}>{formatDate(r.createdAt)}</td>
                  <td>
                    <span
                      title={r.status === 'REJECTED' && r.rejectionReason ? `មូលហេតុ៖ ${r.rejectionReason}` : undefined}
                      style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700, cursor: r.status === 'REJECTED' && r.rejectionReason ? 'help' : undefined }}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className={styles.actionBtn} title="មើលលម្អិត" onClick={() => setViewing(r)}>👁️</button>
                      {r.status === 'PENDING' && canWri && (
                        <>
                          <button className={styles.actionBtn} title="អនុម័ត" disabled={busyId === r.id}
                            onClick={() => handleAction(r.id, 'APPROVE')}>✅</button>
                          <button className={styles.actionBtn} title="បដិសេធ" disabled={busyId === r.id}
                            onClick={() => setRejectTarget(r)}>❌</button>
                        </>
                      )}
                      {canDel && (
                        <button className={styles.actionBtn} title="លុប" disabled={busyId === r.id}
                          onClick={() => handleDelete(r.id)}>🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <p>មិនមានសំណើទេ</p>
          </div>
        )}
      </div>

      {/* ── View Modal ── */}
      {viewing && (() => {
        const st = STATUS_STYLE[viewing.status] || STATUS_STYLE.PENDING;
        const color = viewing.gender === 'M' ? '#4f46e5' : viewing.gender === 'F' ? '#db2777' : '#475569';
        const colorLight = viewing.gender === 'M' ? '#818cf8' : viewing.gender === 'F' ? '#f472b6' : '#94a3b8';
        return (
          <div className={styles.modalOverlay} onClick={() => setViewing(null)}>
            <div className={styles.infoModal} onClick={e => e.stopPropagation()}>
              <div className={styles.infoBanner} style={{ background: `linear-gradient(135deg, ${color}, ${colorLight})` }}>
                <div className={styles.infoBannerAvatar}>
                  <RegistrationAvatar id={viewing.id} name={viewing.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} fallback={<span style={{ color }}>{viewing.name.charAt(0)}</span>} />
                </div>
                <div className={styles.infoBannerText}>
                  <div className={styles.infoBannerName}>{viewing.name}</div>
                  {viewing.nameEn && <div className={styles.infoBannerSub}>{viewing.nameEn}</div>}
                  <span className={styles.infoBannerBadge} style={{ color: st.color }}>{st.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
                  <button
                    className={styles.infoBannerClose}
                    style={{ width: 'auto', padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
                    onClick={() => handleSendProfileTelegram(viewing)}
                    disabled={tgSendingProfile}
                  >
                    ✈️ {tgSendingProfile ? 'កំពុងផ្ញើ...' : 'Telegram'}
                  </button>
                  <button className={styles.infoBannerClose} onClick={() => setViewing(null)}>✕</button>
                </div>
              </div>

              <div className={styles.infoBody}>
                <div className={styles.infoSection}>
                  <div className={styles.infoSectionTitle}>ព័ត៌មានទូទៅ</div>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <div className={styles.infoItemLabel}>👤 ភេទ</div>
                      <div className={styles.infoItemValue}>{viewing.gender === 'M' ? 'ប្រុស' : viewing.gender === 'F' ? 'ស្រី' : '—'}</div>
                    </div>
                    <div className={styles.infoItem}>
                      <div className={styles.infoItemLabel}>🗓 ថ្ងៃខែឆ្នាំកំណើត</div>
                      <div className={styles.infoItemValue}>{viewing.dateOfBirth || '—'}</div>
                    </div>
                    <div className={styles.infoItem}>
                      <div className={styles.infoItemLabel}>📱 ទូរស័ព្ទ</div>
                      <div className={styles.infoItemValue}>{viewing.phone || '—'}</div>
                    </div>
                    <div className={styles.infoItem}>
                      <div className={styles.infoItemLabel}>🌏 សញ្ជាតិ</div>
                      <div className={styles.infoItemValue}>{viewing.nationality || '—'}</div>
                    </div>
                  </div>
                </div>

                <div className={styles.infoSection}>
                  <div className={styles.infoSectionTitle}>ទីតាំងស្នាក់នៅ</div>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <div className={styles.infoItemLabel}>🛕 វត្ត</div>
                      <div className={styles.infoItemValue}>{viewing.wat || '—'}</div>
                    </div>
                    <div className={styles.infoItem}>
                      <div className={styles.infoItemLabel}>🏠 កុដិ</div>
                      <div className={styles.infoItemValue}>{viewing.kuti || '—'}</div>
                    </div>
                    <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                      <div className={styles.infoItemLabel}>🧑‍🦱 មេកុដិ</div>
                      <div className={styles.infoItemValue}>{viewing.kutiHead || '—'}</div>
                    </div>
                  </div>
                </div>

                <div className={styles.infoSection}>
                  <div className={styles.infoSectionTitle}>ព័ត៌មានសិក្សា</div>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <div className={styles.infoItemLabel}>📅 ឆ្នាំសិក្សា</div>
                      <div className={styles.infoItemValue}>{viewing.academicYear || '—'}</div>
                    </div>
                    <div className={styles.infoItem}>
                      <div className={styles.infoItemLabel}>🎓 កម្រិតសិក្សា</div>
                      <div className={styles.infoItemValue}>{viewing.educationLevel || '—'}</div>
                    </div>
                    <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                      <div className={styles.infoItemLabel}>📘 ថ្នាក់ទី</div>
                      <div className={styles.infoItemValue}>{viewing.grade || '—'}</div>
                    </div>
                  </div>
                </div>

                {(viewing.parentName || viewing.parentPhone) && (
                  <div className={styles.infoSection}>
                    <div className={styles.infoSectionTitle}>ព័ត៌មានគ្រួសារ</div>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoItem}>
                        <div className={styles.infoItemLabel}>👪 ឈ្មោះអាណាព្យាបាល</div>
                        <div className={styles.infoItemValue}>{viewing.parentName || '—'}</div>
                      </div>
                      <div className={styles.infoItem}>
                        <div className={styles.infoItemLabel}>📞 ទូរស័ព្ទអាណាព្យាបាល</div>
                        <div className={styles.infoItemValue}>{viewing.parentPhone || '—'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {viewing.notes && (
                  <div className={styles.infoSection}>
                    <div className={styles.infoSectionTitle}>កំណត់ចំណាំ</div>
                    <div className={styles.infoItem}>
                      <div className={styles.infoItemValue} style={{ fontWeight: 500 }}>{viewing.notes}</div>
                    </div>
                  </div>
                )}

                {viewing.status === 'REJECTED' && viewing.rejectionReason && (
                  <div className={styles.infoSection}>
                    <div className={styles.infoSectionTitle}>មូលហេតុបដិសេធ</div>
                    <div className={styles.infoItem}>
                      <div className={styles.infoItemValue} style={{ fontWeight: 500, color: '#dc2626' }}>{viewing.rejectionReason}</div>
                    </div>
                  </div>
                )}

                <div className={styles.infoSection}>
                  <div className={styles.infoSectionTitle}>កាលបរិច្ឆេទស្នើសុំ</div>
                  <div className={styles.infoItem}>
                    <div className={styles.infoItemValue}>{formatDate(viewing.createdAt)}</div>
                  </div>
                </div>
              </div>

              <div className={styles.infoFooter}>
                {viewing.status === 'PENDING' && canWri && (
                  <>
                    <button className="btn-primary" disabled={busyId === viewing.id}
                      onClick={() => { handleAction(viewing.id, 'APPROVE'); setViewing(null); }}>✅ អនុម័ត</button>
                    <button className={styles.cancelBtn} disabled={busyId === viewing.id}
                      onClick={() => setRejectTarget(viewing)}>❌ បដិសេធ</button>
                  </>
                )}
                <button className={styles.cancelBtn} onClick={() => setViewing(null)}>បិទ</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Reject Reason Modal ── */}
      {rejectTarget && (
        <div className={styles.modalOverlay} onClick={() => { setRejectTarget(null); setRejectReason(''); setRejectError(''); }}>
          <div className={styles.confirmCard} onClick={e => e.stopPropagation()}>
            <h3>បដិសេធសំណើ — {rejectTarget.name}</h3>
            {rejectError && <div className={styles.formError}>{rejectError}</div>}
            <div className={styles.formGroup}>
              <label>មូលហេតុនៃការបដិសេធ</label>
              <textarea
                className={styles.textarea}
                rows={4}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="សូមបញ្ជាក់ពីមូលហេតុ ឬព័ត៌មានណាមួយដែលមិនត្រឹមត្រូវ..."
                autoFocus
              />
            </div>
            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={() => { setRejectTarget(null); setRejectReason(''); setRejectError(''); }}>បោះបង់</button>
              <button className="btn-primary" disabled={busyId === rejectTarget.id} onClick={confirmReject}>
                {busyId === rejectTarget.id ? 'កំពុងបញ្ជូន...' : '❌ បដិសេធ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
