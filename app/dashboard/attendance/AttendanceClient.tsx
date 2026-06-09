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

type Period = '15D' | '1M' | '1Y';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '15D', label: '15 ថ្ងៃ' },
  { value: '1M',  label: '1 ខែ' },
  { value: '1Y',  label: '1 ឆ្នាំ' },
];

function periodRange(period: Period, anchor: string): { from: string; to: string } {
  const to = anchor;
  const d = new Date(anchor);
  if (period === '15D') d.setDate(d.getDate() - 14);
  else if (period === '1M') d.setMonth(d.getMonth() - 1);
  else d.setFullYear(d.getFullYear() - 1);
  const from = d.toISOString().slice(0, 10);
  return { from, to };
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

const COURSE_PALETTES = [
  { color: '#6366f1', light: '#818cf8' },
  { color: '#10b981', light: '#34d399' },
  { color: '#f59e0b', light: '#fbbf24' },
  { color: '#3b82f6', light: '#60a5fa' },
  { color: '#8b5cf6', light: '#a78bfa' },
  { color: '#ec4899', light: '#f472b6' },
  { color: '#14b8a6', light: '#2dd4bf' },
  { color: '#f97316', light: '#fb923c' },
];

function coursePalette(index: number) { return COURSE_PALETTES[index % COURSE_PALETTES.length]; }
function nameInitial(name: string) { return name.trim()[0] ?? '?'; }
function abbr(name: string) { return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'; }
function buildMap(records: AttendanceRecord[]) {
  const m: Record<string, string> = {};
  records.forEach(r => { m[r.studentId] = r.status; });
  return m;
}

export default function AttendanceClient({ courses, today, userRole }: Props) {
  const isAdmin = userRole === 'ADMIN';
  const isMonitor = userRole === 'MONITOR';

  const [canSave, setCanSave] = useState(isAdmin);
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState<Period>('1M');
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
  
  // Debug State
  const [testTime, setTestTime] = useState('');

  const filteredCourses = useMemo(() => {
    const q = courseSearch.toLowerCase().trim();
    if (!q) return courses;
    return courses.filter(c => c.name.toLowerCase().includes(q));
  }, [courses, courseSearch]);

  useEffect(() => {
    if (isAdmin && !testTime) return; // If admin and no test time, stay with isAdmin=true
    const checkTime = () => {
      let now = new Date();
      if (testTime) {
        const [hh, mm] = testTime.split(':');
        now.setHours(parseInt(hh, 10));
        now.setMinutes(parseInt(mm, 10));
      }
      const h = now.getHours(); const m = now.getMinutes();
      // If we are simulating test time, treat the role as monitor to see the locking effect
      const simulatedMonitor = isMonitor || (isAdmin && testTime !== '');
      setCanSave(simulatedMonitor && ((h === 19 && m >= 10) || (h === 20 && m === 0)));
      if (isAdmin && !testTime) setCanSave(true);
    };
    checkTime();
    const int = setInterval(checkTime, 10000);
    return () => clearInterval(int);
  }, [isAdmin, isMonitor, testTime]);

  useEffect(() => {
    let triggered05 = false;
    let triggered20 = false;

    const checkReminder = async () => {
      let now = new Date();
      if (testTime) {
        const [hh, mm] = testTime.split(':');
        now.setHours(parseInt(hh, 10));
        now.setMinutes(parseInt(mm, 10));
      }
      
      const h = now.getHours();
      const m = now.getMinutes();

      const triggerAlert = async (textMsg: string, speakMsg: string) => {
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
              const msg = new SpeechSynthesisUtterance(speakMsg);
              msg.lang = 'km-KH';
              window.speechSynthesis.speak(msg);
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              
              // Create main oscillator
              const osc = ctx.createOscillator();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              
              // Create Gain node for beeping effect
              const gainNode = ctx.createGain();
              osc.connect(gainNode);
              gainNode.connect(ctx.destination);
              
              // Create LFO to modulate gain (makes it beep 3 times a second)
              const lfo = ctx.createOscillator();
              lfo.type = 'square';
              lfo.frequency.setValueAtTime(3, ctx.currentTime);
              
              // LFO outputs -1 to +1, we need 0 to 1
              // We can just connect it to gain, LFO square will turn gain on/off
              lfo.connect(gainNode.gain);
              
              osc.start();
              lfo.start();
              
              // The browser alert blocks JS execution until OK is clicked
              alert(textMsg);
              
              // When user clicks OK, execution continues here, so we stop the sound
              osc.stop();
              lfo.stop();
              ctx.close();
              window.speechSynthesis.cancel();
            }
          }
        } catch (err) { console.error('Failed to check schedule for reminder', err); }
      };

      if (h === 19 && m === 5 && !triggered05) {
        triggered05 = true;
        triggerAlert('⏰ ម៉ោង ៧:០៥ ដល់ម៉ោងយកវត្តមានហើយ!', 'ដល់ម៉ោងយកវត្តមាន');
      }
      
      if (h === 19 && m === 20 && !triggered20) {
        triggered20 = true;
        triggerAlert('⏰ ម៉ោង ៧:២០ នាទីហើយ! សូមប្រធានថ្នាក់រួសរាន់ស្រង់វត្តមាន ក្រែងលោភ្លេច!', 'សូមប្រធានថ្នាក់រួសរាន់ស្រង់វត្តមាន');
      }

      if (h !== 19 || m !== 5) triggered05 = false;
      if (h !== 19 || m !== 20) triggered20 = false;
    };
    
    // Check right away and then every 20s
    checkReminder();
    const int = setInterval(checkReminder, 20000);
    return () => clearInterval(int);
  }, [testTime]);

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
    } finally { setLoading(false); }
  }, []);

  const loadMonthlyCounts = useCallback(async (anchor: string, p: Period, students: RosterStudent[]) => {
    try {
      const { from, to } = periodRange(p, anchor);
      const res = await fetch(`/api/attendance?from=${from}&to=${to}`);
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
    } catch { setMonthlyCounts({}); }
  }, []);

  const openCourse = useCallback(async (course: CourseSummary) => {
    setSelectedCourse(course);
    setSearch(''); setSaved(false); setRoster([]); setStatusMap({}); setPage(1); setMonthlyCounts({});
    setRosterLoading(true);
    try {
      const res = await fetch(`/api/courses/${course.id}/enrollments`);
      const data = await res.json();
      const students: RosterStudent[] = (Array.isArray(data) ? data : []).map((s: any) => ({
        id: s.id, studentCode: s.studentCode, name: s.name,
        gender: s.gender, dateOfBirth: s.dateOfBirth, phone: s.phone,
        wat: s.wat, kuti: s.kuti, kutiHead: s.kutiHead, photoUrl: s.photoUrl,
      }));
      setRoster(students);
      await Promise.all([
        loadAttendance(date, students),
        loadMonthlyCounts(date, period, students),
      ]);
    } finally { setRosterLoading(false); }
  }, [date, loadAttendance, loadMonthlyCounts]);

  const backToCourses = () => {
    setSelectedCourse(null); setRoster([]); setStatusMap({}); setSearch(''); setSaved(false); setPage(1);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let source = roster;
    if (activeTab === 'ABSENT_ALERT') source = roster.filter(s => (monthlyCounts[s.id]?.absent ?? 0) > MONTHLY_LIMIT);
    else if (activeTab === 'PERMISSION_ALERT') source = roster.filter(s => (monthlyCounts[s.id]?.permission ?? 0) > MONTHLY_LIMIT);
    if (!q) return source;
    return source.filter(s => s.name.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q));
  }, [roster, search, activeTab, monthlyCounts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };

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
    setDate(d); setSaved(false);
    loadAttendance(d, roster);
    loadMonthlyCounts(d, period, roster);
  };

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    if (roster.length > 0) loadMonthlyCounts(date, p, roster);
  };

  const handleSave = async () => {
    if (!selectedCourse) return;
    setSaving(true); setSaved(false);
    try {
      const records = roster.map(s => ({ studentId: s.id, status: statusMap[s.id] || 'PRESENT' }));
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, records, courseName: selectedCourse.name }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      loadMonthlyCounts(date, period, roster);
    } finally { setSaving(false); }
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
    return (mc.absent > MONTHLY_LIMIT || mc.permission > MONTHLY_LIMIT) ? mc : null;
  }, [monthlyCounts]);

  const marked = counts.PRESENT + counts.ABSENT + counts.LATE;
  const pct = roster.length === 0 ? 0 : Math.round((marked / roster.length) * 100);

  const absentAlertCount = useMemo(() => roster.filter(s => (monthlyCounts[s.id]?.absent ?? 0) > MONTHLY_LIMIT).length, [roster, monthlyCounts]);
  const permAlertCount   = useMemo(() => roster.filter(s => (monthlyCounts[s.id]?.permission ?? 0) > MONTHLY_LIMIT).length, [roster, monthlyCounts]);
  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label ?? '';

  /* ════════════════════════════════════════
     COURSE PICKER
  ════════════════════════════════════════ */
  if (!selectedCourse) {
    return (
      <div className={att.page}>
        <div className={att.pickerHeader}>
          <div className={att.pickerHeaderLeft}>
            <h2>កត់ត្រាវត្តមាន</h2>
            <p className={att.pickerSub}>
              ជ្រើសរើសវគ្គសិក្សា ដើម្បីចូលទៅកត់ត្រាវត្តមានសិស្ស — វគ្គសរុប <strong>{courses.length}</strong>
            </p>
          </div>
          <div className={att.pickerSearch}>
            <span className={att.pickerSearchIcon}>⌕</span>
            <input
              type="text"
              className={att.pickerSearchInput}
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
            {filteredCourses.map((c) => {
              const idx = courses.indexOf(c);
              const pal = coursePalette(idx);
              return (
                <button
                  key={c.id}
                  className={att.courseCard}
                  style={{ '--course-accent': pal.color, '--course-accent-light': pal.light } as React.CSSProperties}
                  onClick={() => openCourse(c)}
                >
                  <div className={att.courseCardAccent} />
                  <div className={att.courseCardBody}>
                    <div
                      className={att.courseCardIcon}
                      style={{ background: `linear-gradient(135deg, ${pal.color}, ${pal.light})` }}
                    >
                      {abbr(c.name)}
                    </div>
                    <div className={att.courseCardInfo}>
                      <div className={att.courseCardName}>{c.name}</div>
                      <div className={att.courseCardMeta}>
                        <span>👥</span>
                        <span>{c._count.enrollments} សិស្ស</span>
                      </div>
                    </div>
                  </div>
                  <div className={att.courseCardFoot}>
                    <span className={att.courseCardCta}>កត់ត្រាវត្តមាន →</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════
     ATTENDANCE ROSTER
  ════════════════════════════════════════ */
  const courseIdx = courses.findIndex(c => c.id === selectedCourse.id);
  const pal = coursePalette(courseIdx);

  return (
    <div className={att.page}>

      {/* ── Roster header ── */}
      <div className={att.rosterHeader}>
        <div>
          <button className={att.backBtn} onClick={backToCourses}>← វគ្គសិក្សាទាំងអស់</button>
          <h2 className={att.courseTitle}>
            <span style={{ color: pal.color }}>📚</span>
            {selectedCourse.name}
          </h2>
          <p className={att.pageSubtitle}>
            សិស្សចុះឈ្មោះ <strong>{roster.length}</strong> នាក់
          </p>
        </div>
        <div className={att.headerControls}>
          <input
            type="date"
            className={att.dateInput}
            value={date}
            onChange={e => handleDateChange(e.target.value)}
          />
          <input
            type="time"
            className={att.dateInput}
            title="ម៉ោងតេស្ត (Test Time)"
            style={{ background: testTime ? '#fef08a' : '' }}
            value={testTime}
            onChange={e => setTestTime(e.target.value)}
          />
          <select
            className={att.dateInput}
            value={period}
            onChange={e => handlePeriodChange(e.target.value as Period)}
            style={{ minWidth: 108 }}
          >
            {PERIOD_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {(isAdmin || isMonitor) && (
            <>
              <button
                className={att.exportBtn}
                onClick={() => setExportModal(true)}
                disabled={rosterLoading || roster.length === 0}
              >
                📤 ទាញយក
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
                  className={att.saveLocked}
                  disabled
                  title="អាចរក្សាទុកបាននៅចន្លោះម៉ោង ៧:១០ ដល់ ៨:០០ ល្ងាច"
                >
                  🔒 ចាក់សោរ (7:10–8:00 PM)
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
          {/* ── Stats (only on RECORD tab) ── */}
          {activeTab === 'RECORD' && (
            <>
              <div className={att.statsRow}>
                {([
                  { key: 'PRESENT',    label: 'មានវត្តមាន', icon: '✅', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', iconBg: '#10b981' },
                  { key: 'ABSENT',     label: 'អវត្តមាន',   icon: '✗',  color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', iconBg: '#ef4444' },
                  { key: 'LATE',       label: 'យឺត',         icon: '⏳', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', iconBg: '#f59e0b' },
                  { key: 'PERMISSION', label: 'ច្បាប់',      icon: '📝', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', iconBg: '#3b82f6' },
                  { key: 'NONE',       label: 'មិនទាន់',     icon: '○',  color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', iconBg: '#94a3b8' },
                ] as const).map(s => (
                  <div key={s.key} className={att.statCard} style={{ background: s.bg, borderColor: s.border }}>
                    <div className={att.statIcon} style={{ background: s.iconBg + '22', color: s.iconBg, fontSize: '1.1rem' }}>
                      {s.icon}
                    </div>
                    <div>
                      <div className={att.statNum} style={{ color: s.color }}>
                        {counts[s.key as keyof typeof counts]}
                      </div>
                      <div className={att.statLabel} style={{ color: s.color }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Progress bar ── */}
              <div className={att.progressSection}>
                <div className={att.progressTop}>
                  <span className={att.progressLabel}>វឌ្ឍនភាពការកត់ត្រា — {marked}/{roster.length} នាក់</span>
                  <span className={att.progressPct}>{pct}%</span>
                </div>
                <div className={att.progressTrack}>
                  <div className={att.progressFill} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </>
          )}

          {/* ── Tabs ── */}
          <div className={att.tabs}>
            <button
              className={`${att.tab} ${activeTab === 'RECORD' ? `${att.tabActive} ${att.tabActiveBlue}` : ''}`}
              onClick={() => { setActiveTab('RECORD'); setPage(1); }}
            >
              📋 កត់ត្រាប្រចាំថ្ងៃ
            </button>
            <button
              className={`${att.tab} ${activeTab === 'ABSENT_ALERT' ? `${att.tabActive} ${att.tabActiveRed}` : ''}`}
              onClick={() => { setActiveTab('ABSENT_ALERT'); setPage(1); }}
            >
              ⚠ អវត្តមាន &gt; ៣ ({periodLabel})
              {absentAlertCount > 0 && (
                <span className={att.tabBadge} style={{ background: activeTab === 'ABSENT_ALERT' ? '#ef4444' : '#94a3b8', opacity: 1, color: '#fff', fontSize: '0.64rem', minWidth: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, padding: '0 5px' }}>
                  {absentAlertCount}
                </span>
              )}
            </button>
            <button
              className={`${att.tab} ${activeTab === 'PERMISSION_ALERT' ? `${att.tabActive} ${att.tabActiveAmber}` : ''}`}
              onClick={() => { setActiveTab('PERMISSION_ALERT'); setPage(1); }}
            >
              ⚠ ច្បាប់ &gt; ៣ ({periodLabel})
              {permAlertCount > 0 && (
                <span style={{ background: activeTab === 'PERMISSION_ALERT' ? '#d97706' : '#94a3b8', opacity: 1, color: '#fff', fontSize: '0.64rem', minWidth: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, padding: '0 5px' }}>
                  {permAlertCount}
                </span>
              )}
            </button>
          </div>

          {/* ── Toolbar ── */}
          <div className={att.toolbar}>
            <div className={att.searchWrapper}>
              <span className={att.searchIcon}>⌕</span>
              <input
                type="text"
                className={att.searchInput}
                placeholder="ស្វែងរកឈ្មោះ ឬលេខកូដ..."
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </div>
            {(isAdmin || isMonitor) && activeTab === 'RECORD' && (
              <div className={att.quickActions}>
                <button className={`${att.quickBtn} ${att.quickBtnRed}`}    onClick={() => setAll('ABSENT')} disabled={!canSave}>✗ អវត្តមានទាំងអស់</button>
                <button className={`${att.quickBtn} ${att.quickBtnBlue}`}   onClick={() => setAll('PERMISSION')} disabled={!canSave}>📝 ច្បាប់ទាំងអស់</button>
                <button className={`${att.quickBtn} ${att.quickBtnYellow}`} onClick={() => setAll('LATE')} disabled={!canSave}>⏳ យឺតទាំងអស់</button>
                <button className={`${att.quickBtn} ${att.quickBtnGray}`}   onClick={() => setStatusMap({})} disabled={!canSave}>↻ លុបជម្រើស</button>
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
                    <th className={att.th}>ថ្ងៃខែឆ្នាំ</th>
                    <th className={att.th}>ទូរស័ព្ទ</th>
                    <th className={att.th}>វត្ត</th>
                    <th className={att.th}>កុដិ / មេកុដិ</th>
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
                                title={`${periodLabel} — អវត្តមាន ${alert.absent} ដង • ច្បាប់ ${alert.permission} ដង (លើស ${MONTHLY_LIMIT} ដង)`}
                              >
                                ⚠ លើសកំណត់
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{s.gender === 'M' ? 'ប្រុស' : s.gender === 'F' ? 'ស្រី' : (s.gender || '—')}</td>
                        <td>{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('km-KH') : '—'}</td>
                        <td>{s.phone || '—'}</td>
                        <td>{s.wat || '—'}</td>
                        <td>{[s.kuti, s.kutiHead ? `(${s.kutiHead})` : ''].filter(Boolean).join(' ') || '—'}</td>
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
                                    disabled={!canSave}
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
                    {filtered.length === 0 ? '0' : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)}`} ក្នុងចំណោម {filtered.length} នាក់
                  </span>
                  <div className={att.paginationBtns}>
                    <button className={att.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>← មុន</button>
                    <span className={att.pageIndicator}>ទំព័រ {currentPage}/{totalPages}</span>
                    <button className={att.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>បន្ទាប់ →</button>
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
