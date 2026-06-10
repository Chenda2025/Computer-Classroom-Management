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
  photoUrl: string | null;
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
  createdAt: string;
  updatedAt: string;
}

interface Props { initialRegistrations: Registration[]; userRole: string; userPerms: string; }

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

  const filtered = useMemo(
    () => tab === 'ALL' ? registrations : registrations.filter(r => r.status === tab),
    [registrations, tab]
  );

  const pendingCount = useMemo(() => registrations.filter(r => r.status === 'PENDING').length, [registrations]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('km-KH', { year: 'numeric', month: 'short', day: 'numeric' });

  const copyLink = async () => {
    const url = `${window.location.origin}/register`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {}
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
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 18px',
              borderRadius: 999,
              border: '1px solid var(--color-border)',
              background: tab === t.key ? 'var(--color-accent)' : 'var(--color-surface)',
              color: tab === t.key ? '#fff' : 'var(--color-text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {t.label}
            {t.key === 'PENDING' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
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
                    {r.photoUrl ? (
                      <img src={r.photoUrl} alt={r.name} className={styles.avatar} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>{r.name.charAt(0)}</div>
                    )}
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
                    <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700 }}>
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
                            onClick={() => handleAction(r.id, 'REJECT')}>❌</button>
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
      {viewing && (
        <div className={styles.modalOverlay} onClick={() => setViewing(null)}>
          <div className="glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '92%', padding: 28, borderRadius: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              {viewing.photoUrl ? (
                <img src={viewing.photoUrl} alt={viewing.name} className={styles.avatarLarge} />
              ) : (
                <div className={styles.avatarLargePlaceholder}>{viewing.name.charAt(0)}</div>
              )}
              <h3 style={{ margin: 0 }}>{viewing.name}</h3>
              {viewing.nameEn && <span style={{ color: 'var(--color-text-secondary)' }}>{viewing.nameEn}</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.88rem' }}>
              <div><strong>ភេទ:</strong> {viewing.gender === 'M' ? 'ប្រុស' : viewing.gender === 'F' ? 'ស្រី' : '—'}</div>
              <div><strong>ថ្ងៃកំណើត:</strong> {viewing.dateOfBirth || '—'}</div>
              <div><strong>លេខទូរស័ព្ទ:</strong> {viewing.phone || '—'}</div>
              <div><strong>សញ្ជាតិ:</strong> {viewing.nationality || '—'}</div>
              <div><strong>វត្ត:</strong> {viewing.wat || '—'}</div>
              <div><strong>កុដិ:</strong> {viewing.kuti || '—'}</div>
              <div><strong>មេកុដិ:</strong> {viewing.kutiHead || '—'}</div>
              <div><strong>ឆ្នាំសិក្សា:</strong> {viewing.academicYear || '—'}</div>
              <div><strong>កម្រិតសិក្សា:</strong> {viewing.educationLevel || '—'}</div>
              <div><strong>ថ្នាក់ទី:</strong> {viewing.grade || '—'}</div>
              <div><strong>ឈ្មោះអាណាព្យាបាល:</strong> {viewing.parentName || '—'}</div>
              <div><strong>ទូរស័ព្ទអាណាព្យាបាល:</strong> {viewing.parentPhone || '—'}</div>
            </div>
            {viewing.notes && (
              <div style={{ marginTop: 12, fontSize: '0.88rem' }}>
                <strong>កំណត់ចំណាំ:</strong> {viewing.notes}
              </div>
            )}
            <div className={styles.formActions} style={{ marginTop: 20 }}>
              <button className={styles.cancelBtn} onClick={() => setViewing(null)}>បិទ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
