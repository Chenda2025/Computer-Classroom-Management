'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { parsePermissions, canInsert, canWrite, canDelete } from '../../../lib/permissions';
import { useRouter } from 'next/navigation';
import styles from './courses.module.css';
import tableStyles from '../students/students.module.css';
import ExportModal from './ExportModal';

interface Course {
  id: string;
  name: string;
  description: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  _count: { enrollments: number; lessonPlans: number; exams: number };
}

interface StudentSummary {
  id: string;
  studentCode: string;
  name: string;
  phone: string | null;
  photoUrl: string | null;
}

interface EnrolledStudent extends StudentSummary {
  examId: string | null;
  examTitle: string | null;
  score: number | null;
  passed: boolean;
}

interface Props {
  userPerms: string;
  initialCourses: Course[];
  allStudents: StudentSummary[];
  enrolledStudentIds: string[];
  userRole: string;
}

const EMPTY_FORM = { name: '', description: '', order: '' };

const COURSE_COLORS = [
  { color: '#6366f1', light: '#818cf8', bg: '#eef2ff' },
  { color: '#10b981', light: '#34d399', bg: '#ecfdf5' },
  { color: '#f59e0b', light: '#fbbf24', bg: '#fffbeb' },
  { color: '#3b82f6', light: '#60a5fa', bg: '#eff6ff' },
  { color: '#8b5cf6', light: '#a78bfa', bg: '#f5f3ff' },
  { color: '#ec4899', light: '#f472b6', bg: '#fdf2f8' },
  { color: '#14b8a6', light: '#2dd4bf', bg: '#f0fdfa' },
  { color: '#f97316', light: '#fb923c', bg: '#fff7ed' },
];

