'use client';
import { useState, useMemo } from 'react';
import styles from '../students/students.module.css';
import ExportModal from './ExportModal';

interface Student { id: string; studentCode: string; name: string; photoUrl: string | null; gender?: string | null; }
interface ExamRef { id: string; title: string; passingScore: number; course: { id: string; name: string } }
export interface ExamResultRow {
  id: string; score: number; promoted: boolean; studentId: string; examId: string;
  student: Student; exam: ExamRef; createdAt: string; updatedAt: string;
}
interface Props { initialResults: ExamResultRow[]; retentionDays: number; userRole: string; }

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function daysLeft(createdAt: string, retentionDays: number) {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil(retentionDays - ageDays));
}

function getGrade(pts: number) {
  if (pts < 60) return { label: 'ធ្លាក់', color: '#ef4444' };
  if (pts < 70) return { label: 'មធ្យម', color: '#f59e0b' };
  if (pts < 80) return { label: 'ល្អបង្គួរ', color: '#3b82f6' };
  if (pts < 90) return { label: 'ល្អ', color: '#8b5cf6' };
  return { label: 'ល្អណាស់', color: '#10b981' };
}

export default function ExamReportsClient({ initialResults, retentionDays, userRole }: Props) {
  const canExport = userRole === 'ADMIN' || userRole === 'MONITOR';
  const [search, setSearch] = useState('');
  const [showExport, setShowExport] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return initialResults;
    return initialResults.filter(r =>
      r.student.name.toLowerCase().includes(q) ||
      r.student.studentCode.toLowerCase().includes(q) ||
      r.exam.title.toLowerCase().includes(q) ||
      r.exam.course.name.toLowerCase().includes(q)
    );
  }, [initialResults, search]);

  const stats = useMemo(() => {
    let passed = 0, failed = 0, promoted = 0, expiringSoon = 0;
    for (const r of initialResults) {
      if (r.score >= r.exam.passingScore) passed++; else failed++;
      if (r.promoted) promoted++;
      if (daysLeft(r.createdAt, retentionDays) <= 1) expiringSoon++;
    }
    return { passed, failed, promoted, expiringSoon };
  }, [initialResults, retentionDays]);

  return (
    <div className="animate-fade-in">
      <div className={styles.pageHeader}>
        <div>
          <h2>របាយការណ៍ប្រឡង</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
            សរុប: <strong style={{ color: 'var(--color-accent)' }}>{initialResults.length}</strong> លទ្ធផល
            {' '}• ទិន្នន័យត្រូវបានរក្សាទុកអស់រយៈពេល <strong>{retentionDays}</strong> ថ្ងៃ រួចលុបដោយស្វ័យប្រវត្តិ
          </p>
        </div>
        {canExport && (
          <button className="btn-secondary" onClick={() => setShowExport(true)} disabled={filtered.length === 0}>
            📤 ទាញយករបាយការណ៍
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#16a34a' }}>{stats.passed}</div>
          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>ប្រឡងជាប់</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#ef4444' }}>{stats.failed}</div>
          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>ធ្លាក់</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#3b82f6' }}>{stats.promoted}</div>
          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>បានបន្តវគ្គស្វ័យប្រវត្តិ</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f59e0b' }}>{stats.expiringSoon}</div>
          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>ជិតផុតកំណត់ (≤១ ថ្ងៃ)</div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>⌕</span>
          <input type="text" className={styles.searchInput} placeholder="ស្វែងរកតាមឈ្មោះ, លេខកូដ, ប្រឡង, វគ្គ..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className={styles.tableWrapper}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📊</div>
            <p>{search ? 'រកមិនឃើញ' : 'មិនទាន់មានលទ្ធផលប្រឡងណាមួយទេ'}</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th>#</th><th>សិស្ស</th><th>ប្រឡង</th><th>វគ្គសិក្សា</th><th>ពិន្ទុ</th>
                <th>និទ្ទេស</th><th>លទ្ធផល</th><th>វគ្គបន្ទាប់</th><th>ថ្ងៃប្រឡង</th><th>ផុតកំណត់ក្នុង</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const passed = r.score >= r.exam.passingScore;
                const left = daysLeft(r.createdAt, retentionDays);
                return (
                  <tr key={r.id} className={styles.row}>
                    <td className={styles.indexCell}>{i + 1}</td>
                    <td className={styles.nameCell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {r.student.photoUrl ? (
                          <img src={r.student.photoUrl} alt={r.student.name} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#cbd5e1', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                            {initials(r.student.name)}
                          </div>
                        )}
                        <div>
                          <div>{r.student.name}</div>
                          <div className={styles.mutedCell} style={{ fontSize: '0.75rem' }}>{r.student.studentCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.mutedCell}>{r.exam.title}</td>
                    <td className={styles.mutedCell}>{r.exam.course.name}</td>
                    <td><strong style={{ color: 'var(--color-accent)' }}>{r.score}</strong></td>
                    <td>
                      <span style={{ fontWeight: 600, color: getGrade(r.score).color }}>
                        {getGrade(r.score).label}
                      </span>
                    </td>
                    <td>
                      <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600, background: passed ? '#dcfce7' : '#fee2e2', color: passed ? '#16a34a' : '#ef4444' }}>
                        {passed ? 'ជាប់' : 'ធ្លាក់'}
                      </span>
                    </td>
                    <td>
                      {r.promoted ? (
                        <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>✓ បានបន្ត</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td className={styles.mutedCell} style={{ fontSize: '0.8rem' }}>
                      {new Date(r.createdAt).toLocaleDateString('km-KH', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: left <= 1 ? '#ef4444' : left <= 3 ? '#f59e0b' : '#64748b' }}>
                        {left} ថ្ងៃ
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showExport && <ExportModal results={filtered} onClose={() => setShowExport(false)} />}
    </div>
  );
}
