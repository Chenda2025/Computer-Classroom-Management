'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import att from './attendance.module.css';
import ExportModal from './ExportModal';

interface CourseSummary {
  id: string;
  name: string;
  description: string | null;
  _count: { enrollments: number };
}

interface RosterStudent { 
  id: string; 
  studentCode: string; 
  name: string; 
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  wat?: string | null;
  kuti?: string | null;
  kutiHead?: string | null;
  photoUrl?: string | null;
}
interface AttendanceRecord { studentId: string; status: string; }

interface Props {
  courses: CourseSummary[];
  today: string;
  userRole: string;
}

const PAGE_SIZE = 15;
const MONTHLY_LIMIT = 3;

const STATUS_LABELS: Record<string, string> = {
  ABSENT:     'អវត្តមាន',
  LATE:       'យឺត',
  PERMISSION: 'ច្បាប់',
};

const STATUS_COLORS: Record<string, string> = {
  ABSENT:     '#ef4444',
  LATE:       '#f59e0b',
  PERMISSION: '#3b82f6',
};

const COURSE_COLORS = [
  { color: '#6366f1', light: '#818cf8' },
  { color: '#10b981', light: '#34d399' },
  { color: '#f59e0b', light: '#fbbf24' },
  { color: '#3b82f6', light: '#60a5fa' },
  { color: '#8b5cf6', light: '#a78bfa' },
  { color: '#ec4899', light: '#f472b6' },
  { color: '#14b8a6', light: '#2dd4bf' },
  { color: '#f97316', light: '#fb923c' },
];

function courseColor(index: number) {
  return COURSE_COLORS[index % COURSE_COLORS.length];
}

function buildMap(records: AttendanceRecord[]) {
  const m: Record<string, string> = {};
  records.forEach(r => { m[r.studentId] = r.status; });
  return m;
}