function courseColor(index: number) {
  return COURSE_COLORS[index % COURSE_COLORS.length];
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function CoursesClient({ initialCourses, allStudents, enrolledStudentIds, userRole, userPerms }: Props) {
  const permMap = useMemo(() => parsePermissions(userPerms), [userPerms]);
  const canIns = canInsert(permMap, 'courses', userRole);
  const canWri = canWrite(permMap, 'courses', userRole);
  const canDel = canDelete(permMap, 'courses', userRole);
  const canInsExamReq = canWri || canInsert(permMap, 'exam-requests', userRole);
  const isAdmin = userRole === 'ADMIN';
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>(initialCourses);
  useEffect(() => { setCourses(initialCourses); }, [initialCourses]);
  const [courseModal, setCourseModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [tgSendingProfile, setTgSendingProfile] = useState(false);

  const [assignCourse, setAssignCourse] = useState<Course | null>(null);
  const [enrolled, setEnrolled] = useState<EnrolledStudent[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [savingScoreId, setSavingScoreId] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState('');
  const [scoreSuccess, setScoreSuccess] = useState('');

  const [examReqId, setExamReqId] = useState<string | null>(null);
  const [examReqDoneIds, setExamReqDoneIds] = useState<Set<string>>(new Set());
  const [selectedExamReqIds, setSelectedExamReqIds] = useState<Set<string>>(new Set());
  const [bulkExamReqLoading, setBulkExamReqLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [enrollError, setEnrollError] = useState('');
  const [infoCourse, setInfoCourse] = useState<Course | null>(null);

  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  useEffect(() => {
    const saved = localStorage.getItem('courseViewMode') as 'table' | 'card' | null;
    if (saved === 'card' || saved === 'table') setViewMode(saved);
  }, []);
  const switchViewMode = (mode: 'table' | 'card') => {
    setViewMode(mode);
    localStorage.setItem('courseViewMode', mode);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const enrolledIds = useMemo(() => new Set(enrolled.map(s => s.id)), [enrolled]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return courses;
    return courses.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  }, [courses, search]);

  const enrolledAnywhere = useMemo(() => new Set(enrolledStudentIds), [enrolledStudentIds]);

  const available = useMemo(() => {
    return allStudents.filter(s =>
      !enrolledIds.has(s.id) &&
      !enrolledAnywhere.has(s.id) &&
      (s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
       s.studentCode.toLowerCase().includes(studentSearch.toLowerCase()))
    );
  }, [allStudents, enrolledIds, enrolledAnywhere, studentSearch]);

  const lockedElsewhereCount = useMemo(() => {
    if (!assignCourse) return 0;
    let n = 0;
    for (const s of allStudents) {
      if (enrolledIds.has(s.id)) continue;
      if (enrolledAnywhere.has(s.id)) n++;
    }
    return n;
  }, [allStudents, enrolledIds, enrolledAnywhere, assignCourse]);

  const totalEnrolled = useMemo(
    () => courses.reduce((sum, c) => sum + c._count.enrollments, 0),
    [courses]
  );

  const nextOrder = useMemo(
    () => courses.reduce((max, c) => Math.max(max, c.order ?? 0), 0) + 1,
    [courses]
  );

  const eligibleForExamReq = useMemo(
    () => enrolled.filter(s => s.examId && !examReqDoneIds.has(s.id)),
    [enrolled, examReqDoneIds]
  );

  const openAdd = () => { setForm({ ...EMPTY_FORM, order: String(nextOrder) }); setFormError(''); setCourseModal('add'); };
  const openEdit = (course: Course) => {
    setForm({ name: course.name, description: course.description ?? '', order: String(course.order ?? 0) });
    setEditingId(course.id); setFormError(''); setCourseModal('edit');
  };
  const closeCourseModal = () => { setCourseModal(null); setEditingId(null); setFormError(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setFormError('');
    try {
      if (courseModal === 'add') {
        const res = await fetch('/api/courses', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error ?? 'មានបញ្ហាកើតឡើង'); return; }
        setCourses(prev => [{ ...data, _count: { enrollments: 0, lessonPlans: 0, exams: 0 } }, ...prev]);
      } else {
        const res = await fetch(`/api/courses/${editingId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error ?? 'មានបញ្ហាកើតឡើង'); return; }
        setCourses(prev => prev.map(c => c.id === editingId ? { ...c, ...data } : c));
      }
      closeCourseModal();
      window.location.reload();
    } catch {
      setFormError('មានបញ្ហាបណ្ដាញ។ សូមព្យាយាមម្ដងទៀត');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try {
      const res = await fetch(`/api/courses/${deleteTarget}`, { method: 'DELETE' });
      if (res.ok) {
        setCourses(prev => prev.filter(c => c.id !== deleteTarget));
        setSelectedIds(prev => { const n = new Set(prev); n.delete(deleteTarget); return n; });
        window.location.reload();
      }
    } catch { /* ignore network errors — modal closes either way */ }
    finally { setDeleteTarget(null); setDeleting(false); }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await fetch('/api/courses', { method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }) });
      setCourses(prev => prev.filter(c => !selectedIds.has(c.id)));
      setSelectedIds(new Set()); setBulkDeleteConfirm(false);
      window.location.reload();
    } finally { setBulkDeleting(false); }
  };

  const handleBulkTelegramProfiles = async () => {
    if (!confirm(`តើអ្នកពិតជាចង់ផ្ញើព័ត៌មានវគ្គសិក្សាចំនួន ${selectedIds.size} ចូល Telegram មែនទេ?`)) return;
    
    setTgSendingProfile(true);
    let successCount = 0;
    try {
      const selectedCourses = courses.filter(c => selectedIds.has(c.id));
      for (const c of selectedCourses) {
        const caption = `🎓 <b>វគ្គសិក្សា (Course Info)</b>\n` +
          `📚 ឈ្មោះវគ្គ: ${c.name}\n` +
          `📝 ការពិពណ៌នា: ${c.description || 'គ្មាន'}\n` +
          `👥 សិស្សចុះឈ្មោះ: ${c._count.enrollments}\n` +
          `📋 កិច្ចតែងការ: ${c._count.lessonPlans}\n` +
          `📝 ការប្រឡង: ${c._count.exams}`;

        const fd = new FormData();
        fd.append('caption', caption);
        
        const res = await fetch('/api/export/telegram', { method: 'POST', body: fd });
        if (res.ok) successCount++;
        
        await new Promise(r => setTimeout(r, 500)); // anti-spam
      }
      alert(`ផ្ញើចូល Telegram បានជោគជ័យ ចំនួន ${successCount}/${selectedCourses.length} ✓`);
      setSelectedIds(new Set());
    } catch (err: any) {
      alert('មានបញ្ហាពេលផ្ញើ៖ ' + err.message);
    } finally {
      setTgSendingProfile(false);
    }
  };

  const loadEnrolled = useCallback(async (courseId: string) => {
    setEnrolled([]); setEnrollLoading(true); setEnrollError('');
    setScoreInputs({}); setScoreError(''); setScoreSuccess('');
    setExamReqDoneIds(new Set()); setExamReqId(null); setSelectedExamReqIds(new Set());
    try {
      const res = await fetch(`/api/courses/${courseId}/enrollments`);
      const text = await res.text();
      if (!text) {
        setEnrollError(`Server error (${res.status}) — empty response`);
        return;
      }
      let data: any;
      try { data = JSON.parse(text); } catch {
        setEnrollError(`Server error (${res.status}): ${text.slice(0, 120)}`);
        return;
      }
      if (!res.ok) {
        setEnrollError(data?.error ?? `Load failed (${res.status})`);
        return;
      }
      setEnrolled(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setEnrollError('មានបញ្ហាបណ្ដាញ: ' + (err?.message ?? 'unknown'));
    } finally { setEnrollLoading(false); }
  }, []);

  const openAssign = useCallback(async (course: Course) => {
    setAssignCourse(course); setStudentSearch('');
    await loadEnrolled(course.id);
  }, [loadEnrolled]);

  const closeAssign = () => {
    setAssignCourse(null); setStudentSearch(''); setEnrollError('');
    setScoreInputs({}); setScoreError(''); setScoreSuccess('');
    setExamReqDoneIds(new Set()); setExamReqId(null); setSelectedExamReqIds(new Set());
  };

  const handleEnroll = async (studentId: string) => {
    if (!assignCourse) return;
    setEnrollingId(studentId);
    setEnrollError('');
    const courseId = assignCourse.id;
    try {
      const res = await fetch(`/api/courses/${courseId}/enrollments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();
      if (!res.ok) { setEnrollError(data.error ?? 'មានបញ្ហាកើតឡើង'); return; }
      const student = allStudents.find(s => s.id === studentId);
      if (!student) return;
      setEnrolled(prev => [...prev, student as EnrolledStudent]);
      setCourses(prev => prev.map(c =>
        c.id === courseId
          ? { ...c, _count: { ...c._count, enrollments: c._count.enrollments + 1 } }
          : c
      ));
      window.location.reload();
    } catch { setEnrollError('មានបញ្ហាបណ្ដាញ');
    } finally { setEnrollingId(null); }
  };

  const handleUnenroll = async (studentId: string) => {
    if (!assignCourse) return;
    setRemovingId(studentId);
    setEnrollError('');
    const courseId = assignCourse.id;
    try {
      const res = await fetch(`/api/courses/${courseId}/enrollments`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      if (!res.ok) { setEnrollError('មានបញ្ហាលុបការចុះឈ្មោះ'); return; }
      setEnrolled(prev => prev.filter(s => s.id !== studentId));
      setCourses(prev => prev.map(c =>
        c.id === courseId
          ? { ...c, _count: { ...c._count, enrollments: Math.max(0, c._count.enrollments - 1) } }
          : c
      ));
      window.location.reload();
    } catch { setEnrollError('មានបញ្ហាបណ្ដាញ');
    } finally { setRemovingId(null); }
  };

  const handleSetScore = async (studentId: string) => {
    if (!assignCourse) return;
    const raw = (scoreInputs[studentId] ?? '').trim();
    const num = Number(raw);
    if (!raw || !Number.isFinite(num) || num < 0 || num > 100) {
      setScoreError('សូមបញ្ចូលពិន្ទុជាលេខពី ០ ដល់ ១០០');
      return;
    }
    setSavingScoreId(studentId);
    setScoreError('');
    const courseId = assignCourse.id;
    try {
      const res = await fetch(`/api/courses/${courseId}/exam-score`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, score: num }),
      });
      const data = await res.json();
      if (!res.ok) { setScoreError(data.error ?? 'មានបញ្ហាកើតឡើង'); return; }

      if (data.promoted) {
        setEnrolled(prev => prev.filter(s => s.id !== studentId));
        setCourses(prev => prev.map(c =>
          c.id === courseId
            ? { ...c, _count: { ...c._count, enrollments: Math.max(0, c._count.enrollments - 1) } }
            : c
        ));
        setScoreSuccess(`✓ សិស្សបានជ្រើសជាប់ → បានបន្តទៅ "${data.nextCourseName}"`);
      } else {
        setEnrolled(prev => prev.map(s => s.id === studentId
          ? { ...s, examId: data.examId, examTitle: data.examTitle, score: data.score, passed: data.passed }
          : s));
      }
      setScoreInputs(prev => { const n = { ...prev }; delete n[studentId]; return n; });
      window.location.reload();
    } catch { setScoreError('មានបញ្ហាបណ្ដាញ');
    } finally { setSavingScoreId(null); }
  };

  const handlePromoteToExamRequest = async (studentId: string, examId: string) => {
    setExamReqId(studentId);
    setEnrollError('');
    try {
      const res = await fetch('/api/exam-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: [studentId], examId }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 409) { setEnrollError(data.error ?? 'មានបញ្ហា'); return; }
      setExamReqDoneIds(prev => new Set([...prev, studentId]));
    } catch { setEnrollError('មានបញ្ហាបណ្ដាញ');
    } finally { setExamReqId(null); }
  };

  const handleBulkPromoteExamRequest = async (ids: string[]) => {
    if (!ids.length) return;
    setBulkExamReqLoading(true);
    setEnrollError('');
    try {
      const byExam: Record<string, string[]> = {};
      for (const sId of ids) {
        const s = enrolled.find(e => e.id === sId);
        if (!s?.examId) continue;
        (byExam[s.examId] ??= []).push(sId);
      }
      for (const [examId, sIds] of Object.entries(byExam)) {
        const res = await fetch('/api/exam-requests', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentIds: sIds, examId }),
        });
        const data = await res.json();
        if (!res.ok && res.status !== 409) { setEnrollError(data.error ?? 'មានបញ្ហា'); return; }
        setExamReqDoneIds(prev => new Set([...prev, ...sIds]));
      }
      setSelectedExamReqIds(new Set());
    } catch { setEnrollError('មានបញ្ហាបណ្ដាញ');
    } finally { setBulkExamReqLoading(false); }
  };

  return (
    <>
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h2>វគ្គសិក្សា</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
            វគ្គសិក្សាសរុប: <strong style={{ color: 'var(--color-accent)' }}>{courses.length}</strong> វគ្គ
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" onClick={() => setExportModal(true)}>
            📥 មើលរបាយការណ៍/នាំចេញ
          </button>
          {canIns && (
            <button className={styles.addBtn} onClick={openAdd}>
              <span className={styles.addBtnIcon}>📚</span>
              បញ្ចូលវគ្គសិក្សា
            </button>
          )}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard} style={{ borderLeft: '4px solid #6366f1' }}>
          <div className={styles.statIconWrap} style={{ background: '#eef2ff' }}>📚</div>
          <div>
            <div className={styles.statLabel}>វគ្គសិក្សា</div>
            <div className={styles.statValue} style={{ color: '#6366f1' }}>{courses.length}</div>
          </div>
        </div>
        <div className={styles.statCard} style={{ borderLeft: '4px solid #10b981' }}>
          <div className={styles.statIconWrap} style={{ background: '#ecfdf5' }}>👥</div>
          <div>
            <div className={styles.statLabel}>ចុះឈ្មោះសរុប</div>
            <div className={styles.statValue} style={{ color: '#10b981' }}>{totalEnrolled}</div>
          </div>
        </div>
        <div className={styles.statCard} style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className={styles.statIconWrap} style={{ background: '#fffbeb' }}>📋</div>
          <div>
            <div className={styles.statLabel}>ប្រឡង</div>
            <div className={styles.statValue} style={{ color: '#f59e0b' }}>{courses.reduce((s, c) => s + c._count.exams, 0)}</div>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="ស្វែងរកវគ្គសិក្សា..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {search && <span className={styles.resultCount}>{filtered.length} / {courses.length} វគ្គ</span>}
        
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

      {/* ── Empty ── */}
      {filtered.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📚</div>
          <p>{search ? 'រកមិនឃើញវគ្គសិក្សា' : 'មិនទាន់មានវគ្គសិក្សាណាមួយទេ'}</p>
          {canIns && !search && (
            <button className={styles.addBtn} onClick={openAdd} style={{ marginTop: 20 }}>
              <span className={styles.addBtnIcon}>📚</span>
              បញ្ចូលវគ្គសិក្សា
            </button>
          )}
        </div>
      )}

      {/* ── Course grid ── */}
      {filtered.length > 0 && viewMode === 'card' && (
        <div className={styles.courseGrid}>
          {filtered.map((course, i) => {
            const clr = courseColor(courses.indexOf(course));
            return (
              <div
                key={course.id}
                className={styles.courseCard}
                style={{ '--card-accent': clr.color, '--card-accent-light': clr.light, animationDelay: `${i * 40}ms` } as React.CSSProperties}
              >
                <input
                  type="checkbox"
                  className={styles.cardCheck}
                  checked={selectedIds.has(course.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    setSelectedIds(prev => {
                      const n = new Set(prev);
                      n.has(course.id) ? n.delete(course.id) : n.add(course.id);
                      return n;
                    });
                  }}
                />

                {/* Card body */}
                <div className={styles.cardBody}>
                  <div className={styles.cardTopRow}>
                    <div className={styles.courseAvatar} style={{ background: `linear-gradient(135deg, ${clr.color}, ${clr.light})` }}>
                      {initials(course.name)}
                    </div>
                    <div className={styles.courseTitleWrap}>
                      <div className={styles.courseName}>{course.name}</div>
                      <span className={styles.cardBadge} style={{ background: clr.bg, color: clr.color }}>
                        <span className={styles.cardBadgeDot} />
                        លំដាប់ {course.order ?? 0}
                      </span>
                    </div>
                  </div>
                  {course.description && <div className={styles.courseDesc}>{course.description}</div>}
                </div>

                {/* Metrics strip */}
                <div className={styles.cardMetrics}>
                  <div className={styles.metric}>
                    <span className={styles.metricIcon}>👥</span>
                    <span className={styles.metricVal} style={{ color: clr.color }}>{course._count.enrollments}</span>
                    <span className={styles.metricLbl}>សិស្ស</span>
                  </div>
                  <div className={styles.metricDivider} />
                  <div className={styles.metric}>
                    <span className={styles.metricIcon}>📋</span>
                    <span className={styles.metricVal} style={{ color: '#2563eb' }}>{course._count.lessonPlans}</span>
                    <span className={styles.metricLbl}>កិច្ចតែង</span>
                  </div>
                  <div className={styles.metricDivider} />
                  <div className={styles.metric}>
                    <span className={styles.metricIcon}>📝</span>
                    <span className={styles.metricVal} style={{ color: '#d97706' }}>{course._count.exams}</span>
                    <span className={styles.metricLbl}>ប្រឡង</span>
                  </div>
                </div>

                {/* Actions */}
                <div className={styles.cardActions}>
                  <button className={`${styles.iconBtn} ${styles.infoBtn}`}
                    onClick={() => setInfoCourse(course)} title="ព័ត៌មានលម្អិត">👁️</button>
                  <button
                    className={styles.manageBtn}
                    style={{ color: clr.color, borderColor: clr.color + '44', background: clr.bg }}
                    onClick={() => openAssign(course)}
                  >
                    {isAdmin ? '👥 គ្រប់គ្រងសិស្ស' : '👁️ មើលសិស្ស'}
                  </button>
                  {canWri && <button className={`${styles.iconBtn} ${styles.editBtn}`} onClick={() => openEdit(course)} title="កែប្រែ">✏️</button>}
                  {canDel && <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => setDeleteTarget(course.id)} title="លុប">🗑️</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Course table ── */}
      {filtered.length > 0 && viewMode === 'table' && (
        <div className={tableStyles.tableWrapper}>
          <table className={tableStyles.table}>
            <thead className={tableStyles.thead}>
              <tr>
                <th className={tableStyles.checkCell}>
                  <input type="checkbox" className={tableStyles.checkbox} onChange={toggleSelectAll} checked={filtered.length > 0 && selectedIds.size === filtered.length} />
                </th>
                <th>ឈ្មោះវគ្គសិក្សា</th>
                <th>លំដាប់</th>
                <th>ការពិពណ៌នា</th>
                <th>សិស្ស</th>
                <th>កិច្ចតែង</th>
                <th>ប្រឡង</th>
                <th style={{ textAlign: 'right' }}>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(course => {
                const clr = courseColor(courses.indexOf(course));
                return (
                  <tr key={course.id} className={`${tableStyles.row} ${selectedIds.has(course.id) ? tableStyles.rowSelected : ''}`}>
                    <td className={tableStyles.checkCell}>
                      <input type="checkbox" className={tableStyles.checkbox} checked={selectedIds.has(course.id)} onChange={() => {
                        setSelectedIds(prev => {
                          const n = new Set(prev);
                          n.has(course.id) ? n.delete(course.id) : n.add(course.id);
                          return n;
                        });
                      }} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className={styles.courseAvatar} style={{ background: `linear-gradient(135deg, ${clr.color}, ${clr.light})`, width: 32, height: 32, fontSize: '0.8rem' }}>
                          {initials(course.name)}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{course.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.cardBadge} style={{ background: clr.bg, color: clr.color, display: 'inline-flex' }}>
                        <span className={styles.cardBadgeDot} /> លំដាប់ {course.order ?? 0}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{course.description || '—'}</td>
                    <td><span style={{ color: clr.color, fontWeight: 600 }}>{course._count.enrollments}</span></td>
                    <td><span style={{ color: '#2563eb', fontWeight: 600 }}>{course._count.lessonPlans}</span></td>
                    <td><span style={{ color: '#d97706', fontWeight: 600 }}>{course._count.exams}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button className={`${styles.iconBtn} ${styles.infoBtn}`} onClick={() => setInfoCourse(course)} title="ព័ត៌មានលម្អិត">👁️</button>
                        <button className={styles.manageBtn} style={{ color: clr.color, borderColor: clr.color + '44', background: clr.bg, padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => openAssign(course)}>
                          {isAdmin ? '👥' : '👁️'}
                        </button>
                        {canWri && <button className={`${styles.iconBtn} ${styles.editBtn}`} onClick={() => openEdit(course)} title="កែប្រែ">✏️</button>}
                        {canDel && <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => setDeleteTarget(course.id)} title="លុប">🗑️</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>{/* end animate-fade-in */}

      {/* ── Bulk Action Bar ── */}
      {canDel && selectedIds.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--color-surface)', padding: '12px 24px', borderRadius: 30, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 16, zIndex: 100, border: '1px solid var(--color-border)' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>✓ បានជ្រើសរើស {selectedIds.size} វគ្គ</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setExportModal(true)} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 20, cursor: 'pointer' }}>
              📤 នាំចេញជារបាយការណ៍
            </button>
            <button onClick={handleBulkTelegramProfiles} disabled={tgSendingProfile} style={{ background: '#229ED9', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 20, cursor: tgSendingProfile ? 'not-allowed' : 'pointer', opacity: tgSendingProfile ? 0.7 : 1 }}>
              {tgSendingProfile ? 'កំពុងផ្ញើ...' : '✈️ ផ្ញើចូល Telegram (កាត)'}
            </button>
            <button onClick={() => setSelectedIds(new Set())} style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', padding: '6px 12px', borderRadius: 20, cursor: 'pointer' }}>បោះបង់</button>
            <button onClick={() => setBulkDeleteConfirm(true)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: 20, cursor: 'pointer' }}>🗑️ លុប {selectedIds.size} វគ្គ</button>
          </div>
        </div>
      )}

      {/* ── Export Modal ── */}
      {exportModal && (
        <ExportModal
          courses={selectedIds.size > 0 ? filtered.filter(c => selectedIds.has(c.id)) : filtered}
          onClose={() => setExportModal(false)}
        />
      )}

      {/* ── Bulk Delete Confirm ── */}
      {bulkDeleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => !bulkDeleting && setBulkDeleteConfirm(false)}>
          <div className={`glass-panel ${styles.confirmCard}`} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#f87171' }}>⚠️ លុបវគ្គសិក្សាចំនួន {selectedIds.size}?</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 14, lineHeight: 1.7, fontSize: '0.92rem' }}>
              តើអ្នកប្រាកដជាចង់លុបវគ្គសិក្សាដែលបានជ្រើសរើសទាំងនេះ?{' '}
              ការលុបវគ្គនេះនឹង<strong style={{ color: 'var(--color-text-primary)' }}> លុបទិន្នន័យទាំងអស់</strong>{' '}
              ដែលទាក់ទង (ការចុះឈ្មោះ, កិច្ចតែងការ, ការប្រឡង) ហើយមិនអាចស្ដារវិញបានទេ។
            </p>
            <div className={styles.formActions} style={{ marginTop: 28 }}>
              <button className={styles.cancelBtn} onClick={() => setBulkDeleteConfirm(false)} disabled={bulkDeleting}>បោះបង់</button>
              <button className={styles.addBtn} style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 3px 12px rgba(239,68,68,0.35)' }}
                onClick={handleBulkDelete} disabled={bulkDeleting}>
                {bulkDeleting ? '⏳ កំពុងលុប...' : '🗑️ លុបចោល'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {courseModal && (
        <div className={styles.modalOverlay} onClick={closeCourseModal}>
          <div className={styles.courseModal} onClick={e => e.stopPropagation()}>

            {/* Banner */}
            <div
              className={styles.modalBanner}
              style={{ background: courseModal === 'add'
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
            >
              <div className={styles.bannerIcon}>{courseModal === 'add' ? '📚' : '✏️'}</div>
              <div className={styles.bannerText}>
                <div className={styles.bannerTitle}>
                  {courseModal === 'add' ? 'បញ្ចូលវគ្គសិក្សាថ្មី' : 'កែប្រែវគ្គសិក្សា'}
                </div>
                <div className={styles.bannerSub}>
                  {courseModal === 'add' ? 'បំពេញព័ត៌មានខាងក្រោម' : 'កែប្រែព័ត៌មានវគ្គសិក្សា'}
                </div>
              </div>
              <button className={styles.bannerClose} onClick={closeCourseModal}>✕</button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className={styles.modalBody}>
              {formError && <div className={styles.formError}>{formError}</div>}

              {/* Live preview */}
              {form.name.trim() && (
                <div className={styles.previewRow}>
                  <div className={styles.previewAvatar}>{initials(form.name)}</div>
                  <div className={styles.previewInfo}>
                    <div className={styles.previewName}>{form.name}</div>
                    {form.description && <div className={styles.previewDesc}>{form.description}</div>}
                  </div>
                  <span className={styles.previewLabel}>មើលជាមុន</span>
                </div>
              )}

              <div className={styles.formGroup}>
                <div className={styles.fieldLabel}>
                  ឈ្មោះវគ្គសិក្សា <span className={styles.required}>*</span>
                </div>
                <input
                  type="text"
                  className={styles.input}
                  required
                  autoFocus
                  placeholder="ឧ. គណិតវិទ្យា ថ្នាក់ទី១"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className={styles.formGroup}>
                <div className={styles.fieldLabel}>
                  លំដាប់វគ្គ (Order) <span className={styles.optional}>(ស្រេចចិត្ត)</span>
                </div>
                <input
                  type="number"
                  min={0}
                  className={styles.input}
                  placeholder="ឧ. ១, ២, ៣..."
                  value={form.order}
                  onChange={e => setForm(f => ({ ...f, order: e.target.value }))}
                />
                <div className={styles.charCount}>
                  កំណត់លំដាប់នៃការសិក្សា (តូចទៅធំ) ដើម្បីឲ្យប្រព័ន្ធដឹងថាសិស្សត្រូវបន្តទៅវគ្គណាបន្ទាប់ ពេលប្រឡងជាប់
                </div>
              </div>

              <div className={styles.formGroup}>
                <div className={styles.fieldLabel}>
                  ការពិពណ៌នា <span className={styles.optional}>(ស្រេចចិត្ត)</span>
                </div>
                <textarea
                  className={`${styles.input} ${styles.textarea}`}
                  rows={3}
                  placeholder="ការពិពណ៌នាអំពីវគ្គសិក្សា..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
                {form.description.length > 0 && (
                  <div className={styles.charCount}>{form.description.length} តួអក្សរ</div>
                )}
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={closeCourseModal} disabled={submitting}>
                  បោះបង់
                </button>
                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting
                    ? 'កំពុងរក្សាទុក...'
                    : courseModal === 'add' ? 'បញ្ចូលវគ្គសិក្សា' : 'រក្សាទុក'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (() => {
        const target = courses.find(c => c.id === deleteTarget);
        return (
          <div className={styles.modalOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
            <div className={styles.confirmCard} onClick={e => e.stopPropagation()}>

              {/* Danger banner */}
              <div className={styles.deleteBanner}>
                <div className={styles.deleteBannerIcon}>🗑️</div>
                <div className={styles.deleteBannerText}>
                  <div className={styles.deleteBannerTitle}>លុបវគ្គសិក្សា?</div>
                  <div className={styles.deleteBannerSub}>សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ</div>
                </div>
              </div>

              <div className={styles.deleteBody}>
                {/* Course being deleted */}
                {target && (
                  <div className={styles.deleteCourseRow}>
                    <div className={styles.deleteCourseAvatar}>{initials(target.name)}</div>
                    <div className={styles.deleteCourseInfo}>
                      <div className={styles.deleteCourseName}>{target.name}</div>
                      {target.description && (
                        <div className={styles.deleteCourseDesc}>{target.description}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Impact list */}
                <div className={styles.deleteImpact}>
                  <div className={styles.deleteImpactTitle}>ទិន្នន័យដែលនឹងត្រូវបានលុប</div>
                  {[
                    { icon: '👥', label: `ការចុះឈ្មោះសិស្ស ${target ? `(${target._count.enrollments})` : ''}` },
                    { icon: '📋', label: `កិច្ចតែងការ ${target ? `(${target._count.lessonPlans})` : ''}` },
                    { icon: '📝', label: `ការប្រឡង ${target ? `(${target._count.exams})` : ''}` },
                  ].map(item => (
                    <div key={item.label} className={styles.deleteImpactRow}>
                      <span className={styles.deleteImpactDot} />
                      <span className={styles.deleteImpactIcon}>{item.icon}</span>
                      <span className={styles.deleteImpactLabel}>{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className={styles.deleteActions}>
                  <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)} disabled={deleting}>
                    បោះបង់
                  </button>
                  <button className={styles.deleteConfirmBtn} onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'កំពុងលុប...' : 'លុបចោល'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── Info Modal ── */}
      {infoCourse && (() => {
        const clr = courseColor(courses.indexOf(infoCourse));
        return (
          <div className={styles.modalOverlay} onClick={() => setInfoCourse(null)}>
            <div className={styles.infoModal} onClick={e => e.stopPropagation()}>
              <div className={styles.infoBanner}
                style={{ background: `linear-gradient(135deg, ${clr.color}, ${clr.light})` }}>
                <div className={styles.infoBannerAvatar} style={{ color: clr.color }}>
                  {initials(infoCourse.name)}
                </div>
                <div className={styles.infoBannerText}>
                  <div className={styles.infoBannerName}>{infoCourse.name}</div>
                  {infoCourse.description && (
                    <div className={styles.infoBannerDesc}>{infoCourse.description}</div>
                  )}
                </div>
                <button className={styles.bannerClose} onClick={() => setInfoCourse(null)}>✕</button>
              </div>

              <div className={styles.infoBody}>
                <div className={styles.infoStats}>
                  <div className={styles.infoStat}>
                    <span className={styles.infoStatVal} style={{ color: clr.color }}>
                      {infoCourse._count.enrollments}
                    </span>
                    <span className={styles.infoStatLbl}>👥 សិស្ស</span>
                  </div>
                  <div className={styles.infoStat}>
                    <span className={styles.infoStatVal}>{infoCourse._count.lessonPlans}</span>
                    <span className={styles.infoStatLbl}>📋 កិច្ចតែងការ</span>
                  </div>
                  <div className={styles.infoStat}>
                    <span className={styles.infoStatVal}>{infoCourse._count.exams}</span>
                    <span className={styles.infoStatLbl}>📝 ការប្រឡង</span>
                  </div>
                </div>

                <div className={styles.infoMeta}>
                  <div className={styles.infoMetaRow}>
                    <span className={styles.infoMetaIcon} style={{ background: clr.bg, color: clr.color }}>🗓</span>
                    <div className={styles.infoMetaText}>
                      <div className={styles.infoMetaKey}>បង្កើតនៅ</div>
                      <div className={styles.infoMetaVal}>
                        {new Date(infoCourse.createdAt).toLocaleDateString('km-KH', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className={styles.infoMetaRow}>
                    <span className={styles.infoMetaIcon} style={{ background: clr.bg, color: clr.color }}>🔄</span>
                    <div className={styles.infoMetaText}>
                      <div className={styles.infoMetaKey}>ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ</div>
                      <div className={styles.infoMetaVal}>
                        {new Date(infoCourse.updatedAt).toLocaleDateString('km-KH', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>

                <button className={styles.infoCloseBtn} onClick={() => setInfoCourse(null)}>
                  បិទ
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Assign Students Modal ── */}
      {assignCourse && (
        <div className={styles.assignOverlay} onClick={closeAssign}>
          <div className={styles.assignModal} onClick={e => e.stopPropagation()}>

            {/* Banner */}
            <div className={styles.assignBanner}>
              <div className={styles.assignBannerIcon}>👥</div>
              <div className={styles.assignBannerText}>
                <div className={styles.assignBannerTitle}>
                  {isAdmin ? 'គ្រប់គ្រងសិស្ស' : 'បញ្ជីសិស្ស'}
                </div>
                <div className={styles.assignBannerCourse}>📚 {assignCourse.name}</div>
              </div>
              <div className={styles.assignBannerStats}>
                <div className={styles.assignStatChip}>
                  <span className={styles.assignStatVal}>{enrolled.length}</span>
                  <span className={styles.assignStatLbl}>ចុះឈ្មោះ</span>
                </div>
                <div className={styles.assignStatChip}>
                  <span className={styles.assignStatVal}>{available.length}</span>
                  <span className={styles.assignStatLbl}>នៅសល់</span>
                </div>
              </div>
              <button className={styles.assignBannerClose} onClick={closeAssign}>✕</button>
            </div>

            {(enrollError || scoreError) && (
              <div className={styles.enrollError} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>⚠️ {enrollError || scoreError}</span>
                {enrollError && assignCourse && (
                  <button
                    onClick={() => loadEnrolled(assignCourse.id)}
                    style={{ background: 'none', border: '1px solid rgba(220,38,38,0.4)', borderRadius: 6, padding: '2px 10px', cursor: 'pointer', fontSize: '0.75rem', color: '#dc2626', marginLeft: 10 }}
                  >
                    🔄 ព្យាយាមម្ដងទៀត
                  </button>
                )}
              </div>
            )}
            {scoreSuccess && (
              <div className={styles.enrollSuccess}>{scoreSuccess}</div>
            )}

            <div className={styles.assignPanels}>

              {/* Left — Enrolled */}
              <div className={styles.assignPanel}>
                <div className={styles.panelHeader}>
                  <span className={styles.panelDot} style={{ background: '#10b981' }} />
                  <h4>បានចុះឈ្មោះ</h4>
                  <span className={styles.panelBadge} style={{ background: '#ecfdf5', color: '#059669' }}>
                    {enrolled.length}
                  </span>
                </div>
                {canInsExamReq && eligibleForExamReq.length > 0 && (
                  <div className={styles.examReqBulkBar}>
                    <label className={styles.examReqSelectAll}>
                      <input
                        type="checkbox"
                        checked={selectedExamReqIds.size === eligibleForExamReq.length}
                        onChange={e => setSelectedExamReqIds(
                          e.target.checked ? new Set(eligibleForExamReq.map(s => s.id)) : new Set()
                        )}
                      />
                      <span>ជ្រើសទាំងអស់ ({eligibleForExamReq.length})</span>
                    </label>
                    {selectedExamReqIds.size > 0 && (
                      <button
                        className={styles.examReqBulkBtn}
                        onClick={() => handleBulkPromoteExamRequest(Array.from(selectedExamReqIds))}
                        disabled={bulkExamReqLoading}
                      >
                        {bulkExamReqLoading ? '⏳...' : `📋 ផ្ញើ ${selectedExamReqIds.size} នាក់`}
                      </button>
                    )}
                    <button
                      className={styles.examReqAllBtn}
                      onClick={() => handleBulkPromoteExamRequest(eligibleForExamReq.map(s => s.id))}
                      disabled={bulkExamReqLoading}
                    >
                      {bulkExamReqLoading ? '⏳...' : `📋 ផ្ញើទាំងអស់`}
                    </button>
                  </div>
                )}
                <div className={styles.panelList}>
                  {enrollLoading && <div className={styles.loadingRow}>កំពុងផ្ទុក...</div>}
                  {!enrollLoading && !enrollError && enrolled.length === 0 && (
                    <div className={styles.panelEmpty}>
                      <span>🎓</span>
                      <span>មិនទាន់មានសិស្សណាមួយ</span>
                    </div>
                  )}
                  {!enrollLoading && enrolled.map(student => (
                    <div key={student.id} className={styles.studentRow}>
                      {canInsExamReq && student.examId && !examReqDoneIds.has(student.id) && (
                        <input
                          type="checkbox"
                          className={styles.examReqCheck}
                          checked={selectedExamReqIds.has(student.id)}
                          onChange={e => setSelectedExamReqIds(prev => {
                            const n = new Set(prev);
                            e.target.checked ? n.add(student.id) : n.delete(student.id);
                            return n;
                          })}
                        />
                      )}
                      <div className={`${styles.studentAvatar} ${student.photoUrl ? styles.studentAvatarPhoto : ''}`}>
                        {student.photoUrl
                          ? <img src={student.photoUrl} className={styles.studentAvatarImg} alt="" onError={e => { (e.currentTarget.parentElement as HTMLElement).classList.remove(styles.studentAvatarPhoto); e.currentTarget.remove(); }} />
                          : initials(student.name)}
                      </div>
                      <div className={styles.studentInfo}>
                        <div className={styles.studentName}>{student.name}</div>
                        <div className={styles.studentCode}>{student.studentCode}</div>
                      </div>
                      {canInsExamReq && student.examId && (
                        <button
                          className={`${styles.rowActionBtn} ${examReqDoneIds.has(student.id) ? styles.examReqDoneBtn : styles.examReqBtn}`}
                          onClick={() => handlePromoteToExamRequest(student.id, student.examId!)}
                          disabled={examReqId === student.id || examReqDoneIds.has(student.id)}
                          title="ផ្ញើស្នើរប្រឡង"
                        >
                          {examReqId === student.id ? '…' : examReqDoneIds.has(student.id) ? '✓' : '📋'}
                        </button>
                      )}
                      {canDel && (
                        <button
                          className={`${styles.rowActionBtn} ${styles.removeRowBtn}`}
                          onClick={() => handleUnenroll(student.id)}
                          disabled={removingId === student.id}
                          title="លុបចេញ"
                        >
                          {removingId === student.id ? '…' : '−'}
                        </button>
                      )}
                      {student.examId && (
                        <div className={styles.scoreBox} title={student.examTitle ?? undefined}>
                          <span className={`${styles.scoreBadge} ${
                            student.score === null ? styles.scorePending
                              : student.passed ? styles.scorePassed : styles.scoreFailed
                          }`}>
                            {student.score === null
                              ? '⏳ មិនទាន់ប្រឡង'
                              : student.passed ? `✓ ជាប់ • ${student.score}` : `✗ ធ្លាក់ • ${student.score}`}
                          </span>
                          {canWri && (
                            <form
                              className={styles.scoreForm}
                              onSubmit={e => { e.preventDefault(); handleSetScore(student.id); }}
                            >
                              <input
                                type="number" min={0} max={100} placeholder="ពិន្ទុ"
                                className={styles.scoreInput}
                                value={scoreInputs[student.id] ?? ''}
                                onChange={e => setScoreInputs(prev => ({ ...prev, [student.id]: e.target.value }))}
                              />
                              <button type="submit" className={styles.scoreSaveBtn} disabled={savingScoreId === student.id}>
                                {savingScoreId === student.id ? '…' : 'រក្សាទុក'}
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — Available */}
              <div className={styles.assignPanel}>
                <div className={styles.panelHeader}>
                  <span className={styles.panelDot} style={{ background: '#6366f1' }} />
                  <h4>{isAdmin ? 'បញ្ចូលសិស្ស' : 'សិស្សទាំងអស់'}</h4>
                  <span className={styles.panelBadge} style={{ background: '#eef2ff', color: '#6366f1' }}>
                    {available.length}
                  </span>
                </div>
                {canIns && (
                  <div className={styles.panelSearch}>
                    <input
                      type="text"
                      className={styles.panelSearchInput}
                      placeholder="ស្វែងរកតាមឈ្មោះ ឬ លេខកូដ..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                    />
                  </div>
                )}
                {lockedElsewhereCount > 0 && (
                  <div className={styles.lockedNote}>
                    🔒 សិស្សចំនួន {lockedElsewhereCount} នាក់កំពុងសិក្សានៅវគ្គផ្សេង — មិនអាចបញ្ចូលក្នុងវគ្គនេះបានទេ
                  </div>
                )}
                <div className={styles.panelList}>
                  {allStudents.length === 0 && (
                    <div className={styles.panelEmpty}>
                      <span>👤</span>
                      <span>មិនទាន់មានសិស្សក្នុងប្រព័ន្ធ</span>
                    </div>
                  )}
                  {allStudents.length > 0 && available.length === 0 && (
                    <div className={styles.panelEmpty}>
                      <span>✅</span>
                      <span>
                        {studentSearch
                          ? 'រកមិនឃើញសិស្ស'
                          : lockedElsewhereCount > 0
                            ? 'សិស្សទាំងអស់កំពុងសិក្សា ឬចុះឈ្មោះរួចហើយ'
                            : 'សិស្សទាំងអស់បានចុះឈ្មោះ'}
                      </span>
                    </div>
                  )}
                  {available.map(student => (
                    <div key={student.id} className={styles.studentRow}>
                      <div className={`${styles.studentAvatar} ${student.photoUrl ? styles.studentAvatarPhoto : styles.studentAvatarAvail}`}>
                        {student.photoUrl
                          ? <img src={student.photoUrl} className={styles.studentAvatarImg} alt="" onError={e => { const p = e.currentTarget.parentElement as HTMLElement; p.classList.remove(styles.studentAvatarPhoto); p.classList.add(styles.studentAvatarAvail); e.currentTarget.remove(); }} />
                          : initials(student.name)}
                      </div>
                      <div className={styles.studentInfo}>
                        <div className={styles.studentName}>{student.name}</div>
                        <div className={styles.studentCode}>{student.studentCode}</div>
                      </div>
                      {canIns && (
                        <button
                          className={`${styles.rowActionBtn} ${styles.addRowBtn}`}
                          onClick={() => handleEnroll(student.id)}
                          disabled={enrollingId === student.id}
                          title="បញ្ចូល"
                        >
                          {enrollingId === student.id ? '…' : '+'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
