'use client';
import { useRef, useState, useMemo, useEffect } from 'react';

import { toKhmerLunarDate } from 'khmer-chhankitek-calendar';

interface Student {
  id: string;
  studentCode: string;
  name: string;
  nameEn: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  photoUrl: string | null;
  enrollments?: { courseId: string; course: { id: string; name: string } }[];
}

interface Props {
  students?: Student[];
}

export default function TestCertificateClient({ students = [] }: Props) {
  const certRef = useRef<HTMLDivElement>(null);
  const [photoError, setPhotoError] = useState(false);

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  
  const [editCourse, setEditCourse] = useState(false);
  const [editSubject, setEditSubject] = useState(false);
  const [editGrade, setEditGrade] = useState(false);
  const [editStart, setEditStart] = useState(false);
  const [editEnd, setEditEnd] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [courseKh, setCourseKh] = useState('កុំព្យូទ័រ');
  const [courseEn, setCourseEn] = useState('Computer');
  const [subjectKh, setSubjectKh] = useState('Typing');
  const [subjectEn, setSubjectEn] = useState('Typing');
  const [gradeKh, setGradeKh] = useState('បង្គួរ');
  const [gradeEn, setGradeEn] = useState('Good');
  const [startKh, setStartKh] = useState('១២-មិថុនា-២០២៦');
  const [startEn, setStartEn] = useState('12-Jun-2026');
  const [endKh, setEndKh] = useState('២៦-មិថុនា-២០២៦');
  const [endEn, setEndEn] = useState('26-Jun-2026');

  // Derive unique courses from students' enrollments
  const courses = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach(s => s.enrollments?.forEach(e => map.set(e.course.id, e.course.name)));
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  // Filter students by selected course
  const courseStudents = useMemo(() => {
    if (!selectedCourseId) return students;
    return students.filter(s => s.enrollments?.some(e => e.courseId === selectedCourseId));
  }, [students, selectedCourseId]);

  const selectedStudents = useMemo(() => {
    return courseStudents.filter(s => selectedStudentIds.includes(s.id));
  }, [selectedStudentIds, courseStudents]);

  // Filter dropdown list by search text
  const filteredCourseStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return courseStudents;
    return courseStudents.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.nameEn || '').toLowerCase().includes(q) ||
      s.studentCode.toLowerCase().includes(q)
    );
  }, [courseStudents, studentSearch]);

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value;
    setSelectedCourseId(courseId);
    setSelectedStudentIds([]); // Reset student selection
    setStudentSearch('');
    setPhotoError(false);
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setCourseKh(course.name);
      setCourseEn(course.name); 
      setEditCourse(false);
      setEditSubject(false);
      setEditGrade(false);
      setEditStart(false);
      setEditEnd(false);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    setPhotoError(false);
  };

  const toggleAllStudents = () => {
    if (selectedStudentIds.length === courseStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(courseStudents.map(s => s.id));
    }
    setPhotoError(false);
  };

  // Generate current date dynamically
  const today = new Date();
  const lunarInfo = toKhmerLunarDate(today);
  const dynamicLunarDate = lunarInfo.lunarDateText.replace('ពុទ្ធសករាជ', 'ព.ស.');
  const dynamicIssuedDate = `រាជធានីភ្នំពេញ, ថ្ងៃទី${lunarInfo.gregorianDayText} ខែ${lunarInfo.gregorianMonthText} ឆ្នាំ${lunarInfo.gregorianYearText}`;

  // Parse Gender
  const getGenderKh = (genderStr: string | null | undefined) => {
    if (!genderStr) return '—';
    const g = genderStr.toLowerCase();
    if (g === 'm' || g === 'male' || g === 'ប្រុស') return 'ប្រុស';
    if (g === 'f' || g === 'female' || g === 'ស្រី') return 'ស្រី';
    return genderStr;
  };
  const getGenderEn = (genderStr: string | null | undefined) => {
    if (!genderStr) return '—';
    const g = genderStr.toLowerCase();
    if (g === 'm' || g === 'male' || g === 'ប្រុស') return 'Male';
    if (g === 'f' || g === 'female' || g === 'ស្រី') return 'Female';
    return genderStr;
  };

  const generateCertificateData = (student: Student | null) => {
    return {
      nameKh: student ? student.name : 'ឈ្មោះសិស្ស',
      nameEn: student?.nameEn ? student.nameEn : 'Student Name',
      genderKh: getGenderKh(student?.gender),
      genderEn: getGenderEn(student?.gender),
      dobKh: student?.dateOfBirth || '—',
      dobEn: student?.dateOfBirth || '—',
      nationalityKh: student?.nationality || 'ខ្មែរ',
      nationalityEn: 'Khmer',
      courseKh, courseEn, subjectKh, subjectEn, gradeKh, gradeEn, startKh, startEn, endKh, endEn,
      studentId: student?.studentCode || '—',
      photoUrl: student?.photoUrl || '/sample-photo.jpg',
      lunarDateKh: dynamicLunarDate,
      issuedDateKh: dynamicIssuedDate
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!certRef.current || selectedStudentIds.length === 0) return;
    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).jsPDF;
      
      const pdf = new jsPDF('l', 'px', [1122, 793]);
      const containers = certRef.current.querySelectorAll('.cert-print-container');
      
      for (let i = 0; i < containers.length; i++) {
        const container = containers[i] as HTMLElement;
        const canvas = await html2canvas(container, { scale: 2, useCORS: true, width: 1122, height: 793 });
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        
        if (i > 0) pdf.addPage([1122, 793], 'l');
        pdf.addImage(imgData, 'JPEG', 0, 0, 1122, 793);
      }
      
      pdf.save(`Certificates_${selectedCourseId ? courses.find(c => c.id === selectedCourseId)?.name : 'Export'}.pdf`);
    } catch (error) {
      console.error("PDF Export failed:", error);
      alert("មានបញ្ហាក្នុងការនាំចេញ PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleTelegramExport = async () => {
    if (!certRef.current || selectedStudentIds.length === 0) return;
    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const containers = certRef.current.querySelectorAll('.cert-print-container');
      
      let successCount = 0;
      for (let i = 0; i < containers.length; i++) {
        const container = containers[i] as HTMLElement;
        const canvas = await html2canvas(container, { scale: 1.5, useCORS: true, width: 1122, height: 793 });
        const photoBase64 = canvas.toDataURL('image/jpeg', 0.85);
        
        const student = selectedStudents[i];
        
        const res = await fetch('/api/telegram/send-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            photoBase64,
            caption: `🎓 វិញ្ញាបនបត្រ: ${student?.name || 'Unknown'}\nវគ្គ: ${courseKh}`
          })
        });
        
        if (res.ok) successCount++;
      }
      
      alert(`បានផ្ញើទៅកាន់ Telegram ចំនួន ${successCount}/${containers.length} សន្លឹកដោយជោគជ័យ!`);
    } catch (error) {
      console.error("Telegram Export failed:", error);
      alert("មានបញ្ហាក្នុងការផ្ញើទៅ Telegram");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="page-root" style={{ padding: '20px', background: '#f1f5f9', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* FORM CONTROLS */}
      <div className="no-print" style={{ width: '100%', maxWidth: '1122px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <div className="form-header">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#000080' }}>ចេញវិញ្ញាបនបត្រទម្រង់ថ្មី</h1>
            <p style={{ margin: 0, color: '#64748b' }}>Select course and students, check boxes to override fields.</p>
          </div>
          <div className="form-actions">
            <button
              onClick={handleTelegramExport}
              disabled={selectedStudentIds.length === 0 || isExporting}
              style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: (selectedStudentIds.length && !isExporting) ? 'pointer' : 'not-allowed', fontWeight: 600 }}
            >
              {isExporting ? 'កំពុងដំណើរការ...' : 'ផ្ញើតាម Telegram'}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={selectedStudentIds.length === 0 || isExporting}
              style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: (selectedStudentIds.length && !isExporting) ? 'pointer' : 'not-allowed', fontWeight: 600 }}
            >
              {isExporting ? 'កំពុងដំណើរការ...' : 'នាំចេញជា PDF'}
            </button>
            <button
              onClick={handlePrint}
              disabled={selectedStudentIds.length === 0 || isExporting}
              style={{ padding: '10px 20px', background: selectedStudentIds.length ? '#C5A059' : '#ccc', color: 'white', border: 'none', borderRadius: '8px', cursor: (selectedStudentIds.length && !isExporting) ? 'pointer' : 'not-allowed', fontWeight: 600 }}
            >
              🖨️ បោះពុម្ព (Print)
            </button>
          </div>
        </div>

        <div className="form-grid">
          {/* Column 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="input-row-flex">
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#000080' }}>ជ្រើសរើសវគ្គសិក្សា (Select Course) *</label>
                <select 
                  value={selectedCourseId} 
                  onChange={handleCourseChange}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                >
                  <option value="">-- សូមជ្រើសរើសវគ្គសិក្សា --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }} ref={dropdownRef}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontWeight: 'bold', color: '#000080' }}>
                    សិស្ស <span className="value-tooltip" style={{ color: '#000' }}>({selectedStudentIds.length}/{courseStudents.length})<span className="tooltip-text">បានជ្រើស {selectedStudentIds.length} នាក់ ក្នុងចំណោម {courseStudents.length} នាក់</span></span>
                  </label>
                  {selectedCourseId && (
                    <button onClick={toggleAllStudents} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.9rem' }}>
                      {selectedStudentIds.length === courseStudents.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <div
                    onClick={() => {
                      if (selectedCourseId) setIsDropdownOpen(!isDropdownOpen);
                    }}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '6px', fontSize: '1rem',
                      border: `1px solid ${isDropdownOpen ? '#000080' : '#cbd5e1'}`,
                      background: !selectedCourseId ? '#f1f5f9' : '#eef2ff', cursor: selectedCourseId ? 'pointer' : 'not-allowed',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'border-color 0.15s'
                    }}
                  >
                    <span style={{ color: '#000' }}>
                      {selectedStudentIds.length === 0 ? '-- សូមជ្រើសរើសសិស្ស --' : `ជ្រើសរើសសិស្ស (${selectedStudentIds.length} នាក់)`}
                    </span>
                    <span style={{ color: '#000080', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
                  </div>

                  {isDropdownOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      border: '1px solid #000080',
                      borderRadius: '6px', padding: '6px', background: 'white', marginTop: '4px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                    }}>
                      <input
                        type="text"
                        autoFocus
                        placeholder="ស្វែងរកសិស្ស..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        style={{
                          width: '100%', padding: '8px', marginBottom: '6px', boxSizing: 'border-box',
                          borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem',
                          background: '#f8fafc'
                        }}
                      />
                      <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        {filteredCourseStudents.length === 0 ? (
                          <div style={{ padding: '5px', color: '#94a3b8' }}>
                            {courseStudents.length === 0 ? '-- គ្មានសិស្ស --' : '-- រកមិនឃើញសិស្ស --'}
                          </div>
                        ) : (
                          filteredCourseStudents.map(s => (
                            <label key={s.id} className={`dropdown-item${selectedStudentIds.includes(s.id) ? ' dropdown-item-selected' : ''}`}>
                              <input
                                type="checkbox"
                                checked={selectedStudentIds.includes(s.id)}
                                onChange={() => toggleStudent(s.id)}
                              />
                              <span>{s.name} - {s.studentCode}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="input-row-flex">
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', fontWeight: 'bold', color: '#000080', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editCourse} onChange={e => setEditCourse(e.target.checked)} />
                  វគ្គសិក្សា (Khmer)
                </label>
                <input type="text" value={courseKh} onChange={e => setCourseKh(e.target.value)} disabled={!editCourse} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: !editCourse ? '#f1f5f9' : 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', fontWeight: 'bold', color: '#000080', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editCourse} onChange={e => setEditCourse(e.target.checked)} />
                  Course (English)
                </label>
                <input type="text" value={courseEn} onChange={e => setCourseEn(e.target.value)} disabled={!editCourse} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: !editCourse ? '#f1f5f9' : 'white' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', fontWeight: 'bold', color: '#000080', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editSubject} onChange={e => setEditSubject(e.target.checked)} />
                  មុខវិជ្ជា (Khmer)
                </label>
                <input type="text" value={subjectKh} onChange={e => setSubjectKh(e.target.value)} disabled={!editSubject} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: !editSubject ? '#f1f5f9' : 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', fontWeight: 'bold', color: '#000080', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editSubject} onChange={e => setEditSubject(e.target.checked)} />
                  Subject (English)
                </label>
                <input type="text" value={subjectEn} onChange={e => setSubjectEn(e.target.value)} disabled={!editSubject} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: !editSubject ? '#f1f5f9' : 'white' }} />
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="input-row-flex">
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', fontWeight: 'bold', color: '#000080', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editGrade} onChange={e => setEditGrade(e.target.checked)} />
                  និទ្ទេស (Khmer)
                </label>
                <input type="text" value={gradeKh} onChange={e => setGradeKh(e.target.value)} disabled={!editGrade} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: !editGrade ? '#f1f5f9' : 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', fontWeight: 'bold', color: '#000080', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editGrade} onChange={e => setEditGrade(e.target.checked)} />
                  Grade (English)
                </label>
                <input type="text" value={gradeEn} onChange={e => setGradeEn(e.target.value)} disabled={!editGrade} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: !editGrade ? '#f1f5f9' : 'white' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', fontWeight: 'bold', color: '#000080', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editStart} onChange={e => setEditStart(e.target.checked)} />
                  ថ្ងៃចាប់ផ្តើម (Khmer)
                </label>
                <input type="text" value={startKh} onChange={e => setStartKh(e.target.value)} disabled={!editStart} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: !editStart ? '#f1f5f9' : 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', fontWeight: 'bold', color: '#000080', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editStart} onChange={e => setEditStart(e.target.checked)} />
                  Start Date (English)
                </label>
                <input type="text" value={startEn} onChange={e => setStartEn(e.target.value)} disabled={!editStart} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: !editStart ? '#f1f5f9' : 'white' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', fontWeight: 'bold', color: '#000080', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editEnd} onChange={e => setEditEnd(e.target.checked)} />
                  ថ្ងៃបញ្ចប់ (Khmer)
                </label>
                <input type="text" value={endKh} onChange={e => setEndKh(e.target.value)} disabled={!editEnd} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: !editEnd ? '#f1f5f9' : 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', fontWeight: 'bold', color: '#000080', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editEnd} onChange={e => setEditEnd(e.target.checked)} />
                  End Date (English)
                </label>
                <input type="text" value={endEn} onChange={e => setEndEn(e.target.value)} disabled={!editEnd} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: !editEnd ? '#f1f5f9' : 'white' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          html, body { 
            background: #fff !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            height: auto !important;
            overflow: visible !important;
          }
          .no-print, aside, header, nav { display: none !important; }
          .page-root { padding: 0 !important; display: block !important; min-height: 0 !important; }
          .cert-list { display: block !important; gap: 0 !important; opacity: 1 !important; }
          .cert-print-container {
            display: flex !important; width: 1122px !important; height: 793px !important;
            margin: 0 !important; padding: 0; position: relative;
            background: #fff;
            box-shadow: none !important;
            page-break-after: always;
            page-break-inside: avoid;
          }
          .cert-print-container:last-child { page-break-after: auto; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          /* Force Next.js layout wrappers to expand fully for multi-page printing */
          body > div, body > div > div, main {
             display: block !important;
             height: auto !important;
             min-height: 0 !important;
             overflow: visible !important;
             padding: 0 !important;
             margin: 0 !important;
             background: #fff !important;
          }
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          cursor: pointer;
          border-radius: 4px;
          color: #000;
          transition: background 0.15s;
        }
        .dropdown-item:hover {
          background: #f1f5f9;
        }
        .dropdown-item-selected {
          background: #eef2ff;
        }
        .dropdown-item-selected:hover {
          background: #e0e7ff;
        }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .form-actions { display: flex; gap: 10px; }
        .input-row-flex { display: flex; gap: 10px; }

        .cert-list-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          display: flex;
          justify-content: center;
          padding-bottom: 20px;
        }

        @media (max-width: 900px) {
          .cert-list-wrapper { justify-content: flex-start; }
        }

        @media (max-width: 768px) {
          .page-root { padding: 10px !important; }
          .form-header { flex-direction: column; align-items: flex-start; gap: 15px; }
          .form-actions { flex-wrap: wrap; width: 100%; }
          .form-actions button { flex: 1; min-width: 140px; }
          .form-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 480px) {
          .input-row-flex { flex-direction: column; gap: 15px; }
          .form-actions { flex-direction: column; }
        }

        .value-tooltip {
          position: relative;
          cursor: help;
          border-bottom: 1px dashed #94a3b8;
        }
        .value-tooltip .tooltip-text {
          visibility: hidden;
          opacity: 0;
          position: absolute;
          bottom: 125%;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: #fff;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: normal;
          white-space: nowrap;
          transition: opacity 0.15s ease;
          z-index: 100;
        }
        .value-tooltip:hover .tooltip-text {
          visibility: visible;
          opacity: 1;
        }

        .cert-print-container {
          background: #fff;
          width: 1122px; height: 793px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          position: relative;
          overflow: hidden;
          font-family: "Battambang", "Khmer OS Battambang", "Times New Roman", serif;
          color: #000;
        }

        /* BORDERS */
        .cert-border-outer {
          position: absolute; top: 18px; left: 18px; right: 18px; bottom: 18px;
          border: 4px solid #C5A059;
          z-index: 5;
          pointer-events: none;
        }
        .cert-border-inner {
          position: absolute; top: 26px; left: 26px; right: 26px; bottom: 26px;
          border: 12px solid #0B2B5E;
          z-index: 5;
          pointer-events: none;
        }
        .cert-border-inner-light {
          position: absolute; top: 40px; left: 40px; right: 40px; bottom: 40px;
          border: 2px solid #C5A059;
          z-index: 5;
          pointer-events: none;
        }

        /* CORNER ORNAMENTS (Simple lines for now) */
        .cert-corner {
          position: absolute; width: 60px; height: 60px; z-index: 6; pointer-events: none;
        }
        .cert-corner::before, .cert-corner::after {
          content: ''; position: absolute; background: #C5A059;
        }
        .corner-tl { top: 20px; left: 20px; border-top: 4px solid #fff; border-left: 4px solid #fff; }
        .corner-tr { top: 20px; right: 20px; border-top: 4px solid #fff; border-right: 4px solid #fff; }
        .corner-bl { bottom: 20px; left: 20px; border-bottom: 4px solid #fff; border-left: 4px solid #fff; }
        .corner-br { bottom: 20px; right: 20px; border-bottom: 4px solid #fff; border-right: 4px solid #fff; }

        /* CONTENT WRAPPER */
        .cert-content {
          position: absolute; top: 44px; left: 44px; right: 44px; bottom: 44px;
          padding: 30px 40px;
          z-index: 10;
          display: flex;
          flex-direction: column;
        }

        /* TYPOGRAPHY UTILS */
        .font-moul { font-family: "Moul", "Khmer OS Muol Light", serif; }
        .font-bat { font-family: "Battambang", "Khmer OS Battambang", sans-serif; }
        .font-en { font-family: "Times New Roman", serif; }
        .text-blue { color: #000080; } /* Dark navy blue for headers */
        
        /* HEADER SECTION */
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
        }

        /* Left Header */
        .header-left {
          flex: 0 0 auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .header-left-logo {
          width: 65px; height: 65px;
          border-radius: 50%;
          border: 1px solid #C5A059;
          margin-bottom: 12px;
          display: flex; align-items: center; justify-content: center;
          background: #fff;
          overflow: hidden;
        }
        .header-left-logo img { width: 100%; height: 100%; object-fit: cover; }
        .school-name {
          font-size: 16px;
          line-height: 1.5;
          color: #000080;
        }

        /* Center Header */
        .header-center {
          flex: 1;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #000080;
          margin-top: -15px;
        }
        .king-kh { font-size: 19px; margin-bottom: 6px; letter-spacing: 1px; }
        .nation-kh { font-size: 18px; margin-bottom: 8px; }
        .king-en { font-size: 14px; font-weight: bold; margin-bottom: 4px; letter-spacing: 0.5px; }
        .nation-en { font-size: 13px; font-weight: bold; margin-bottom: 24px; }
        .cert-title-kh { font-size: 21px; margin-bottom: 8px; color: #000080; letter-spacing: 1px; }
        .cert-title-en { font-size: 20px; font-weight: bold; letter-spacing: 1px; color: #000080; }

        /* Right Header */
        .header-right {
          flex: 0 0 auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .header-right-logo {
          width: 60px; height: 80px;
          margin-bottom: 5px;
          display: flex; align-items: center; justify-content: center;
        }
        .header-right-logo img { width: 100%; height: 100%; object-fit: contain; }
        .dept-name {
          font-size: 16px;
          line-height: 1.6;
          color: #000080;
        }

        /* BODY SECTION */
        .body-section {
          position: relative;
          display: flex;
          justify-content: space-between;
          flex: 1;
          margin-top: -25px;  
        }

        /* Left Body (Khmer) */
        .body-left {
          width: 50%;
          font-size: 17.5px;
          line-height: 37px;
        }
        
        .row-kh { display: flex; align-items: center; margin-bottom: 12px; }
        .label-kh { margin-right: 8px; font-weight: 600; }
        
        /* Right Body (English) */
        .body-right {
          width: 35%;
          font-size: 16.5px;
          font-weight: bold;
          line-height: 38px;
          font-family: "Times New Roman", serif;
        }

        .row-en { display: flex; align-items: center; margin-bottom: 12px; }
        .label-en { margin-right: 8px; font-weight: bold; }
        .value-en { font-weight: normal; }

        /* Center Gold Seal */
        .center-seal {
          position: absolute;
          top: 30%;
          left: 50%;
          transform: translate(-35%, -35%);
          width: 160px;
          height: 160px;
          z-index: 1;
          opacity: 0.9;
        }
        .center-seal img { width: 100%; height: 100%; object-fit: contain; }

        /* FOOTER SECTION */
        .footer-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: auto;
          margin-bottom: 10px;
        }

        /* Left Footer */
        .footer-left {
          width: 50%;
          font-size: 14px;
          line-height: 1.8;
          color: #000080;
          transform: translateX(20px);
         
        }
        .signature-title { font-size: 14px; margin-bottom: 12px; transform: translate(75px , -20px); }
        .date-line { margin-bottom: 6px; transform: translate(15px , -30px); }

        /* Right/Center Footer (Photo) */
        .footer-center {
          position: absolute;
          left: 50%;
          transform: translate(-25%, -20%);  
          
          display: flex;
          flex-direction: column;
          align-items: center;
          bottom: 0;
        }
        .photo-box {
          width: 120px;
          height: 160px;
          border: 4px solid #C5A059;
          background: #f8fafc;
          padding: 2px;
          display: flex; align-items: center; justify-content: center;
        }
        .photo-box img { width: 100%; height: 100%; object-fit: cover; }
        .photo-id {
          margin-top: 8px;
          font-family: "Times New Roman", serif;
          font-size: 14px;
          font-weight: bold;
          color: #000080;
        }
      `}</style>

      {/* PREVIEW WRAPPER */}
      <div className="cert-list-wrapper">
        <div ref={certRef} className="cert-list" style={{ display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center', opacity: selectedStudentIds.length ? 1 : 0.5, transition: 'opacity 0.3s', position: 'relative' }}>
          {selectedStudentIds.length === 0 && (
            <div className="no-print" style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(2px)', fontSize: '1.2rem', fontWeight: 'bold', color: '#64748b' }}>
              សូមជ្រើសរើសសិស្សដើម្បីបង្ហាញវិញ្ញាបនបត្រ
            </div>
          )}
        {(selectedStudentIds.length > 0 ? selectedStudents : [null]).map((student, idx) => {
          const data = generateCertificateData(student);
          return (
            <div key={student ? student.id : 'placeholder'} className="cert-print-container">
              {/* Borders */}
              <div className="cert-border-outer"></div>
              <div className="cert-border-inner"></div>
              <div className="cert-border-inner-light"></div>

              {/* Corners */}
              <div className="cert-corner corner-tl"></div>
              <div className="cert-corner corner-tr"></div>
              <div className="cert-corner corner-bl"></div>
              <div className="cert-corner corner-br"></div>

              <div className="cert-content">

                {/* HEADER */}
                <div className="header-section">
                  <div className="header-left font-moul text-blue">
                    <div className="header-left-logo">
                      <img src="/school-logo-niroth.jpg" alt="School Logo" />
                    </div>
                    <div className="school-name">សាលាពុទ្ធិកអនុវិទ្យាល័យ</div>
                    <div className="school-name">សម្តេចព្រះសង្ឃរាជ ទេព វង្ស និរោធរង្សី</div>
                  </div>

                  <div className="header-center text-blue">
                    <div className="font-moul king-kh">ព្រះរាជាណាចក្រកម្ពុជា</div>
                    <div className="font-moul nation-kh">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
                    <div className="font-en king-en">KINGDOM OF CAMBODIA</div>
                    <div className="font-en nation-en">Nation Religion King</div>

                    <div className="font-moul cert-title-kh">វិញ្ញាបនបត្របញ្ជាក់ការសិក្សា</div>
                    <div className="font-en cert-title-en">CERTIFICATE</div>
                  </div>

                  <div className="header-right font-moul text-blue">
                    <div className="header-right-logo">
                      <img src="/ministry-logo.png" alt="Ministry Logo" />
                    </div>
                    <div className="dept-name">មន្ទីរធម្មការនិងសាសនារាជធានី</div>
                    <div className="dept-name">ភ្នំពេញ</div>
                  </div>
                </div>

                {/* BODY */}
                <div className="body-section">

                  {/* Center Seal Overlap */}
                  <div className="center-seal">
                    <img src="/gold-seal.jpg" alt="Certificate Seal" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>

                  {/* Left Khmer Side */}
                  <div className="body-left font-bat">
                    <div style={{ display: 'flex', whiteSpace: 'nowrap' }}>
                      <div style={{ width: '55%' }} className="text-blue">
                        <span className="label-kh">សូមបញ្ជាក់ថា:</span> {data.nameKh}
                      </div>
                <div style={{ width: '45%' }}>
                  <span className="label-kh">ភេទ:</span> {data.genderKh}
                </div>
              </div>

              <div style={{ display: 'flex', whiteSpace: 'nowrap' }}>
                <div style={{ width: '55%' }}>
                  <span className="label-kh">ថ្ងៃខែឆ្នាំកំណើត:</span> {data.dobKh}
                </div>
                <div style={{ width: '45%' }}>
                  <span className="label-kh">សញ្ជាតិ:</span> {data.nationalityKh}
                </div>
              </div>

              <div style={{ whiteSpace: 'nowrap' }}>
                <span className="label-kh">បានបញ្ចប់វគ្គសិក្សា:</span> {data.courseKh}
              </div>

              <div style={{ whiteSpace: 'nowrap' }}>
                <span className="label-kh">និទ្ទេស:</span> {data.gradeKh}
              </div>

              <div style={{ whiteSpace: 'nowrap' }}>
                <span className="label-kh">សិក្សាមុខវិជ្ជា:</span> <span className="font-en">{data.subjectKh}</span>
              </div>

              <div style={{ display: 'flex', whiteSpace: 'nowrap' }}>
                <div style={{ width: '55%' }}>
                  <span className="label-kh">ចាប់ពីថ្ងៃផ្តើមពីថ្ងៃ:</span> {data.startKh}
                </div>
                <div style={{ width: '45%' }}>
                  <span className="label-kh">ដល់:</span> {data.endKh}
                </div>
              </div>

              <div style={{ marginTop: '10px', whiteSpace: 'nowrap' }}>
                វិញ្ញាបនបត្រនេះចេញឲ្យសាមីជនប្រើប្រាស់តាមការដែលអាចប្រើបាន។
              </div>
            </div>

            {/* Right English Side */}
            <div className="body-right">
              <div style={{ whiteSpace: 'nowrap' }} className="text-blue">
                <span className="label-en">This is to certify that:</span> <span className="value-en">{data.nameEn}</span>
              </div>

              <div style={{ display: 'flex', whiteSpace: 'nowrap' }}>
                <div style={{ width: '55%' }}>
                  <span className="label-en">Born on:</span> <span className="value-en">{data.dobEn}</span>
                </div>
                <div style={{ width: '45%' }}>
                  <span className="label-en">Nationality:</span> <span className="value-en">{data.nationalityEn}</span>
                </div>
              </div>

              <div style={{ whiteSpace: 'nowrap' }}>
                <span className="label-en">Has successfully completed:</span> <span className="value-en">{data.courseEn}</span>
              </div>

              <div style={{ whiteSpace: 'nowrap' }}>
                <span className="label-en">Grade:</span> <span className="value-en">{data.gradeEn}</span>
              </div>

              <div style={{ whiteSpace: 'nowrap' }}>
                <span className="label-en">The course include:</span> <span className="value-en">{data.subjectEn}</span>
              </div>

              <div style={{ display: 'flex', whiteSpace: 'nowrap' }}>
                <div style={{ width: '55%' }}>
                  <span className="label-en">Held from:</span> <span className="value-en">{data.startEn}</span>
                </div>
                <div style={{ width: '45%' }}>
                  <span className="label-en"> To:</span> <span className="value-en">{data.endEn}</span>
                </div>
              </div>

              <div style={{ marginTop: '10px', whiteSpace: 'nowrap' }}>
                <span className="label-en">This certificate is issued for official user.</span>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="footer-section">
            <div className="footer-left font-bat">
              <div className="font-moul signature-title">បានឃើញ និងឯកភាព</div>
              <div className="date-line">
                {data.lunarDateKh}
              </div>
              <div className="date-line">
                {data.issuedDateKh}
              </div>
              <div className="font-moul" style={{ marginTop: '15px', marginLeft: '60px', transform:'translate(50px,-40px)'}}>នាយក</div> 
            </div>

            <div className="footer-center">
              <div className="photo-box">
                {!photoError && data.photoUrl ? (
                  <img src={data.photoUrl} alt="Student" onError={() => setPhotoError(true)} />
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '14px' }}>រូបថត ៤x៦</div>
                )}
              </div>
              <div className="photo-id">
                ID: {data.studentId}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