function nameInitial(name: string) {
  return name.trim()[0] ?? '?';
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function AttendanceClient({ courses, today, userRole }: Props) {
  const isAdmin = userRole === 'ADMIN';
  const isMonitor = userRole === 'MONITOR';

  const [canSave, setCanSave] = useState(isAdmin);

  const [date, setDate] = useState(today);
  const [courseSearch, setCourseSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'RECORD' | 'ABSENT_ALERT' | 'PERMISSION_ALERT'>('RECORD');
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [monthlyCounts, setMonthlyCounts] = useState<Record<string, { absent: number; permission: number }>>({});

  const filteredCourses = useMemo(() => {
    const q = courseSearch.toLowerCase().trim();
    if (!q) return courses;
    return courses.filter(c => c.name.toLowerCase().includes(q));
  }, [courses, courseSearch]);

  // Monitor save permission check
  useEffect(() => {
    if (isAdmin) return;
    const checkTime = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const allowed = isMonitor && ((h === 19 && m >= 10) || (h === 20 && m === 0));
      setCanSave(allowed);
    };
    checkTime();
    const int = setInterval(checkTime, 10000);
    return () => clearInterval(int);
  }, [isAdmin, isMonitor]);

  // 19:05 Reminder check
  useEffect(() => {
    let triggeredToday = false;
    const checkReminder = async () => {
      const now = new Date();
      if (now.getHours() === 19 && now.getMinutes() === 5 && !triggeredToday) {
        triggeredToday = true;
        try {
          const res = await fetch('/api/schedules');
          if (res.ok) {
            const schedules = await res.json();
            const todayStr = now.toISOString().split('T')[0];
            const todayItems = schedules.filter((s: any) => 
              s.startDate <= todayStr && (!s.endDate || s.endDate >= todayStr)
            );
            const isHolidayOrCancelled = todayItems.some((s: any) => 
              s.type === 'HOLIDAY' || s.title.includes('អត់បានបង្រៀន') || s.description?.includes('អត់បានបង្រៀន')
            );
            if (!isHolidayOrCancelled) {
              const msg = new SpeechSynthesisUtterance("ដល់ម៉ោងយកវត្តមាន");
              msg.lang = 'km-KH';
              window.speechSynthesis.speak(msg);
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              osc.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.5);
              alert('⏰ ដល់ម៉ោងយកវត្តមានហើយ!');
            }
          }
        } catch (err) {
          console.error('Failed to check schedule for reminder', err);
        }
      }
      if (now.getHours() !== 19 || now.getMinutes() !== 5) {
        triggeredToday = false;
      }
    };
    const int = setInterval(checkReminder, 20000);
    return () => clearInterval(int);
  }, []);

  const loadAttendance = useCallback(async (d: string, students: RosterStudent[]) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?date=${d}`);
      const data = await res.json();
      const ids = new Set(students.map(s => s.id));
      const m: Record<string, string> = {};
      (Array.isArray(data) ? data : []).forEach((r: AttendanceRecord) => {
        if (ids.has(r.studentId)) m[r.studentId] = r.status;
      });
      setStatusMap(m);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMonthlyCounts = useCallback(async (yearMonth: string, students: RosterStudent[]) => {
    try {
      const res = await fetch(`/api/attendance?month=${yearMonth}`);
      const data = await res.json();
      const ids = new Set(students.map(s => s.id));
      const m: Record<string, { absent: number; permission: number }> = {};
      (Array.isArray(data) ? data : []).forEach((r: AttendanceRecord) => {
        if (!ids.has(r.studentId)) return;
        if (!m[r.studentId]) m[r.studentId] = { absent: 0, permission: 0 };
        if (r.status === 'ABSENT') m[r.studentId].absent++;
        else if (r.status === 'PERMISSION') m[r.studentId].permission++;
      });
      setMonthlyCounts(m);
    } catch {
      setMonthlyCounts({});
    }
  }, []);

  const openCourse = useCallback(async (course: CourseSummary) => {
    setSelectedCourse(course);
    setSearch(''); setSaved(false); setRoster([]); setStatusMap({}); setPage(1); setMonthlyCounts({});
    setRosterLoading(true);
    try {
      const res = await fetch(`/api/courses/${course.id}/enrollments`);
      const data = await res.json();
      const students: RosterStudent[] = (Array.isArray(data) ? data : [])
        .map((s: any) => ({ 
          id: s.id, 
          studentCode: s.studentCode, 
          name: s.name,
          gender: s.gender,
          dateOfBirth: s.dateOfBirth,
          phone: s.phone,
          wat: s.wat,
          kuti: s.kuti,
          kutiHead: s.kutiHead,
          photoUrl: s.photoUrl
        }));
      setRoster(students);
      await Promise.all([
        loadAttendance(date, students),
        loadMonthlyCounts(date.slice(0, 7), students),
      ]);
    } finally {
      setRosterLoading(false);
    }
  }, [date, loadAttendance, loadMonthlyCounts]);

  const backToCourses = () => {
    setSelectedCourse(null); setRoster([]); setStatusMap({}); setSearch(''); setSaved(false); setPage(1);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let source = roster;
    if (activeTab === 'ABSENT_ALERT') {
      source = roster.filter(s => (monthlyCounts[s.id]?.absent ?? 0) > MONTHLY_LIMIT);
    } else if (activeTab === 'PERMISSION_ALERT') {
      source = roster.filter(s => (monthlyCounts[s.id]?.permission ?? 0) > MONTHLY_LIMIT);
    }

    if (!q) return source;
    return source.filter(s =>
      s.name.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q)
    );
  }, [roster, search, activeTab, monthlyCounts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const setAll = (status: string) => {
    const m: Record<string, string> = {};
    roster.forEach(s => { m[s.id] = status; });
    setStatusMap(m);
  };

  const toggle = (studentId: string, status: string) => {
    setStatusMap(prev => {
      const next = { ...prev };
      if (next[studentId] === status) delete next[studentId];
      else next[studentId] = status;
      return next;
    });
  };

  const handleDateChange = (d: string) => {
    setDate(d);
    setSaved(false);
    loadAttendance(d, roster);
    loadMonthlyCounts(d.slice(0, 7), roster);
  };

  const handleSave = async () => {
    if (!selectedCourse) return;
    setSaving(true); setSaved(false);
    try {
      const records = roster.map(s => ({
        studentId: s.id,
        status: statusMap[s.id] || 'PRESENT'
      }));
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, records }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      loadMonthlyCounts(date.slice(0, 7), roster);
    } finally {
      setSaving(false);
    }
  };

  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, LATE: 0, PERMISSION: 0, NONE: 0 };
    roster.forEach(s => {
      const st = statusMap[s.id];
      if (st === 'PRESENT') c.PRESENT++;
      else if (st === 'ABSENT') c.ABSENT++;
      else if (st === 'LATE') c.LATE++;
      else if (st === 'PERMISSION') c.PERMISSION++;
      else c.NONE++;
    });
    return c;
  }, [roster, statusMap]);

  const monthlyAlert = useCallback((studentId: string) => {
    const mc = monthlyCounts[studentId];
    if (!mc) return null;
    if (mc.absent > MONTHLY_LIMIT || mc.permission > MONTHLY_LIMIT) {
      return mc;
    }
    return null;
  }, [monthlyCounts]);

  const marked = counts.PRESENT + counts.ABSENT + counts.LATE;
  const pct = roster.length === 0 ? 0 : Math.round((marked / roster.length) * 100);

  /* ── Course picker ── */
  if (!selectedCourse) {
    return (
      <div className="animate-fade-in">
        <div className={att.pageHeader}>
          <div>
            <h2>កត់ត្រាវត្តមាន</h2>
            <p className={att.pageSubtitle}>
              ជ្រើសរើសវគ្គសិក្សាមួយ ដើម្បីកត់ត្រាវត្តមានសិស្ស — វគ្គសរុប <strong>{courses.length}</strong>
            </p>
          </div>
          <div className={att.headerRight}>
            <input
              type="text"
              className={att.dateInput}
              placeholder="ស្វែងរកវគ្គសិក្សា..."
              value={courseSearch}
              onChange={e => setCourseSearch(e.target.value)}
            />
          </div>
        </div>

        {courses.length === 0 ? (
          <div className={att.emptyState}>
            <span>📚</span>
            <span>មិនទាន់មានវគ្គសិក្សាក្នុងប្រព័ន្ធទេ</span>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className={att.emptyState}>
            <span>🔍</span>
            <span>រកមិនឃើញវគ្គសិក្សា</span>
          </div>
        ) : (
          <div className={att.courseGrid}>
            {filteredCourses.map((c, i) => {
              const clr = courseColor(courses.indexOf(c));
              return (
                <button
                  key={c.id}
                  className={att.courseCard}
                  style={{ '--course-accent': clr.color, '--course-accent-light': clr.light } as React.CSSProperties}
                  onClick={() => openCourse(c)}
                >
                  <div className={att.courseCardIcon} style={{ background: `linear-gradient(135deg, ${clr.color}, ${clr.light})` }}>
                    {initials(c.name)}
                  </div>
                  <div className={att.courseCardBody}>
                    <div className={att.courseCardName}>{c.name}</div>
                    <div className={att.courseCardMeta}>👥 {c._count.enrollments} សិស្ស</div>
                  </div>
                  <span className={att.courseCardArrow}>កត់ត្រាវត្តមាន →</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ── Attendance roster ── */
  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className={att.pageHeader}>
        <div>
          <button className={att.backBtn} onClick={backToCourses}>← វគ្គសិក្សាទាំងអស់</button>
          <h2 className={att.courseTitle}>📚 {selectedCourse.name}</h2>
          <p className={att.pageSubtitle}>
            សិស្សក្នុងវគ្គ <strong>{roster.length}</strong> នាក់
          </p>
        </div>
        <div className={att.headerRight}>
          <input
            type="date"
            className={att.dateInput}
            value={date}
            onChange={e => handleDateChange(e.target.value)}
          />
          {(isAdmin || isMonitor) && (
            <>
              <button
                className={att.exportHeaderBtn}
                onClick={() => setExportModal(true)}
                disabled={rosterLoading || roster.length === 0}
                style={{ marginLeft: '12px' }}
              >
                📤 ទាញយករបាយការណ៍
              </button>
              {canSave ? (
                <button
                  className={`${att.saveBtn} ${saved ? att.saveBtnSaved : ''}`}
                  onClick={handleSave}
                  disabled={saving || rosterLoading}
                >
                  {saving ? 'កំពុងរក្សាទុក...' : saved ? '✓ រក្សាទុករួច' : 'រក្សាទុក'}
                </button>
              ) : (
                <button
                  className={att.saveBtn}
                  disabled={true}
                  title="អាចរក្សាទុកបាននៅចន្លោះម៉ោង ៧:១០ ដល់ ៨:០០ ល្ងាច"
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                >
                  🔒 ចាក់សោរ (7:10-8:00 PM)
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {rosterLoading ? (
        <div className={att.loadingState}>កំពុងផ្ទុក...</div>
      ) : roster.length === 0 ? (
        <div className={att.emptyState}>
          <span>🎓</span>
          <span>វគ្គនេះមិនទាន់មានសិស្សចុះឈ្មោះទេ</span>
        </div>
      ) : (
        <>
          {activeTab === 'RECORD' && (
            <>
              {/* ── Progress bar ── */}
              <div className={att.progressSection}>
                <div className={att.progressTop}>
                  <span className={att.progressLabel}>វឌ្ឍនភាព — {marked}/{roster.length} នាក់</span>
                  <span className={att.progressPct}>{pct}%</span>
                </div>
                <div className={att.progressTrack}>
                  <div className={att.progressFill} style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* ── Stats ── */}
              <div className={att.statsRow}>
                {[
                  { key: 'PRESENT',    label: 'មានវត្តមាន', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
                  { key: 'ABSENT',     label: 'អវត្តមាន',   color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
                  { key: 'LATE',       label: 'យឺត',         color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
                  { key: 'PERMISSION', label: 'ច្បាប់',      color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
                  { key: 'NONE',       label: 'មិនទាន់',      color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
                ].map(s => (
                  <div key={s.key} className={att.statCard}
                    style={{ background: s.bg, borderColor: s.border }}>
                    <div className={att.statDot} style={{ background: s.color }} />
                    <div>
                      <div className={att.statNum} style={{ color: s.color }}>
                        {counts[s.key as keyof typeof counts]}
                      </div>
                      <div className={att.statLabel} style={{ color: s.color }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Tabs ── */}
          <div className={att.tabs} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <button 
              className={`${att.tabBtn} ${activeTab === 'RECORD' ? att.tabActive : ''}`}
              style={{ fontFamily: 'var(--font-battambang), "Khmer OS Battambang", sans-serif', padding: '0.5rem 1rem', background: activeTab === 'RECORD' ? '#eff6ff' : '#f1f5f9', color: activeTab === 'RECORD' ? '#3b82f6' : '#64748b', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
              onClick={() => { setActiveTab('RECORD'); setPage(1); }}
            >
              📋 កត់ត្រាវត្តមានប្រចាំថ្ងៃ
            </button>
            <button 
              className={`${att.tabBtn} ${activeTab === 'ABSENT_ALERT' ? att.tabActive : ''}`}
              style={{ fontFamily: 'var(--font-battambang), "Khmer OS Battambang", sans-serif', padding: '0.5rem 1rem', background: activeTab === 'ABSENT_ALERT' ? '#fef2f2' : '#f1f5f9', color: activeTab === 'ABSENT_ALERT' ? '#ef4444' : '#64748b', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
              onClick={() => { setActiveTab('ABSENT_ALERT'); setPage(1); }}
            >
              ⚠ អវត្តមាន &gt; ៣ ដង
            </button>
            <button 
              className={`${att.tabBtn} ${activeTab === 'PERMISSION_ALERT' ? att.tabActive : ''}`}
              style={{ fontFamily: 'var(--font-battambang), "Khmer OS Battambang", sans-serif', padding: '0.5rem 1rem', background: activeTab === 'PERMISSION_ALERT' ? '#fffbeb' : '#f1f5f9', color: activeTab === 'PERMISSION_ALERT' ? '#f59e0b' : '#64748b', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
              onClick={() => { setActiveTab('PERMISSION_ALERT'); setPage(1); }}
            >
              ⚠ ច្បាប់ &gt; ៣ ដង
            </button>
          </div>

          {/* ── Toolbar ── */}
          <div className={att.toolbar}>
            <div className={att.searchWrapper}>
              <span className={att.searchIcon}>⌕</span>
              <input
                type="text"
                className={att.searchInput}
                placeholder="ស្វែងរកសិស្ស..."
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </div>
            {(isAdmin || isMonitor) && (
              <div className={att.quickActions}>
                <button className={`${att.quickBtn} ${att.quickBtnRed}`} onClick={() => setAll('ABSENT')}>
                  ✗ អវត្តមានទាំងអស់
                </button>
                <button className={`${att.quickBtn} ${att.quickBtnBlue}`} onClick={() => setAll('PERMISSION')}>
                  📝 ច្បាប់ទាំងអស់
                </button>
                <button className={`${att.quickBtn} ${att.quickBtnYellow}`} onClick={() => setAll('LATE')}>
                  ⏳ យឺតទាំងអស់
                </button>
                <button className={`${att.quickBtn} ${att.quickBtnGray}`} onClick={() => setStatusMap({})}>
                  ↻ លុបជម្រើសទាំងអស់
                </button>
              </div>
            )}
          </div>

          {/* ── Table ── */}
          {loading ? (
            <div className={att.loadingState}>កំពុងផ្ទុក...</div>
          ) : (
            <div className={att.tableCard}>
              <table className={att.table}>
                <thead>
                  <tr className={att.theadRow}>
                    <th className={att.th}>#</th>
                    <th className={att.th}>លេខកូដ</th>
                    <th className={att.th}>ឈ្មោះសិស្ស</th>
                    <th className={att.th}>ភេទ</th>
                    <th className={att.th}>ថ្ងៃខែឆ្នាំកំណើត</th>
                    <th className={att.th}>លេខទូរស័ព្ទ</th>
                    <th className={att.th}>វត្ត</th>
                    <th className={att.th}>កុដិ/មេកុដិ</th>
                    {activeTab === 'RECORD' && <th className={att.th}>ស្ថានភាព</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((s, i) => {
                    const st = statusMap[s.id] ?? '';
                    const alert = monthlyAlert(s.id);
                    return (
                      <tr key={s.id} className={att.row}>
                        <td className={att.indexCell}>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                        <td><span className={att.codeBadge}>{s.studentCode}</span></td>
                        <td>
                          <div className={att.nameCell}>
                            {s.photoUrl ? (
                              <img src={s.photoUrl} alt="" className={att.nameAvatar} style={{ objectFit: 'cover' }} />
                            ) : (
                              <div className={att.nameAvatar}>{nameInitial(s.name)}</div>
                            )}
                            {s.name}
                            {alert && (
                              <span
                                className={att.alertBadge}
                                title={`ខែនេះ — អវត្តមាន ${alert.absent} ដង • ច្បាប់ ${alert.permission} ដង (កំណត់ត្រឹម ${MONTHLY_LIMIT} ក្នុងមួយខែ)`}
                              >
                                ⚠ លើសកំណត់
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{s.gender === 'M' ? 'ប្រុស' : s.gender === 'F' ? 'ស្រី' : (s.gender || '-')}</td>
                        <td>{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('km-KH') : '-'}</td>
                        <td>{s.phone || '-'}</td>
                        <td>{s.wat || '-'}</td>
                        <td>
                          {s.kuti || '-'} {s.kutiHead ? `(${s.kutiHead})` : ''}
                        </td>
                        {activeTab === 'RECORD' && (
                          <td className={att.statusCell}>
                          {(isAdmin || isMonitor) ? (
                            <div className={att.pillGroup}>
                              {(['ABSENT', 'LATE', 'PERMISSION'] as const).map(v => (
                                <button
                                  key={v}
                                  type="button"
                                  className={`${att.pill} ${st === v ? att.pillActive : ''}`}
                                  style={st === v ? {
                                    background: STATUS_COLORS[v],
                                    color: '#fff',
                                    borderColor: STATUS_COLORS[v],
                                  } : {}}
                                  onClick={() => toggle(s.id, v)}
                                >
                                  {STATUS_LABELS[v]}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span
                              className={att.statusBadge}
                              style={{
                                color: STATUS_COLORS[st] || '#94a3b8',
                                background: st ? STATUS_COLORS[st] + '18' : '#f8fafc',
                                borderColor: st ? STATUS_COLORS[st] + '44' : '#e2e8f0',
                              }}
                            >
                              {STATUS_LABELS[st] || '—'}
                            </span>
                          )}
                        </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className={att.pagination}>
                  <span className={att.paginationInfo}>
                    បង្ហាញ {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} ក្នុងចំណោម {filtered.length} នាក់
                  </span>
                  <div className={att.paginationBtns}>
                    <button
                      className={att.pageBtn}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      ← មុន
                    </button>
                    <span className={att.pageIndicator}>ទំព័រ {currentPage} / {totalPages}</span>
                    <button
                      className={att.pageBtn}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      បន្ទាប់ →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {exportModal && selectedCourse && (
        <ExportModal
          students={roster}
          courseName={selectedCourse.name}
          date={date}
          statusMap={statusMap}
          monthlyCounts={monthlyCounts}
          onClose={() => setExportModal(false)}
        />
      )}
    </div>
  );
}
