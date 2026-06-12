'use client';
import { useState, useMemo, useEffect } from 'react';
import { parsePermissions, canInsert, canWrite, canDelete } from '../../../lib/permissions';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import Link from 'next/link';
import styles from './students.module.css';
import ExportModal from './ExportModal';

const Avatar = ({ id, name, imgClass, fallbackClass, style }: { id: string, name: string, imgClass: string, fallbackClass: string, style?: any }) => {
  const [error, setError] = useState(false);
  if (error) return <div className={fallbackClass} style={style}>{name.charAt(0)}</div>;
  return <img src={`/api/students/${id}/photo`} alt={name} className={imgClass} style={style} onError={() => setError(true)} />;
};

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

interface Student {
  id: string;
  studentCode: string;
  name: string;
  nameEn: string | null;
  phone: string | null;
  photoUrl?: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  wat: string | null;
  kuti: string | null;
  kutiFloor: string | null;
  kutiHead: string | null;
  kutiNumber: string | null;
  parentName: string | null;
  parentPhone: string | null;
  academicYear: string | null;
  educationLevel: string | null;
  grade: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { enrollments: number };
  enrollments: { courseId: string }[];
}

interface Props {
  initialStudents: Student[];
  userRole: string;
  userPerms: string;
}

type Tab = 'basic' | 'residence' | 'bio';

const EMPTY_ADD = { name: '', nameEn: '', phone: '' };

const EMPTY_FULL = {
  name: '', nameEn: '', phone: '', photoUrl: undefined as string | undefined,
  gender: '', dateOfBirth: '', nationality: '',
  wat: '', kuti: '', kutiFloor: '', kutiHead: '', kutiNumber: '',
  parentName: '', parentPhone: '',
  academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, educationLevel: '', grade: '',
  notes: '',
};

function isComplete(s: Student) {
  return !!(s.gender && s.dateOfBirth && s.wat);
}

