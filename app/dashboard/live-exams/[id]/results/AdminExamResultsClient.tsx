'use client';

import styles from '../../../students/students.module.css';

interface Props {
  session: any;
  promotedMap: Record<string, boolean>;
  nextCourse: { id: string; name: string } | null;
}

export default function AdminExamResultsClient({ session, promotedMap, nextCourse }: Props) {
  const getGrade = (pts: number) => {
    if (pts < 60) return { label: 'ធ្លាក់', color: '#ef4444' };
    if (pts < 70) return { label: 'មធ្យម', color: '#f59e0b' };
    if (pts < 80) return { label: 'ល្អបង្គួរ', color: '#3b82f6' };
    if (pts < 90) return { label: 'ល្អ', color: '#8b5cf6' };
    return { label: 'ល្អណាស់', color: '#10b981' };
  };

  // Sort participations by score descending
  const sorted = [...session.participations].sort((a, b) => b.currentScore - a.currentScore);

  const totalPassed = sorted.filter(p => p.currentScore >= session.exam.passingScore).length;
  const totalFailed = sorted.length - totalPassed;
  const totalPromoted = sorted.filter(p => promotedMap[p.studentId]).length;

  return (
    <div className="animate-fade-in" style={{ padding: '1rem' }}>
      <div className={styles.pageHeader}>
        <div>
          <button onClick={() => window.location.href='/dashboard/exams'} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: 8 }}>← ត្រឡប់ទៅបញ្ជីប្រឡង</button>
          <h2>លទ្ធផលប្រឡង: <span style={{ color: 'var(--color-accent)' }}>{session.exam.title}</span></h2>
          {session.status === 'COMPLETED' && (
            <p style={{ color: '#64748b', marginTop: 6, fontSize: '0.85rem' }}>
              ✅ ប្រព័ន្ធបានវាយតម្លៃ និងបញ្ជូនសិស្សដោយស្វ័យប្រវត្តិរួចហើយ
              {nextCourse ? <> — សិស្សប្រឡងជាប់ត្រូវបានបន្តទៅវគ្គ <strong style={{ color: 'var(--color-accent)' }}>{nextCourse.name}</strong></> : ' (មិនមានវគ្គបន្ទាប់កំណត់ទេ)'}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b' }}>{sorted.length}</div>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>អ្នកចូលរួមសរុប</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a' }}>{totalPassed}</div>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>ប្រឡងជាប់</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>{totalFailed}</div>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>ធ្លាក់</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6' }}>{totalPromoted}</div>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>បានបន្តវគ្គ (ស្វ័យប្រវត្តិ)</div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th>ចំណាត់ថ្នាក់</th>
              <th>ឈ្មោះសិស្ស</th>
              <th>ពិន្ទុ</th>
              <th>និទ្ទេស</th>
              <th>លទ្ធផល</th>
              <th>សកម្មភាពបន្ទាប់ (ស្វ័យប្រវត្តិ)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, index) => {
              const passed = p.currentScore >= session.exam.passingScore;
              const grade = getGrade(p.currentScore);
              const promoted = !!promotedMap[p.studentId];

              return (
                <tr key={p.id} className={styles.row}>
                  <td className={styles.indexCell}>
                    {index === 0 ? '🥇 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : index + 1}
                  </td>
                  <td className={styles.nameCell}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#cbd5e1', overflow: 'hidden' }}>
                        {p.student.photoUrl && <img src={p.student.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>
                      <div>
                        <div>{p.student.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>{p.student.studentCode}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--color-accent)', fontSize: '1.1rem' }}>{p.currentScore}</strong>
                  </td>
                  <td>
                    <span style={{ color: grade.color, fontWeight: 600 }}>{grade.label}</span>
                  </td>
                  <td>
                    <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600, background: passed ? '#dcfce7' : '#fee2e2', color: passed ? '#16a34a' : '#ef4444' }}>
                      {passed ? 'ជាប់' : 'ធ្លាក់'}
                    </span>
                  </td>
                  <td>
                    {passed ? (
                      promoted ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#dbeafe', color: '#1d4ed8', padding: '6px 12px', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem' }}>
                          ✓ បានបន្តទៅ{nextCourse ? ` "${nextCourse.name}"` : 'វគ្គបន្ទាប់'}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                          {nextCourse ? 'រួចរាល់ — នៅវគ្គដដែល' : 'ជាប់ — មិនមានវគ្គបន្ទាប់'}
                        </span>
                      )
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>បន្តសិក្សាវគ្គនេះដដែល</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
