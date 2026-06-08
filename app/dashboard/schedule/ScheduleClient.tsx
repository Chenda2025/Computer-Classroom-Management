'use client';
import { useState, useMemo } from 'react';
import styles from '../students/students.module.css';
import weekStyles from './schedule.module.css';

interface Course { id: string; name: string; }
interface ScheduleItem {
  id: string; title: string; description: string | null;
  startDate: string; endDate: string | null;
  startTime: string | null; endTime: string | null;
  type: string; courseId: string | null;
  createdAt: string; updatedAt: string;
}
interface Props { initialItems: ScheduleItem[]; courses: Course[]; userRole: string; }

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  CLASS:   { bg: '#dbeafe', color: '#1d4ed8' },
  EXAM:    { bg: '#fee2e2', color: '#dc2626' },
  EVENT:   { bg: '#d1fae5', color: '#047857' },
  HOLIDAY: { bg: '#fef3c7', color: '#92400e' },
};

const TYPE_LABELS: Record<string, string> = {
  CLASS: 'ថ្នាក់', EXAM: 'ប្រឡង', EVENT: 'ព្រឹត្តិការណ៍', HOLIDAY: 'ថ្ងៃឈប់',
};

const EMPTY = { title: '', description: '', startDate: '', endDate: '', startTime: '', endTime: '', type: 'CLASS', courseId: '' };

const DAY_NAMES = ['ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍', 'អាទិត្យ'];
const MONTH_NAMES = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const dow = date.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  date.setDate(date.getDate() + diffToMonday);
  return date;
}