export default function StudentsClient({ initialStudents, userRole, userPerms }: Props) {
  const permMap = useMemo(() => parsePermissions(userPerms), [userPerms]);
  const router = useRouter();
  const canIns = canInsert(permMap, 'students', userRole);
  const canWri = canWrite(permMap, 'students', userRole);
  const canDel = canDelete(permMap, 'students', userRole);
  const isAdmin = userRole === 'ADMIN';

  const [students, setStudents] = useState<Student[]>(initialStudents);
  useEffect(() => { setStudents(initialStudents); }, [initialStudents]);
  const [search, setSearch] = useState('');
  const [pagodaFilter, setPagodaFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [courses, setCourses] = useState<{ id: string; name: string }[]>();

  // Add modal state
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD);
  const [addError, setAddError] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Full edit modal state
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FULL);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState('');
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [uploading, setUploading] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await fetch('/api/students', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
      setStudents(prev => prev.filter(s => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
      window.location.reload();
    } finally {
      setBulkDeleting(false);
    }
  };

  const [tgSendingProfile, setTgSendingProfile] = useState(false);
  const handleSendProfileTelegram = async (student: Student) => {
    setTgSendingProfile(true);
    try {
      const caption = `--- &gt;<b>បញ្ជីឈ្មោះសិស្សសរុប</b>&lt; ---\n` +
        `<b>នៃសាលាពុទ្ធិកអនុវិទ្យាល័យ សម្ដេចព្រះសង្ឃរាជ ទេព វង្ស និរោធរង្សី</b>\n\n` +
        `<b>ឈ្មោះ៖</b> ${student.name}\n` +
        `<b>លេខកូដ៖</b> ${student.studentCode}\n` +
        `<b>ភេទ៖</b> ${student.gender === 'M' ? 'ប្រុស' : student.gender === 'F' ? 'ស្រី' : '—'}\n` +
        `<b>ថ្ងៃខែឆ្នាំកំណើត៖</b> ${student.dateOfBirth || '—'}\n` +
        `<b>លេខទូរស័ព្ទ៖</b> ${student.phone || '—'}\n\n` +
        `<b>ទីតាំងស្នាក់នៅ៖</b> វត្ត${student.wat || '—'} កុដិ${student.kuti || '—'}\n` +
        `<b>ការសិក្សា៖</b> ${student.educationLevel || '—'} ថ្នាក់ទី ${student.grade || '—'}`;

      const fd = new FormData();
      fd.append('caption', caption);
      
      try {
        const res = await fetch(`/api/students/${student.id}/photo`);
        if (res.ok) {
          const blob = await res.blob();
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

  // View mode — persisted in localStorage
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  useEffect(() => {
    const saved = localStorage.getItem('studentViewMode') as 'table' | 'card' | null;
    if (saved === 'card' || saved === 'table') setViewMode(saved);
  }, []);
  const switchViewMode = (mode: 'table' | 'card') => {
    setViewMode(mode);
    localStorage.setItem('studentViewMode', mode);
  };

  // Export modal state
  const [exportModal, setExportModal] = useState(false);

  // View modal state
  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  // Dropdown data state
  const [pagodas, setPagodas] = useState<any[]>([]);
  const [kutis, setKutis] = useState<any[]>([]);
  const [headMonks, setHeadMonks] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [educationLevels, setEducationLevels] = useState<any[]>([]);

  // Academic Hierarchy Add Modal State
  const [levelGradeModal, setLevelGradeModal] = useState(false);
  const [levelGradeForm, setLevelGradeForm] = useState<{ levelName: string, grades: string[] }>({ levelName: '', grades: [''] });
  const [levelGradeSubmitting, setLevelGradeSubmitting] = useState(false);

  // Manage Hierarchy Modal State
  const [manageHierarchyModal, setManageHierarchyModal] = useState(false);
  const [manageForm, setManageForm] = useState<{ levelId: string, levelName: string, grades: { id: string, name: string }[] }>({ levelId: '', levelName: '', grades: [] });
  const [manageSubmitting, setManageSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/pagodas').then(res => res.json()).then(setPagodas).catch(console.error);
    fetch('/api/kutis').then(res => res.json()).then(setKutis).catch(console.error);
    fetch('/api/head-monks').then(res => res.json()).then(setHeadMonks).catch(console.error);
    fetch('/api/academic-hierarchy').then(res => res.json()).then(data => {
      setAcademicYears(data.academicYears || []);
      setEducationLevels(data.educationLevels || []);
    }).catch(console.error);
    fetch('/api/courses').then(res => res.json()).then(setCourses).catch(console.error);
  }, []);

  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return students.filter(s => {
      if (q && !s.name.toLowerCase().includes(q) && !s.studentCode.toLowerCase().includes(q) && !(s.phone && s.phone.includes(q))) return false;
      if (pagodaFilter && s.wat !== pagodaFilter) return false;
      if (courseFilter && !s.enrollments.some(e => e.courseId === courseFilter)) return false;
      return true;
    });
  }, [students, search, pagodaFilter, courseFilter]);

  // Reset to page 1 whenever the filtered list changes
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allPageSelected = paginated.length > 0 && paginated.every(s => selectedIds.has(s.id));
  const somePageSelected = paginated.some(s => selectedIds.has(s.id));
  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => { const n = new Set(prev); paginated.forEach(s => n.delete(s.id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); paginated.forEach(s => n.add(s.id)); return n; });
    }
  };

  const sortedEducationLevels = useMemo(() => {
    const sortOrder = ['បឋមសិក្សា', 'អនុវិទ្យាល័យ', 'វិទ្យាល័យ', 'មហាវិទ្យាល័យ'];
    return [...educationLevels].sort((a, b) => {
      const idxA = sortOrder.indexOf(a.name);
      const idxB = sortOrder.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [educationLevels]);

  // ── Add handlers ──
  const openAdd = () => {
    setAddForm(EMPTY_ADD);
    setAddError('');
    setAddModal(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSubmitting(true);
    setAddError('');
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? 'មានបញ្ហាកើតឡើង'); return; }
      setStudents(prev => [{ ...data, _count: { enrollments: 0 } }, ...prev]);
      setAddModal(false);
      window.location.reload();
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        setEditForm(prev => ({ ...prev, photoUrl: data.url }));
      } else {
        alert(data.error || 'បរាជ័យក្នុងការបញ្ចូលរូបភាព');
      }
    } catch (err) {
      alert('មានបញ្ហាក្នុងការបញ្ចូលរូបភាព');
    } finally {
      setUploading(false);
    }
  };

  const handleLevelGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLevelGradeSubmitting(true);
    try {
      const res = await fetch('/api/academic-hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_LEVEL_GRADE', ...levelGradeForm }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'បរាជ័យ'); return; }
      setEducationLevels(data);
      setLevelGradeModal(false);
      // optionally set editForm to these new values
      setEditForm(prev => ({
        ...prev,
        educationLevel: levelGradeForm.levelName,
        grade: levelGradeForm.grades.length > 0 ? levelGradeForm.grades[0] : ''
      }));
      setLevelGradeForm({ levelName: '', grades: [''] });
    } catch (err) {
      console.error(err);
    } finally {
      setLevelGradeSubmitting(false);
    }
  };

  const handleAcademicYearCreate = async (inputValue: string) => {
    try {
      const res = await fetch('/api/academic-hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_ACADEMIC_YEAR', name: inputValue }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'បរាជ័យ'); return; }
      setAcademicYears(prev => [...prev, data]);
      setEditForm(prev => ({ ...prev, academicYear: data.name }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleManageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManageSubmitting(true);
    try {
      const res = await fetch('/api/academic-hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_LEVEL_GRADE', ...manageForm }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'បរាជ័យ'); return; }
      setEducationLevels(data);
      setManageHierarchyModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setManageSubmitting(false);
    }
  };

  const handleLevelDelete = async (levelId: string) => {
    if (!confirm('តើអ្នកពិតជាចង់លុបកម្រិតសិក្សានេះមែនទេ? ទិន្នន័យថ្នាក់ទីទាំងអស់នៅក្នុងនេះនឹងត្រូវលុបចោល។')) return;
    try {
      const res = await fetch('/api/academic-hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_LEVEL', levelId }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'បរាជ័យ'); return; }
      setEducationLevels(data);
      setManageHierarchyModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Full edit handlers ──
  const openEdit = (s: Student) => {
    setEditForm({
      name: s.name,
      nameEn: s.nameEn ?? '',
      phone: s.phone ?? '',
      photoUrl: undefined,
      gender: s.gender ?? '',
      dateOfBirth: s.dateOfBirth ?? '',
      nationality: s.nationality ?? '',
      wat: s.wat ?? '',
      kuti: s.kuti ?? '',
      kutiFloor: s.kutiFloor ?? '',
      kutiHead: s.kutiHead ?? '',
      kutiNumber: s.kutiNumber ?? '',
      parentName: s.parentName ?? '',
      parentPhone: s.parentPhone ?? '',
      academicYear: s.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      educationLevel: s.educationLevel ?? '',
      grade: s.grade ?? '',
      notes: s.notes ?? '',
    });
    setEditingId(s.id);
    setEditingCode(s.studentCode);
    setEditError('');
    setActiveTab('basic');
    setEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSubmitting(true);
    setEditError('');
    try {
      const res = await fetch(`/api/students/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error ?? 'មានបញ្ហាកើតឡើង'); return; }
      setStudents(prev => prev.map(s => s.id === editingId ? { ...s, ...data } : s));
      setEditModal(false);
      window.location.reload();
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Delete handler ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/students/${deleteTarget}`, { method: 'DELETE' });
      setStudents(prev => prev.filter(s => s.id !== deleteTarget));
      window.location.reload();
    } finally {
      setDeleteTarget(null);
      setDeleting(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('km-KH', { year: 'numeric', month: 'short', day: 'numeric' });

  const f = (v: typeof editForm, k: keyof typeof editForm, val: string) =>
    ({ ...v, [k]: val });

  return (
    <>
      <div className="animate-fade-in">

        {/* ── Page Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <h2>បញ្ជីសិស្ស</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
              សិស្សសរុប:{' '}
              <strong style={{ color: 'var(--color-accent)' }}>{students.length}</strong> នាក់
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/dashboard/students/cards" className={styles.exportBtnOutline} style={{ textDecoration: 'none' }}>
              🪪 កាតសិស្ស
            </Link>
            <button className={styles.exportBtnOutline} onClick={() => setExportModal(true)}>
              📤 នាំចេញ
            </button>
            {canIns && (
              <button className="btn-primary" onClick={openAdd}>+ ចុះឈ្មោះសិស្ស</button>
            )}
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconBlue}`}>🎓</div>
            <div>
              <div className={styles.statLabel}>សិស្សសរុប</div>
              <div className={styles.statValue}>{students.length}</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconGreen}`}>🏛️</div>
            <div>
              <div className={styles.statLabel}>វត្តសរុប</div>
              <div className={styles.statValue}>
                {new Set(students.map(s => s.wat).filter(Boolean)).size}
              </div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconOrange}`}>📚</div>
            <div>
              <div className={styles.statLabel}>វគ្គសរុប</div>
              <div className={styles.statValue}>
                {students.reduce((sum, s) => sum + s._count.enrollments, 0)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Search + Filters ── */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>⌕</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="ស្វែងរកតាមឈ្មោះ, លេខកូដ, ឬលេខទូរស័ព្ទ..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Pagoda filter */}
          <select
            className={styles.filterSelect}
            value={pagodaFilter}
            onChange={e => { setPagodaFilter(e.target.value); setPage(1); }}
          >
            <option value="">🏛️ វត្តទាំងអស់</option>
            {Array.from(new Set(students.map(s => s.wat).filter(Boolean))).sort().map(w => (
              <option key={w} value={w!}>{w}</option>
            ))}
          </select>

          {/* Course filter */}
          <select
            className={styles.filterSelect}
            value={courseFilter}
            onChange={e => { setCourseFilter(e.target.value); setPage(1); }}
          >
            <option value="">📚 វគ្គទាំងអស់</option>
            {(courses ?? []).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {(pagodaFilter || courseFilter || search) && (
            <button
              className={styles.clearFilterBtn}
              onClick={() => { setPagodaFilter(''); setCourseFilter(''); setSearch(''); setPage(1); }}
              title="លុបការច្នៃ"
            >
              ✕ លុបការច្រោះ
            </button>
          )}

          {(search || pagodaFilter || courseFilter) && (
            <span className={styles.resultCount}>
              {filtered.length} / {students.length} នាក់
            </span>
          )}

          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === 'table' ? styles.viewToggleActive : ''}`}
              onClick={() => switchViewMode('table')}
              disabled={!!viewStudent}
              title="មើលជាតារាង"
            >
              ☰
            </button>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === 'card' ? styles.viewToggleActive : ''}`}
              onClick={() => switchViewMode('card')}
              disabled={!!viewStudent}
              title="មើលជាកាត"
            >
              ⊞
            </button>
          </div>
        </div>

        {/* ── Table / Card view ── */}
        {paginated.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <p>{search ? 'រកមិនឃើញសិស្សដែលត្រូវនឹងការស្វែងរក' : 'មិនទាន់មានសិស្សណាមួយទេ'}</p>
            {canIns && !search && (
              <button className="btn-primary" onClick={openAdd} style={{ marginTop: 20 }}>ចុះឈ្មោះសិស្សដំបូង</button>
            )}
          </div>
        ) : viewMode === 'card' ? (
          <div className={styles.cardGrid}>
            {paginated.map((student, i) => (
              <div key={student.id} className={`${styles.studentCard} ${selectedIds.has(student.id) ? styles.cardSelected : ''}`}>
                <div className={`${styles.cardHeader} ${isComplete(student) ? styles.cardHeaderComplete : styles.cardHeaderIncomplete}`}>
                  <div className={styles.cardIndexBadge}>{(safePage - 1) * PAGE_SIZE + i + 1}</div>
                  {canDel && (
                    <input
                      type="checkbox"
                      className={styles.cardCheckbox}
                      checked={selectedIds.has(student.id)}
                      onChange={() => toggleSelect(student.id)}
                    />
                  )}
                  <div className={styles.cardAvatarWrap}>
                    <Avatar id={student.id} name={student.name} imgClass={styles.cardAvatar} fallbackClass={styles.cardAvatarFallback} />
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardName}>{student.name}</div>
                  <span className={styles.codeBadge} style={{ marginBottom: 12 }}>{student.studentCode}</span>
                  <div className={styles.cardInfoGrid}>
                    <div className={styles.cardInfoItem}><span className={styles.cardInfoIcon}>👤</span><span>{student.gender === 'M' ? 'ប្រុស' : student.gender === 'F' ? 'ស្រី' : '—'}</span></div>
                    <div className={styles.cardInfoItem}><span className={styles.cardInfoIcon}>📱</span><span>{student.phone ?? '—'}</span></div>
                    <div className={styles.cardInfoItem}><span className={styles.cardInfoIcon}>🏛️</span><span>{student.wat ?? '—'}</span></div>
                    <div className={styles.cardInfoItem}><span className={styles.cardInfoIcon}>🏠</span><span>{student.kuti ?? '—'}</span></div>
                    <div className={styles.cardInfoItem}><span className={styles.cardInfoIcon}>📚</span><span>{student.educationLevel ?? '—'}</span></div>
                    <div className={styles.cardInfoItem}><span className={styles.cardInfoIcon}>🎓</span><span>{student.grade ?? '—'}</span></div>
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isComplete(student) ? <span className={styles.completeBadge}>✓ ពេញ</span> : <span className={styles.incompleteBadge}>មិនពេញ</span>}
                    <span className={styles.enrollBadge}>{student._count.enrollments} វគ្គ</span>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={`${styles.actionBtn} ${styles.viewBtn}`} onClick={() => setViewStudent(student)} title="មើល">👁️</button>
                    {canWri && <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => openEdit(student)} title="កែ">✏️</button>}
                    {canDel && <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => setDeleteTarget(student.id)} title="លុប">🗑️</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
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
                  <th>ឈ្មោះសិស្ស</th>
                  <th>ភេទ</th>
                  <th>លេខទូរស័ព្ទ</th>
                  <th>វត្ត</th>
                  <th>កុដិ</th>
                  <th>វគ្គ</th>
                  <th>ស្ថានភាព</th>
                  <th>កាលបរិច្ឆេទ</th>
                  <th></th>
                  {(canWri || canDel) && <th>ការគ្រប់គ្រង</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.map((student, i) => (
                  <tr key={student.id} className={`${styles.row} ${selectedIds.has(student.id) ? styles.rowSelected : ''}`}>
                    {canDel && (
                      <td className={styles.checkCell}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={selectedIds.has(student.id)}
                          onChange={() => toggleSelect(student.id)}
                        />
                      </td>
                    )}
                    <td className={styles.indexCell}>{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                    <td><span className={styles.codeBadge}>{student.studentCode}</span></td>
                    <td className={styles.nameCell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar id={student.id} name={student.name} imgClass={styles.avatar} fallbackClass={styles.avatarPlaceholder} />
                        {student.name}
                      </div>
                    </td>
                    <td className={styles.mutedCell}>
                      {student.gender === 'M' ? 'ប្រុស' : student.gender === 'F' ? 'ស្រី' : '—'}
                    </td>
                    <td className={styles.mutedCell}>{student.phone ?? '—'}</td>
                    <td className={styles.mutedCell}>{student.wat ?? '—'}</td>
                    <td className={styles.mutedCell}>{student.kuti ?? '—'}</td>
                    <td>
                      <span className={styles.enrollBadge}>{student._count.enrollments}</span>
                    </td>
                    <td>
                      {isComplete(student) ? (
                        <span className={styles.completeBadge}>✓ ពេញ</span>
                      ) : (
                        <span className={styles.incompleteBadge}>មិនពេញ</span>
                      )}
                    </td>
                    <td className={styles.mutedCell}>{formatDate(student.createdAt)}</td>
                    <td>
                      <button
                        className={`${styles.actionBtn} ${styles.viewBtn}`}
                        onClick={() => setViewStudent(student)}
                        title="មើលព័ត៌មាន"
                      >
                        👁️
                      </button>
                    </td>
                    {(canWri || canDel) && (
                      <td>
                        <div className={styles.actionGroup}>
                          {canWri && <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => openEdit(student)} title="ព័ត៌មានពេញ">✏️</button>}
                          {canDel && <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => setDeleteTarget(student.id)} title="លុប">🗑️</button>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
              បង្ហាញ {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length} នាក់
            </span>
            <div className={styles.paginationBtns}>
              <button
                className={styles.pageBtn}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 2)
                .reduce<(number | '...')[]>((acc, n, idx, arr) => {
                  if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, idx) =>
                  n === '...' ? (
                    <span key={`ellipsis-${idx}`} className={styles.pageEllipsis}>…</span>
                  ) : (
                    <button
                      key={n}
                      className={`${styles.pageBtn} ${safePage === n ? styles.pageBtnActive : ''}`}
                      onClick={() => setPage(n as number)}
                    >
                      {n}
                    </button>
                  )
                )}
              <button
                className={styles.pageBtn}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
      {/* End animate-fade-in */}

      {/* ══════════════════════════════════
          Add Modal — simple (name + phone)
          ══════════════════════════════════ */}
      {addModal && (
        <div className={styles.modalOverlay} onClick={() => !addSubmitting && setAddModal(false)}>
          <div className={`glass-panel ${styles.modalCard}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>ចុះឈ្មោះសិស្សថ្មី</h3>
              <button className={styles.closeBtn} onClick={() => setAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAdd} className={styles.form}>
              {addError && <div className={styles.formError}>{addError}</div>}

              <div className={styles.formGroup}>
                <label>លេខសម្គាល់សិស្ស</label>
                <div className={styles.autoIdBox}>
                  {/* <span className={styles.autoIdIcon}></span> */}
                  <span className={styles.autoIdText}>បង្កើតដោយស្វ័យប្រវត្តិ (STU-YYYYMMDD-NNN)</span>
                  <span className={styles.autoIdBadge}>AUTO</span>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>ឈ្មោះពេញ *</label>
                <input
                  type="text"
                  placeholder="ឈ្មោះ និងនាមត្រកូល (ខ្មែរ)"
                  value={addForm.name}
                  onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                  className={styles.input}
                  required
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label>ឈ្មោះឡាតាំង</label>
                <input
                  type="text"
                  placeholder="ឈ្មោះជាអក្សរអង់គ្លេស"
                  value={addForm.nameEn}
                  onChange={e => setAddForm(p => ({ ...p, nameEn: e.target.value }))}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>លេខទូរស័ព្ទ</label>
                <input
                  type="tel"
                  placeholder="ឧ. 012 345 678"
                  value={addForm.phone}
                  onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))}
                  className={styles.input}
                />
              </div>

              <div className={styles.addHint}>
                💡 អ្នកអាចបំពេញព័ត៌មានពេញបន្ទាប់ពីចុះឈ្មោះ
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn}
                  onClick={() => setAddModal(false)} disabled={addSubmitting}>
                  បោះបង់
                </button>
                <button type="submit" className="btn-primary" disabled={addSubmitting}>
                  {addSubmitting ? 'កំពុងរក្សាទុក...' : 'ចុះឈ្មោះ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          Full Info Modal — tabbed edit form
          ══════════════════════════════════════ */}
      {editModal && (
        <div className={styles.modalOverlay} onClick={() => !editSubmitting && setEditModal(false)}>
          <div className={`glass-panel ${styles.fullModal}`} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className={styles.fullModalHeader}>
              <div>
                <h3>ព័ត៌មានពេញ</h3>
                <span className={styles.fullModalCode}>{editingCode}</span>
              </div>
              <button className={styles.closeBtn} onClick={() => setEditModal(false)}>✕</button>
            </div>

            {/* Tab bar */}
            <div className={styles.tabBar}>
              {([
                { key: 'basic', label: 'ព័ត៌មានទូទៅ' },
                { key: 'residence', label: 'ស្នាក់នៅ' },
                { key: 'bio', label: 'ប្រវត្តិសង្ខេប' },
              ] as { key: Tab; label: string }[]).map(t => (
                <button
                  key={t.key}
                  type="button"
                  className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleEdit} className={styles.form}>
              {editError && <div className={styles.formError}>{editError}</div>}

              {/* ── Tab: ព័ត៌មានទូទៅ ── */}
              {activeTab === 'basic' && (
                <div className={styles.tabPanel}>
                  <div className={styles.formGroup} style={{ alignSelf: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      {editForm.photoUrl !== undefined ? (
                        editForm.photoUrl ? (
                          <img src={editForm.photoUrl} alt="Student" className={styles.avatarLarge} />
                        ) : (
                          <div className={styles.avatarLargePlaceholder}>រូប</div>
                        )
                      ) : (
                        <Avatar id={editingId!} name={editForm.name} imgClass={styles.avatarLarge} fallbackClass={styles.avatarLargePlaceholder} />
                      )}
                      <div>
                        <input type="file" accept="image/*" id="photo-upload" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
                        <label htmlFor="photo-upload" className="btn-primary" style={{ cursor: 'pointer', display: 'inline-block', fontSize: '0.8rem', padding: '6px 14px' }}>
                          {uploading ? 'កំពុងបញ្ចូល...' : 'ប្តូររូបភាព'}
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>លេខសម្គាល់</label>
                    <div className={styles.autoIdBox}>
                      <span className={styles.autoIdIcon}>🔖</span>
                      <span className={styles.autoIdText}>{editingCode}</span>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>ឈ្មោះពេញ *</label>
                      <input type="text" className={styles.input} required autoFocus
                        placeholder="ឈ្មោះ និងនាមត្រកូល (ខ្មែរ)"
                        value={editForm.name}
                        onChange={e => setEditForm(v => f(v, 'name', e.target.value))}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>ឈ្មោះឡាតាំង</label>
                      <input type="text" className={styles.input}
                        placeholder="ឈ្មោះជាអក្សរអង់គ្លេស"
                        value={editForm.nameEn}
                        onChange={e => setEditForm(v => f(v, 'nameEn', e.target.value))}
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>លេខទូរស័ព្ទ</label>
                      <input type="tel" className={styles.input}
                        placeholder="012 345 678"
                        value={editForm.phone}
                        onChange={e => setEditForm(v => f(v, 'phone', e.target.value))}
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>ភេទ</label>
                      <select className={styles.input}
                        value={editForm.gender}
                        onChange={e => setEditForm(v => f(v, 'gender', e.target.value))}
                      >

                        <option value="">-- ជ្រើសរើស --</option>
                        <option value="M"> ប្រុស</option>
                        <option value="F"> ស្រី</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>ថ្ងៃខែឆ្នាំកំណើត</label>
                      <input type="date" className={styles.input}
                        value={editForm.dateOfBirth}
                        onChange={e => setEditForm(v => f(v, 'dateOfBirth', e.target.value))}
                      />
                    </div>
                  </div>


                </div>
              )}

              {/* ── Tab: ស្នាក់នៅ ── */}
              {activeTab === 'residence' && (
                <div className={styles.tabPanel}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>វត្ត</label>
                      <CreatableSelect
                        styles={selectStyles}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        menuPosition="fixed"
                        placeholder="-- ជ្រើសរើស ឬវាយបញ្ចូល --"
                        options={pagodas.map(p => ({ value: p.name, label: p.name }))}
                        value={editForm.wat ? { value: editForm.wat, label: editForm.wat } : null}
                        onChange={(opt: any) => setEditForm(v => f(v, 'wat', opt?.value || ''))}
                        isClearable
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>កុដិ</label>
                      <CreatableSelect
                        styles={selectStyles}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        menuPosition="fixed"
                        placeholder="-- ជ្រើសរើស ឬវាយបញ្ចូល --"
                        options={(editForm.wat ? kutis.filter(k => k.pagodaId === pagodas.find(p => p.name === editForm.wat)?.id) : []).map(k => ({ value: k.name, label: k.name }))}
                        value={editForm.kuti ? { value: editForm.kuti, label: editForm.kuti } : null}
                        onChange={(opt: any) => {
                          const val = opt?.value || '';
                          setEditForm(v => {
                            let next = f(v, 'kuti', val);
                            if (val && next.wat) {
                              const pId = pagodas.find(p => p.name === next.wat)?.id;
                              const sk = kutis.find(k => k.pagodaId === pId && k.name === val);
                              if (sk?.head) next = f(next, 'kutiHead', sk.head.name);
                              else next = f(next, 'kutiHead', '');
                            } else {
                              next = f(next, 'kutiHead', '');
                            }
                            return next;
                          });
                        }}
                        isDisabled={!editForm.wat}
                        isClearable
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>មេកុដិឈ្មោះ</label>
                    <CreatableSelect
                      styles={selectStyles}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      menuPosition="fixed"
                      placeholder="-- ជ្រើសរើស ឬវាយបញ្ចូល --"
                      options={(editForm.wat && editForm.kuti ? [kutis.find(k => k.pagodaId === pagodas.find(p => p.name === editForm.wat)?.id && k.name === editForm.kuti)?.head].filter(Boolean) : []).map((m: any) => ({ value: m.name, label: m.name }))}
                      value={editForm.kutiHead ? { value: editForm.kutiHead, label: editForm.kutiHead } : null}
                      onChange={(opt: any) => setEditForm(v => f(v, 'kutiHead', opt?.value || ''))}
                      isDisabled={!editForm.kuti}
                      isClearable
                    />
                  </div>


                </div>
              )}

              {/* ── Tab: ប្រវត្តិសង្ខេប ── */}
              {activeTab === 'bio' && (
                <div className={styles.tabPanel}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>ឆ្នាំសិក្សា</label>
                      <input type="text" className={styles.input}
                        value={editForm.academicYear}
                        disabled
                        style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', cursor: 'not-allowed', opacity: 0.8 }}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>កម្រិតសិក្សា</span>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button type="button" onClick={() => {
                            if (editForm.educationLevel) {
                              const level = sortedEducationLevels.find(l => l.name === editForm.educationLevel);
                              if (level) {
                                setManageForm({ levelId: level.id, levelName: level.name, grades: level.grades.map((g: any) => ({ id: g.id, name: g.name })) });
                              } else {
                                setManageForm({ levelId: '', levelName: '', grades: [] });
                              }
                            } else {
                              setManageForm({ levelId: '', levelName: '', grades: [] });
                            }
                            setManageHierarchyModal(true);
                          }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0 }} title="កែប្រែទិន្នន័យនេះ">
                            ✏️
                          </button>
                          <button type="button" onClick={() => setLevelGradeModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '1.2rem', padding: 0 }} title="បន្ថែមថ្មី">
                            ⊕
                          </button>
                        </div>
                      </label>
                      <Select
                        styles={selectStyles}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        menuPosition="fixed"
                        placeholder="-- ជ្រើសរើស --"
                        options={sortedEducationLevels.map((l: any) => ({ value: l.name, label: l.name }))}
                        value={editForm.educationLevel ? { value: editForm.educationLevel, label: editForm.educationLevel } : null}
                        onChange={(opt: any) => {
                          setEditForm(v => {
                            let next = f(v, 'educationLevel', opt?.value || '');
                            // Reset grade when level changes
                            return f(next, 'grade', '');
                          });
                        }}
                        isClearable
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>ថ្នាក់ទី</label>
                      <Select
                        styles={selectStyles}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        menuPosition="fixed"
                        placeholder="-- ជ្រើសរើស --"
                        options={
                          (sortedEducationLevels.find((l: any) => l.name === editForm.educationLevel)?.grades || [])
                            .map((g: any) => ({ value: g.name, label: g.name }))
                        }
                        value={editForm.grade ? { value: editForm.grade, label: editForm.grade } : null}
                        onChange={(opt: any) => setEditForm(v => f(v, 'grade', opt?.value || ''))}
                        isDisabled={!editForm.educationLevel}
                        isClearable
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* Tab navigation + Save */}
              <div className={styles.tabFormFooter}>
                <div className={styles.tabNav}>
                  {activeTab !== 'basic' && (
                    <button type="button" className={styles.cancelBtn}
                      onClick={() => setActiveTab(activeTab === 'bio' ? 'residence' : 'basic')}>
                      ← មុន
                    </button>
                  )}
                  {activeTab !== 'bio' && (
                    <button type="button" className={styles.nextBtn}
                      onClick={() => setActiveTab(activeTab === 'basic' ? 'residence' : 'bio')}>
                      បន្ទាប់ →
                    </button>
                  )}
                </div>
                <div className={styles.formActions} style={{ marginTop: 0 }}>
                  <button type="button" className={styles.cancelBtn}
                    onClick={() => setEditModal(false)} disabled={editSubmitting}>
                    បោះបង់
                  </button>
                  <button type="submit" className="btn-primary" disabled={editSubmitting}>
                    {editSubmitting ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Level & Grade Modal ── */}
      {levelGradeModal && (
        <div className={styles.modalOverlay} onClick={() => !levelGradeSubmitting && setLevelGradeModal(false)}>
          <div className={`glass-panel ${styles.modalCard}`} style={{ maxWidth: 420, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)', padding: '24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ fontSize: '1.8rem', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.25)', borderRadius: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>🎓</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#fff', letterSpacing: '0.3px' }}>កម្រិតសិក្សា & ថ្នាក់ទី</h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, marginTop: 4 }}>បន្ថែមទិន្នន័យថ្មីចូលក្នុងប្រព័ន្ធ</p>
                </div>
              </div>
              <button onClick={() => setLevelGradeModal(false)} disabled={levelGradeSubmitting} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.8rem', cursor: 'pointer', opacity: 0.8, padding: 0, marginTop: '-20px' }}>&times;</button>
            </div>

            <form onSubmit={handleLevelGradeSubmit} style={{ padding: '24px' }}>
              <div className={styles.formGroup} style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: 500 }}>កម្រិតសិក្សា <span style={{ color: '#ef4444' }}>*</span></label>
                <input required autoFocus className={styles.input}
                  placeholder="ឧ. បឋមសិក្សា"
                  style={{ padding: '12px 16px', fontSize: '1rem', borderRadius: '10px', color: '#1e293b', background: '#f8fafc', border: '1px solid #cbd5e1' }}
                  value={levelGradeForm.levelName}
                  onChange={e => setLevelGradeForm(prev => ({ ...prev, levelName: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup} style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                  ថ្នាក់ទី <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>(អាចបន្ថែមបានច្រើន)</span>
                </label>

                {levelGradeForm.grades.map((g, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input className={styles.input}
                      placeholder={idx === 0 ? "ឧ. ថ្នាក់ទី១" : "ថ្នាក់ទីបន្ទាប់..."}
                      style={{ padding: '12px 16px', fontSize: '1rem', borderRadius: '10px', flex: 1, color: '#1e293b', background: '#f8fafc', border: '1px solid #cbd5e1' }}
                      value={g}
                      onChange={e => {
                        const newGrades = [...levelGradeForm.grades];
                        newGrades[idx] = e.target.value;
                        setLevelGradeForm(prev => ({ ...prev, grades: newGrades }));
                      }}
                    />
                    {levelGradeForm.grades.length > 1 && (
                      <button type="button" onClick={() => {
                        const newGrades = levelGradeForm.grades.filter((_, i) => i !== idx);
                        setLevelGradeForm(prev => ({ ...prev, grades: newGrades }));
                      }} style={{ background: 'rgba(239, 68, 68, 0.85)', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '0 16px', cursor: 'pointer', fontSize: '1.4rem' }}>&times;</button>
                    )}
                  </div>
                ))}

                <button type="button" onClick={() => setLevelGradeForm(prev => ({ ...prev, grades: [...prev.grades, ''] }))} style={{ background: 'var(--color-primary)', border: 'none', color: '#000000', width: '100%', padding: '10px', borderRadius: '10px', cursor: 'pointer', marginTop: '4px', fontSize: '0.95rem', fontWeight: 600, boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)' }}>
                  + បន្ថែមថ្នាក់ទី
                </button>
              </div>
              <div className={styles.formActions} style={{ margin: 0 }}>
                <button type="button" className={styles.cancelBtn} style={{ padding: '10px 20px', fontSize: '0.95rem', borderRadius: '10px' }}
                  onClick={() => setLevelGradeModal(false)} disabled={levelGradeSubmitting}>
                  បោះបង់
                </button>
                <button type="submit" className="btn-primary" disabled={levelGradeSubmitting} style={{ padding: '10px 24px', fontSize: '0.95rem', background: 'blue', border: 'none', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)', borderRadius: '10px', color: '#ffffff' }}>
                  {levelGradeSubmitting ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកទិន្នន័យ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Manage Hierarchy Modal ── */}
      {manageHierarchyModal && (
        <div className={styles.modalOverlay} onClick={() => !manageSubmitting && setManageHierarchyModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: '24px', padding: 0, overflow: 'hidden', maxWidth: '500px' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)', padding: '24px', color: '#fff', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ fontSize: '1.8rem', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.25)', borderRadius: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>✏️</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#fff', letterSpacing: '0.3px' }}>កែប្រែកម្រិតសិក្សា & ថ្នាក់ទី</h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, marginTop: 4 }}>កែប្រែ ឬលុបទិន្នន័យដែលមានស្រាប់</p>
                </div>
              </div>
              <button onClick={() => setManageHierarchyModal(false)} disabled={manageSubmitting} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.8rem', cursor: 'pointer', opacity: 0.8, padding: 0, position: 'absolute', top: 24, right: 24 }}>&times;</button>
            </div>

            <div style={{ padding: '24px' }}>
              <div className={styles.formGroup} style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: 500 }}>ជ្រើសរើសកម្រិតសិក្សាដែលចង់កែ</label>
                <Select
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
                  placeholder="-- ជ្រើសរើស --"
                  options={sortedEducationLevels.map((l: any) => ({ value: l.id, label: l.name, data: l }))}
                  value={manageForm.levelId ? { value: manageForm.levelId, label: sortedEducationLevels.find(l => l.id === manageForm.levelId)?.name } : null}
                  onChange={(opt: any) => {
                    if (opt?.data) {
                      setManageForm({ levelId: opt.data.id, levelName: opt.data.name, grades: opt.data.grades.map((g: any) => ({ id: g.id, name: g.name })) });
                    } else {
                      setManageForm({ levelId: '', levelName: '', grades: [] });
                    }
                  }}
                  isClearable
                />
              </div>

              {manageForm.levelId && (
                <form onSubmit={handleManageSubmit}>
                  <div className={styles.formGroup} style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: 500 }}>ប្ដូរឈ្មោះកម្រិតសិក្សា <span style={{ color: '#ef4444' }}>*</span></label>
                    <input required className={styles.input}
                      style={{ padding: '12px 16px', fontSize: '1rem', borderRadius: '10px', color: '#1e293b', background: '#f8fafc', border: '1px solid #cbd5e1' }}
                      value={manageForm.levelName}
                      onChange={e => setManageForm(prev => ({ ...prev, levelName: e.target.value }))}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ marginBottom: '24px' }}>
                    <label style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                      ថ្នាក់ទី
                    </label>

                    {manageForm.grades.map((g, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>

                        <input className={styles.input}
                          style={{ padding: '12px 16px', fontSize: '1rem', borderRadius: '10px', flex: 1, color: '#1e293b', background: '#f8fafc', border: '1px solid #cbd5e1' }}
                          value={g.name}
                          onChange={e => {
                            const newGrades = [...manageForm.grades];
                            newGrades[idx].name = e.target.value;
                            setManageForm(prev => ({ ...prev, grades: newGrades }));
                          }}
                        />
                        <button type="button" onClick={() => {
                          const newGrades = manageForm.grades.filter((_, i) => i !== idx);
                          setManageForm(prev => ({ ...prev, grades: newGrades }));
                        }} style={{ background: 'rgba(239, 68, 68, 0.85)', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '0 16px', cursor: 'pointer', fontSize: '1.4rem' }}>&times;</button>
                      </div>
                    ))}

                    <button type="button" onClick={() => setManageForm(prev => ({ ...prev, grades: [...prev.grades, { id: '', name: '' }] }))} style={{ background: 'var(--color-primary)', border: 'none', color: '#000000', width: '100%', padding: '10px', borderRadius: '10px', cursor: 'pointer', marginTop: '4px', fontSize: '0.95rem', fontWeight: 600, boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)' }}>
                      + បន្ថែមថ្នាក់ទីថ្មី
                    </button>
                  </div>

                  <div className={styles.formActions} style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <button type="button" onClick={() => handleLevelDelete(manageForm.levelId)} style={{ padding: '10px 16px', fontSize: '0.95rem', borderRadius: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                      លុបកម្រិតសិក្សានេះចោល
                    </button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className={styles.cancelBtn} style={{ padding: '10px 20px', fontSize: '0.95rem', borderRadius: '10px' }}
                        onClick={() => setManageHierarchyModal(false)} disabled={manageSubmitting}>
                        បោះបង់
                      </button>
                      <button type="submit" className="btn-primary" disabled={manageSubmitting} style={{ padding: '10px 24px', fontSize: '0.95rem', background: 'blue', border: 'none', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)', borderRadius: '10px', color: '#ffffff' }}>
                        {manageSubmitting ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {viewStudent && (
        <div className={styles.modalOverlay}>
          <div className={styles.profileCard}>

            {/* ── Gradient hero ── */}
            <div className={`${styles.profileHero} ${isComplete(viewStudent) ? styles.profileHeroComplete : styles.profileHeroIncomplete}`}>
              <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
                <button 
                  onClick={() => handleSendProfileTelegram(viewStudent)}
                  disabled={tgSendingProfile}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
                >
                  ✈️ {tgSendingProfile ? 'កំពុងផ្ញើ...' : 'Telegram'}
                </button>
                <button className={styles.profileClose} style={{ position: 'static' }} onClick={() => setViewStudent(null)}>✕</button>
              </div>
              <div className={styles.profileAvatarRing}>
                <Avatar id={viewStudent.id} name={viewStudent.name} imgClass={styles.profileAvatar} fallbackClass={styles.profileAvatarFallback} />
              </div>
              <div className={styles.profileName}>{viewStudent.name}</div>
              <span className={styles.profileCode}>{viewStudent.studentCode}</span>
              <div className={styles.profileBadgeRow}>
                {isComplete(viewStudent)
                  ? <span className={styles.profileBadgeSuccess}>✓ ព័ត៌មានពេញ</span>
                  : <span className={styles.profileBadgeWarn}>⚠ មិនទាន់ពេញ</span>}
                <span className={styles.profileBadgeNeutral}>📚 {viewStudent._count.enrollments} វគ្គ</span>
              </div>
            </div>

            {/* ── Info sections ── */}
            <div className={styles.profileBody}>

              {/* Personal */}
              <div className={styles.profileSection}>
                <div className={styles.profileSectionTitle}>👤 ព័ត៌មានផ្ទាល់ខ្លួន</div>
                <div className={styles.profileRow}>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>ភេទ</span>
                    <span className={styles.profileItemValue}>
                      {viewStudent.gender === 'M' ? '♂ ប្រុស' : viewStudent.gender === 'F' ? '♀ ស្រី' : '—'}
                    </span>
                  </div>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>ថ្ងៃខែឆ្នាំកំណើត</span>
                    <span className={styles.profileItemValue}>{viewStudent.dateOfBirth ?? '—'}</span>
                  </div>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>លេខទូរស័ព្ទ</span>
                    <span className={styles.profileItemValue}>{viewStudent.phone ?? '—'}</span>
                  </div>
                </div>
              </div>

              {/* Residence */}
              <div className={styles.profileSection}>
                <div className={styles.profileSectionTitle}>🏛️ ទីតាំងស្នាក់នៅ</div>
                <div className={styles.profileRow}>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>វត្ត</span>
                    <span className={styles.profileItemValue}>{viewStudent.wat ?? '—'}</span>
                  </div>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>កុដិ</span>
                    <span className={styles.profileItemValue}>{viewStudent.kuti ?? '—'}</span>
                  </div>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>មេកុដិ</span>
                    <span className={styles.profileItemValue}>{viewStudent.kutiHead ?? '—'}</span>
                  </div>
                </div>
              </div>

              {/* Academic */}
              <div className={styles.profileSection}>
                <div className={styles.profileSectionTitle}>🎓 ការសិក្សា</div>
                <div className={styles.profileRow}>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>ឆ្នាំសិក្សា</span>
                    <span className={styles.profileItemValue}>{viewStudent.academicYear ?? '—'}</span>
                  </div>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>កម្រិតសិក្សា</span>
                    <span className={styles.profileItemValue}>{viewStudent.educationLevel ?? '—'}</span>
                  </div>
                  <div className={styles.profileItem}>
                    <span className={styles.profileItemLabel}>ថ្នាក់ទី</span>
                    <span className={styles.profileItemValue}>{viewStudent.grade ?? '—'}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewStudent.notes && (
                <div className={styles.profileSection}>
                  <div className={styles.profileSectionTitle}>📝 ចំណាំ</div>
                  <p className={styles.profileNotes}>{viewStudent.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className={styles.profileFooter}>
                <span className={styles.profileFooterDate}>
                  🗓 ចុះឈ្មោះ: {formatDate(viewStudent.createdAt)}
                </span>
                {canWri && (
                  <button
                    className="btn-primary"
                    style={{ fontSize: '0.82rem', padding: '7px 16px' }}
                    onClick={() => { setViewStudent(null); openEdit(viewStudent); }}
                  >
                    ✏️ កែប្រែ
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Export Modal ── */}
      {exportModal && (
        <ExportModal 
          students={selectedIds.size > 0 ? filtered.filter(s => selectedIds.has(s.id)) : filtered} 
          courses={courses || []}
          onClose={() => setExportModal(false)} 
        />
      )}

      {/* ── Bulk Action Bar ── */}
      {canDel && selectedIds.size > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>✓ បានជ្រើសរើស {selectedIds.size} នាក់</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={styles.bulkClearBtn} onClick={() => setExportModal(true)} style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}>
              📤 នាំចេញ
            </button>
            <button className={styles.bulkClearBtn} onClick={() => setSelectedIds(new Set())}>បោះបង់</button>
            <button className={styles.bulkDeleteBtn} onClick={() => setBulkDeleteConfirm(true)}>
              🗑️ លុប {selectedIds.size} នាក់
            </button>
          </div>
        </div>
      )}

      {/* ── Bulk Delete Confirm ── */}
      {bulkDeleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => !bulkDeleting && setBulkDeleteConfirm(false)}>
          <div className={`glass-panel ${styles.confirmCard}`} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#f87171' }}>⚠️ លុបសិស្ស {selectedIds.size} នាក់?</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 14, lineHeight: 1.7, fontSize: '0.92rem' }}>
              តើអ្នកប្រាកដជាចង់លុបសិស្សទាំង <strong style={{ color: 'var(--color-text-primary)' }}>{selectedIds.size} នាក់</strong> នេះ?
              ទិន្នន័យទាំងអស់ (វត្តមាន, ការប្រឡង)
              នឹង<strong style={{ color: 'var(--color-text-primary)' }}> មិនអាចស្ដារវិញបានទេ</strong>។
            </p>
            <div className={styles.formActions} style={{ marginTop: 28 }}>
              <button className={styles.cancelBtn} onClick={() => setBulkDeleteConfirm(false)} disabled={bulkDeleting}>
                បោះបង់
              </button>
              <button className="btn-primary" style={{ background: 'rgba(239,68,68,0.85)' }}
                onClick={handleBulkDelete} disabled={bulkDeleting}>
                {bulkDeleting ? 'កំពុងលុប...' : `លុបចោល ${selectedIds.size} នាក់`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className={styles.modalOverlay}
          onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={`glass-panel ${styles.confirmCard}`}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#f87171' }}>⚠️ លុបសិស្ស?</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 14, lineHeight: 1.7, fontSize: '0.92rem' }}>
              តើអ្នកប្រាកដជាចង់លុបសិស្សនេះ?{' '}
              ទិន្នន័យទាំងអស់ (វត្តមាន, ការប្រឡង) នឹងត្រូវបានលុបចោល
              ហើយ<strong style={{ color: 'var(--color-text-primary)' }}> មិនអាចស្ដារវិញបានទេ</strong>។
            </p>
            <div className={styles.formActions} style={{ marginTop: 28 }}>
              <button className={styles.cancelBtn}
                onClick={() => setDeleteTarget(null)} disabled={deleting}>
                បោះបង់
              </button>
              <button className="btn-primary"
                style={{ background: 'rgba(239, 68, 68, 0.85)' }}
                onClick={handleDelete} disabled={deleting}>
                {deleting ? 'កំពុងលុប...' : 'លុបចោល'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