export default function ScheduleClient({ initialItems, courses, userRole }: Props) {
  const isAdmin = userRole === 'ADMIN';
  const [items, setItems] = useState<ScheduleItem[]>(initialItems);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [view, setView] = useState<'list' | 'week' | 'month'>('week');
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter(s => s.title.toLowerCase().includes(q));
  }, [items, search]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(weekAnchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [weekAnchor]);

  const weekRangeLabel = useMemo(() => {
    const start = weekDays[0], end = weekDays[6];
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    if (sameMonth) return `${start.getDate()} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
    return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
  }, [weekDays]);

  const itemsByDay = useMemo(() => {
    const todayKey = toDateKey(new Date());
    return weekDays.map(day => {
      const key = toDateKey(day);
      const dayItems = filtered
        .filter(s => (s.endDate ? key >= s.startDate && key <= s.endDate : key === s.startDate))
        .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
      return { date: day, key, isToday: key === todayKey, items: dayItems };
    });
  }, [weekDays, filtered]);

  const shiftWeek = (delta: number) => setWeekAnchor(prev => {
    const d = new Date(prev);
    d.setDate(d.getDate() + delta * 7);
    return d;
  });

  const monthDays = useMemo(() => {
    const first = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const last = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
    const start = startOfWeek(first);
    const end = startOfWeek(last);
    end.setDate(end.getDate() + 6);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
    return days;
  }, [monthAnchor]);

  const monthLabel = `${MONTH_NAMES[monthAnchor.getMonth()]} ${monthAnchor.getFullYear()}`;

  const itemsByMonthDay = useMemo(() => {
    const todayKey = toDateKey(new Date());
    const curMonth = monthAnchor.getMonth();
    return monthDays.map(day => {
      const key = toDateKey(day);
      const dayItems = filtered
        .filter(s => (s.endDate ? key >= s.startDate && key <= s.endDate : key === s.startDate))
        .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
      return { date: day, key, isToday: key === todayKey, inMonth: day.getMonth() === curMonth, items: dayItems };
    });
  }, [monthDays, filtered, monthAnchor]);

  const shiftMonth = (delta: number) => setMonthAnchor(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  const openAdd = (presetDate?: string) => {
    setForm(presetDate ? { ...EMPTY, startDate: presetDate } : EMPTY);
    setEditingId(null); setError(''); setModal(true);
  };
  const openEdit = (s: ScheduleItem) => {
    setForm({ title: s.title, description: s.description ?? '', startDate: s.startDate, endDate: s.endDate ?? '', startTime: s.startTime ?? '', endTime: s.endTime ?? '', type: s.type, courseId: s.courseId ?? '' });
    setEditingId(s.id); setError(''); setModal(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSubmitting(true); setError('');
    try {
      const url = editingId ? `/api/schedules/${editingId}` : '/api/schedules';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'មានបញ្ហាកើតឡើង'); return; }
      if (editingId) setItems(prev => prev.map(s => s.id === editingId ? { ...s, ...data } : s));
      else setItems(prev => [...prev, data].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setModal(false);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try {
      await fetch(`/api/schedules/${deleteTarget}`, { method: 'DELETE' });
      setItems(prev => prev.filter(s => s.id !== deleteTarget));
    } finally { setDeleteTarget(null); setDeleting(false); }
  };

  const set = (k: keyof typeof EMPTY, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="animate-fade-in">
      <div className={styles.pageHeader}>
        <div>
          <h2>កាលវិភាគ</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
            ធាតុសរុប: <strong style={{ color: 'var(--color-accent)' }}>{items.length}</strong>
          </p>
        </div>
        {isAdmin && <button className="btn-primary" onClick={() => openAdd()}>+ បន្ថែម</button>}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>⌕</span>
          <input type="text" className={styles.searchInput} placeholder="ស្វែងរក..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className={weekStyles.viewToggle}>
          <button type="button"
            className={`${weekStyles.viewToggleBtn} ${view === 'list' ? weekStyles.active : ''}`}
            onClick={() => setView('list')}>📋 តារាង</button>
          <button type="button"
            className={`${weekStyles.viewToggleBtn} ${view === 'week' ? weekStyles.active : ''}`}
            onClick={() => setView('week')}>🗓️ សប្ដាហ៍</button>
          <button type="button"
            className={`${weekStyles.viewToggleBtn} ${view === 'month' ? weekStyles.active : ''}`}
            onClick={() => setView('month')}>📆 ខែ</button>
        </div>
      </div>

      {view === 'week' && (
        <div className={weekStyles.weekToolbar}>
          <div className={weekStyles.weekNav}>
            <button type="button" className={weekStyles.navBtn} onClick={() => shiftWeek(-1)} title="សប្ដាហ៍មុន">‹</button>
            <button type="button" className={weekStyles.todayBtn} onClick={() => setWeekAnchor(new Date())}>សប្ដាហ៍នេះ</button>
            <button type="button" className={weekStyles.navBtn} onClick={() => shiftWeek(1)} title="សប្ដាហ៍បន្ទាប់">›</button>
          </div>
          <div className={weekStyles.weekRangeLabel}>{weekRangeLabel}</div>
        </div>
      )}

      {view === 'month' && (
        <div className={weekStyles.weekToolbar}>
          <div className={weekStyles.weekNav}>
            <button type="button" className={weekStyles.navBtn} onClick={() => shiftMonth(-1)} title="ខែមុន">‹</button>
            <button type="button" className={weekStyles.todayBtn} onClick={() => setMonthAnchor(new Date())}>ខែនេះ</button>
            <button type="button" className={weekStyles.navBtn} onClick={() => shiftMonth(1)} title="ខែបន្ទាប់">›</button>
          </div>
          <div className={weekStyles.weekRangeLabel}>{monthLabel}</div>
        </div>
      )}

      {view === 'week' ? (
          <div className={weekStyles.weekGrid}>
            {itemsByDay.map(({ date, key, isToday, items: dayItems }) => (
              <div key={key} className={`${weekStyles.dayColumn} ${isToday ? weekStyles.dayColumnToday : ''}`}>
                <div className={weekStyles.dayHeader}>
                  <div>
                    <div className={weekStyles.dayName}>{DAY_NAMES[date.getDay() === 0 ? 6 : date.getDay() - 1]}</div>
                    <div className={weekStyles.dayDate}>{date.getDate()}/{date.getMonth() + 1}</div>
                  </div>
                  {isAdmin && (
                    <button type="button" className={weekStyles.addDayBtn} title="បន្ថែមកាលវិភាគថ្ងៃនេះ"
                      onClick={() => openAdd(key)}>+</button>
                  )}
                </div>
                <div className={weekStyles.dayBody}>
                  {dayItems.length === 0 ? (
                    isAdmin ? (
                      <button type="button" className={weekStyles.dayEmptyAdd} onClick={() => openAdd(key)}>+ បន្ថែមកាលវិភាគ</button>
                    ) : (
                      <div className={weekStyles.dayEmpty}>—</div>
                    )
                  ) : dayItems.map(s => {
                    const tc = TYPE_COLORS[s.type] ?? TYPE_COLORS.CLASS;
                    return (
                      <div key={s.id} className={weekStyles.eventChip}
                        style={{ background: tc.bg, color: tc.color }}
                        onClick={() => isAdmin && openEdit(s)}
                        title={s.description ?? s.title}>
                        <span className={weekStyles.eventTitle}>{s.title}</span>
                        {s.startTime && <span className={weekStyles.eventTime}>{s.startTime}{s.endTime ? ` – ${s.endTime}` : ''}</span>}
                        {s.courseId && <span className={weekStyles.eventCourse}>{courses.find(c => c.id === s.courseId)?.name ?? ''}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
      ) : view === 'month' ? (
          <div>
            <div className={weekStyles.monthDayNamesRow}>
              {DAY_NAMES.map(n => <div key={n} className={weekStyles.monthDayName}>{n}</div>)}
            </div>
            <div className={weekStyles.monthGrid}>
              {itemsByMonthDay.map(({ date, key, isToday, inMonth, items: dayItems }) => (
                <div key={key}
                  className={`${weekStyles.monthCell} ${isToday ? weekStyles.monthCellToday : ''} ${!inMonth ? weekStyles.monthCellOutside : ''}`}
                  onClick={() => isAdmin && dayItems.length === 0 && openAdd(key)}>
                  <div className={weekStyles.monthCellHeader}>
                    <span className={weekStyles.monthCellDate}>{date.getDate()}</span>
                    {isAdmin && (
                      <button type="button" className={weekStyles.addDayBtn} title="បន្ថែមកាលវិភាគថ្ងៃនេះ"
                        onClick={(e) => { e.stopPropagation(); openAdd(key); }}>+</button>
                    )}
                  </div>
                  <div className={weekStyles.monthCellBody}>
                    {dayItems.slice(0, 3).map(s => {
                      const tc = TYPE_COLORS[s.type] ?? TYPE_COLORS.CLASS;
                      return (
                        <div key={s.id} className={weekStyles.monthEventChip}
                          style={{ background: tc.bg, color: tc.color }}
                          onClick={(e) => { e.stopPropagation(); if (isAdmin) openEdit(s); }}
                          title={s.description ?? s.title}>
                          {s.startTime && <span className={weekStyles.monthEventTime}>{s.startTime}</span>}
                          <span className={weekStyles.monthEventTitle}>{s.title}</span>
                        </div>
                      );
                    })}
                    {dayItems.length > 3 && (
                      <div className={weekStyles.monthMoreLabel}>+{dayItems.length - 3} ច្រើនទៀត</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
      ) : (
      <div className={styles.tableWrapper}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📅</div>
            <p>{search ? 'រកមិនឃើញ' : 'មិនទាន់មានកាលវិភាគទេ'}</p>
            {isAdmin && !search && <button className="btn-primary" onClick={() => openAdd()} style={{ marginTop: 20 }}>បន្ថែមដំបូង</button>}
          </div>
        ) : (
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr><th>#</th><th>ចំណងជើង</th><th>ប្រភេទ</th><th>ថ្ងៃចាប់ផ្ដើម</th><th>ថ្ងៃបញ្ចប់</th><th>ម៉ោង</th><th>វគ្គ</th>{isAdmin && <th>ការគ្រប់គ្រង</th>}</tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const tc = TYPE_COLORS[s.type] ?? TYPE_COLORS.CLASS;
                return (
                  <tr key={s.id} className={styles.row}>
                    <td className={styles.indexCell}>{i + 1}</td>
                    <td className={styles.nameCell}>{s.title}</td>
                    <td>
                      <span style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.color}33`, padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
                        {TYPE_LABELS[s.type] ?? s.type}
                      </span>
                    </td>
                    <td className={styles.mutedCell}>{s.startDate}</td>
                    <td className={styles.mutedCell}>{s.endDate ?? '—'}</td>
                    <td className={styles.mutedCell}>
                      {s.startTime ? `${s.startTime}${s.endTime ? ` – ${s.endTime}` : ''}` : '—'}
                    </td>
                    <td className={styles.mutedCell}>
                      {s.courseId ? (courses.find(c => c.id === s.courseId)?.name ?? '—') : '—'}
                    </td>
                    {isAdmin && (
                      <td>
                        <div className={styles.actionGroup}>
                          <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => openEdit(s)}>✏️</button>
                          <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => setDeleteTarget(s.id)}>🗑️</button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      )}

      {modal && (
        <div className={styles.modalOverlay} onClick={() => !submitting && setModal(false)}>
          <div className={`glass-panel ${styles.modalCard}`} style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingId ? 'កែប្រែ' : 'បន្ថែមកាលវិភាគ'}</h3>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.formError}>{error}</div>}
              <div className={styles.formGroup}>
                <label>ចំណងជើង *</label>
                <input type="text" className={styles.input} required autoFocus
                  value={form.title} onChange={e => set('title', e.target.value)} />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>ប្រភេទ</label>
                  <select className={styles.input} value={form.type} onChange={e => set('type', e.target.value)}>
                    <option value="CLASS">ថ្នាក់</option>
                    <option value="EXAM">ប្រឡង</option>
                    <option value="EVENT">ព្រឹត្តិការណ៍</option>
                    <option value="HOLIDAY">ថ្ងៃឈប់</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>វគ្គ</label>
                  <select className={styles.input} value={form.courseId} onChange={e => set('courseId', e.target.value)}>
                    <option value="">-- គ្មាន --</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>ថ្ងៃចាប់ផ្ដើម *</label>
                  <input type="date" className={styles.input} required value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label>ថ្ងៃបញ្ចប់</label>
                  <input type="date" className={styles.input} value={form.endDate} onChange={e => set('endDate', e.target.value)} />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>ម៉ោងចាប់ផ្ដើម</label>
                  <input type="time" className={styles.input} value={form.startTime} onChange={e => set('startTime', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label>ម៉ោងបញ្ចប់</label>
                  <input type="time" className={styles.input} value={form.endTime} onChange={e => set('endTime', e.target.value)} />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>ការពិពណ៌នា</label>
                <textarea className={`${styles.input} ${styles.textarea}`} rows={2}
                  value={form.description} onChange={e => set('description', e.target.value)} />
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
            <h3 style={{ color: '#f87171' }}>⚠️ លុប?</h3>
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
    </div>
  );
}
