'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ExamResult { id: string; score: number; createdAt: string; exam: { course: { name: string }, questions?: { points: number }[] } }
interface ExamParticipation { id: string; currentScore: number; createdAt: string; session: { exam: { course: { name: string }, questions?: { points: number }[] } }; }
interface Enrollment { id: string; createdAt: string; course: { name: string }; }
interface Student { id: string; studentCode: string; name: string; nameEn?: string | null; photoUrl?: string | null; gender?: string | null; dateOfBirth?: string | null; grade?: string | null; enrollments?: Enrollment[]; examParticipations?: ExamParticipation[]; results?: ExamResult[]; }
interface Certificate {
  id: string; title: string; issuedDate: string; description: string | null;
  studentId: string; student: Student; createdAt: string; updatedAt: string;
}
interface CustomField { id: string; label: string; value: string; x: number; y: number; font: string; fontSize: number; color: string; bold: boolean; textAlign?: string; width?: number; }
interface CustomImage { id: string; src: string; x: number; y: number; w: number; h: number; }

interface Props {
  certificate: Certificate;
  onClose: () => void;
}

export default function CertificatePrintModal({ certificate, onClose }: Props) {
  // Positioning
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  // Custom text fields
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // Custom images
  const [customImages, setCustomImages] = useState<CustomImage[]>([]);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // Drag state (shared between text fields and images)
  const [dragState, setDragState] = useState<{
    id: string; type: 'field' | 'image';
    startX: number; startY: number;
    initialX: number; initialY: number;
  } | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Global variables
  const [globalGrade, setGlobalGrade] = useState('');
  const [globalStartDate, setGlobalStartDate] = useState('');
  const [globalEndDate, setGlobalEndDate] = useState('');
  const [globalLunarDate, setGlobalLunarDate] = useState('');

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('certPrintBilingual');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.offsetX !== undefined) setOffsetX(d.offsetX);
        if (d.offsetY !== undefined) setOffsetY(d.offsetY);
        if (Array.isArray(d.customFields)) setCustomFields(d.customFields);
        if (Array.isArray(d.customImages)) setCustomImages(d.customImages);
        if (d.globalGrade !== undefined) setGlobalGrade(d.globalGrade);
        if (d.globalStartDate !== undefined) setGlobalStartDate(d.globalStartDate);
        if (d.globalEndDate !== undefined) setGlobalEndDate(d.globalEndDate);
        if (d.globalLunarDate !== undefined) setGlobalLunarDate(d.globalLunarDate);
      } catch (e) { }
    }
    setLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem('certPrintBilingual', JSON.stringify({
      offsetX, offsetY, customFields, customImages,
      globalGrade, globalStartDate, globalEndDate, globalLunarDate
    }));
  }, [loaded, offsetX, offsetY, customFields, customImages, globalGrade, globalStartDate, globalEndDate, globalLunarDate]);

  const handlePrint = () => window.print();

  // === Custom text field handlers ===
  const FONT_OPTIONS = [
    { value: '"Battambang", "Khmer OS Battambang", sans-serif', label: 'Battambang' },
    { value: '"Moul", "Khmer OS Muol Light", serif', label: 'Moul (ខ្មែរ)' },
    { value: '"Times New Roman", serif', label: 'Times New Roman' },
    { value: '"Georgia", serif', label: 'Georgia' },
    { value: '"Arial", sans-serif', label: 'Arial' },
    { value: '"Inter", sans-serif', label: 'Inter' },
  ];

  const addCustomField = () => {
    const label = newFieldLabel.trim();
    const value = newFieldValue.trim();
    if (!label && !value) return;
    setCustomFields(prev => [...prev, {
      id: `cf-${Date.now()}-${prev.length}`,
      label, value,
      x: 60 + (prev.length % 4) * 30,
      y: 60 + Math.floor(prev.length / 4) * 36,
      font: FONT_OPTIONS[0].value,
      fontSize: 16,
      color: '#1e293b',
      bold: false,
    }]);
    setNewFieldLabel('');
    setNewFieldValue('');
  };
  const removeCustomField = (id: string) => setCustomFields(prev => prev.filter(f => f.id !== id));
  const duplicateCustomField = (id: string) => {
    const src = customFields.find(f => f.id === id);
    if (!src) return;
    setCustomFields(prev => [...prev, { ...src, id: `cf-${Date.now()}`, x: src.x + 15, y: src.y + 15 }]);
  };
  const moveCustomField = (id: string, dx: number, dy: number) =>
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, x: f.x + dx, y: f.y + dy } : f));
  const updateFieldStyle = (id: string, updates: Partial<CustomField>) =>
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));

  // === Custom image handlers ===
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Scale down to fit nicely, max 200px wide
        const scale = Math.min(200 / img.width, 200 / img.height, 1);
        setCustomImages(prev => [...prev, {
          id: `ci-${Date.now()}`,
          src,
          x: 100 + (prev.length % 3) * 120,
          y: 80 + Math.floor(prev.length / 3) * 120,
          w: Math.round(img.width * scale),
          h: Math.round(img.height * scale),
        }]);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be uploaded again
    e.target.value = '';
  };
  const removeCustomImage = (id: string) => setCustomImages(prev => prev.filter(i => i.id !== id));
  const duplicateCustomImage = (id: string) => {
    const src = customImages.find(i => i.id === id);
    if (!src) return;
    setCustomImages(prev => [...prev, { ...src, id: `ci-${Date.now()}`, x: src.x + 15, y: src.y + 15 }]);
  };
  const updateCustomImage = (id: string, updates: Partial<CustomImage>) =>
    setCustomImages(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  const resizeCustomImage = (id: string, delta: number) =>
    setCustomImages(prev => prev.map(i => {
      if (i.id !== id) return i;
      const ratio = i.w / i.h;
      const newW = Math.max(30, i.w + delta);
      const newH = Math.round(newW / ratio);
      return { ...i, w: newW, h: newH };
    }));

  // === Universal drag handlers (pointer capture) ===
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string, type: 'field' | 'image') => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const item = type === 'field'
      ? customFields.find(f => f.id === id)
      : customImages.find(i => i.id === id);
    if (item) {
      setDragState({
        id, type,
        startX: e.clientX,
        startY: e.clientY,
        initialX: item.x,
        initialY: item.y,
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    if (!dragState || dragState.id !== id) return;
    const scale = 0.85;
    const dx = (e.clientX - dragState.startX) / scale;
    const dy = (e.clientY - dragState.startY) / scale;

    const snap = (val: number) => Math.round(val / 5) * 5;

    if (dragState.type === 'field') {
      setCustomFields(prev => prev.map(f =>
        f.id === id ? { ...f, x: snap(dragState.initialX + dx), y: snap(dragState.initialY + dy) } : f
      ));
    } else {
      setCustomImages(prev => prev.map(i =>
        i.id === id ? { ...i, x: snap(dragState.initialX + dx), y: snap(dragState.initialY + dy) } : i
      ));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    setDragState(null);
  };

  if (!loaded) return null;

  const renderCertificate = (isPreview = false) => {
    const replaceVars = (text: string) => {
      if (!text) return '';
      
      const formatGender = (g: string | null | undefined) => {
        if (!g) return '';
        const lower = g.toLowerCase();
        if (lower === 'm' || lower === 'male' || lower === 'ប្រុស') return 'ប្រុស';
        if (lower === 'f' || lower === 'female' || lower === 'ស្រី') return 'ស្រី';
        return g;
      };

      const formatKhmerDate = (dString: string | null | undefined) => {
        if (!dString) return '';
        const d = new Date(dString);
        if (isNaN(d.getTime())) return dString;
        
        const toKhmerDigits = (str: string) => {
          const khmerDigits = ['០','១','២','៣','៤','៥','៦','៧','៨','៩'];
          return str.replace(/[0-9]/g, match => khmerDigits[parseInt(match)]);
        };

        const khmerMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
        const day = toKhmerDigits(d.getDate().toString().padStart(2, '0'));
        const month = khmerMonths[d.getMonth()];
        const year = toKhmerDigits(d.getFullYear().toString());
        
        return `${day}-${month}-${year}`;
      };

      const formatEnglishDate = (dString: string | null | undefined) => {
        if (!dString) return '';
        const d = new Date(dString);
        if (isNaN(d.getTime())) return dString;
        
        const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = d.getDate().toString().padStart(2, '0');
        const month = enMonths[d.getMonth()];
        const year = d.getFullYear().toString();
        
        return `${day}-${month}-${year}`;
      };

      const latestResult = certificate.student.results?.[0];
      const latestExam = certificate.student.examParticipations?.[0];
      
      const latestEnrollment = latestResult
        ? certificate.student.enrollments?.find(e => e.course.name === latestResult.exam.course.name) || certificate.student.enrollments?.[0]
        : (latestExam 
          ? certificate.student.enrollments?.find(e => e.course.name === latestExam.session.exam.course.name) || certificate.student.enrollments?.[0]
          : certificate.student.enrollments?.[0]);

      const dynamicCourse = latestResult?.exam?.course?.name || latestExam?.session?.exam?.course?.name || latestEnrollment?.course?.name || certificate.title || '';
      
      const score = latestResult?.score !== undefined ? latestResult.score : latestExam?.currentScore;
      
      let dynamicGrade = '';
      let dynamicGradeEn = '';
      if (score !== undefined) {
        let pct = score;
        const questions = latestResult?.exam?.questions || latestExam?.session?.exam?.questions;
        if (questions && questions.length > 0) {
          const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
          if (totalPoints > 0) {
            pct = Math.round((score / totalPoints) * 100);
          }
        }
        
        if (pct >= 90) { dynamicGrade = 'ល្អណាស់'; dynamicGradeEn = 'Excellent'; }
        else if (pct >= 80) { dynamicGrade = 'ល្អ'; dynamicGradeEn = 'Very Good'; }
        else if (pct >= 70) { dynamicGrade = 'បង្គួរ'; dynamicGradeEn = 'Good'; }
        else if (pct >= 50) { dynamicGrade = 'មធ្យម'; dynamicGradeEn = 'Average'; }
        else { dynamicGrade = 'ធ្លាក់'; dynamicGradeEn = 'Fail'; }
      }

      const dynamicStart = latestEnrollment?.createdAt;
      const dynamicEnd = latestExam?.createdAt;

      let globalGradeEn = globalGrade;
      if (globalGrade === 'ល្អណាស់') globalGradeEn = 'Excellent';
      else if (globalGrade === 'ល្អ') globalGradeEn = 'Very Good';
      else if (globalGrade === 'បង្គួរ') globalGradeEn = 'Good';
      else if (globalGrade === 'មធ្យម') globalGradeEn = 'Average';
      else if (globalGrade === 'ធ្លាក់') globalGradeEn = 'Fail';

      return text
        .replace(/\{name\}/gi, certificate.student.name || '')
        .replace(/\{gender\}/gi, formatGender(certificate.student.gender))
        .replace(/\{dob\}/gi, formatKhmerDate(certificate.student.dateOfBirth))
        .replace(/\{course\}/gi, dynamicCourse)
        .replace(/\{desc\}/gi, certificate.description || '')
        .replace(/\{date\}/gi, formatKhmerDate(certificate.issuedDate))
        .replace(/\{grade\}/gi, dynamicGrade || globalGrade)
        .replace(/\{score\}/gi, score !== undefined ? score.toString() : '')
        .replace(/\{start\}/gi, formatKhmerDate(dynamicStart || null) || formatKhmerDate(globalStartDate || null) || globalStartDate)
        .replace(/\{end\}/gi, formatKhmerDate(dynamicEnd || null) || formatKhmerDate(globalEndDate || null) || globalEndDate)
        .replace(/\{lunar\}/gi, globalLunarDate)
        .replace(/\{name_en\}/gi, certificate.student.nameEn || certificate.student.name || '')
        .replace(/\{gender_en\}/gi, formatGender(certificate.student.gender) === 'ប្រុស' ? 'Male' : formatGender(certificate.student.gender) === 'ស្រី' ? 'Female' : '')
        .replace(/\{dob_en\}/gi, formatEnglishDate(certificate.student.dateOfBirth))
        .replace(/\{date_en\}/gi, formatEnglishDate(certificate.issuedDate))
        .replace(/\{course_en\}/gi, dynamicCourse)
        .replace(/\{grade_en\}/gi, dynamicGradeEn || globalGradeEn)
        .replace(/\{start_en\}/gi, formatEnglishDate(dynamicStart || null) || formatEnglishDate(globalStartDate || null) || globalStartDate)
        .replace(/\{end_en\}/gi, formatEnglishDate(dynamicEnd || null) || formatEnglishDate(globalEndDate || null) || globalEndDate)
        .replace(/\{id\}/gi, certificate.student.studentCode || '');
    };

    return (
    <div className="cert-wrapper">

      {/* ALIGNMENT GUIDE LINES — only in preview */}
      {isPreview && showGuides && (
        <div className="cert-guides" style={{ pointerEvents: 'none' }}>
          {/* Vertical center */}
          <div className="cert-guide-v" style={{ left: '50%' }} />
          {/* Horizontal center */}
          <div className="cert-guide-h" style={{ top: '50%' }} />
          {/* Vertical thirds */}
          <div className="cert-guide-v cert-guide-third" style={{ left: '33.33%' }} />
          <div className="cert-guide-v cert-guide-third" style={{ left: '66.67%' }} />
          {/* Horizontal thirds */}
          <div className="cert-guide-h cert-guide-third" style={{ top: '33.33%' }} />
          <div className="cert-guide-h cert-guide-third" style={{ top: '66.67%' }} />
          {/* Center cross label */}
          <div className="cert-guide-label" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -120%)' }}>CENTER</div>
        </div>
      )}

      {/* CLASSIC BORDER */}
      <div className="cert-border-outer"></div>

      {/* Corner Ornaments */}
      <div className="cert-corner corner-tl"></div>
      <div className="cert-corner corner-tr"></div>
      <div className="cert-corner corner-bl"></div>
      <div className="cert-corner corner-br"></div>

      <div className="cert-content-area" style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }}>

        {/* STUDENT PHOTO - CENTER BOTTOM */}
        <div className="cert-photo-box">
          <div className="cert-photo-frame">
            {certificate.student.photoUrl ? (
              <img src={certificate.student.photoUrl} alt="Student" />
            ) : (
              <div className="cert-photo-empty">រូបថត<br />៤x៦</div>
            )}
          </div>
          <div style={{ marginTop: '6px', fontSize: '0.8rem', fontWeight: 600, fontFamily: '"Battambang", sans-serif', color: '#0B2B5E' }}>
            ID: {certificate.student.studentCode}
          </div>
        </div>

        {/* CUSTOM TEXT FIELDS — draggable */}
        {customFields.map(f => (
          <div
            key={f.id}
            className="cert-custom-field"
            style={{
              position: 'absolute',
              left: `${f.x}px`,
              top: `${f.y}px`,
              width: f.width ? `${f.width}px` : 'auto',
              fontFamily: f.font || '"Battambang", sans-serif',
              fontSize: `${f.fontSize || 16}px`,
              color: f.color || '#1e293b',
              fontWeight: f.bold ? 700 : 400,
              textAlign: (f.textAlign || 'left') as any,
              whiteSpace: f.width ? 'pre-wrap' : 'nowrap',
              cursor: dragState?.id === f.id ? 'grabbing' : 'grab',
              pointerEvents: 'auto',
              userSelect: 'none'
            }}
            onPointerDown={(e) => handlePointerDown(e, f.id, 'field')}
            onPointerMove={(e) => handlePointerMove(e, f.id)}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {f.label && <span style={{ fontWeight: 700 }}>{f.label}</span>}
            {f.label && f.value ? ': ' : ''}
            {replaceVars(f.value)}
          </div>
        ))}

        {/* CUSTOM IMAGES — draggable */}
        {customImages.map(img => (
          <div
            key={img.id}
            className="cert-custom-image"
            style={{
              left: `${img.x}px`,
              top: `${img.y}px`,
              width: `${img.w}px`,
              height: `${img.h}px`,
              cursor: dragState?.id === img.id ? 'grabbing' : 'grab',
              pointerEvents: 'auto',
              userSelect: 'none'
            }}
            onPointerDown={(e) => handlePointerDown(e, img.id, 'image')}
            onPointerMove={(e) => handlePointerMove(e, img.id)}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img src={img.src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
          </div>
        ))}

      </div>
    </div>
    );
  };

  return (
    <>
      <style>{`
        @media print {
          @page { size: 297mm 210mm; margin: 0; }
          .cert-guides { display: none !important; }
          body { background: #fff !important; margin: 0; padding: 0; }
          body > :not(#cert-print-area) { display: none !important; }
          #cert-print-area { display: flex !important; align-items: center; justify-content: center; width: 100vw; height: 100vh; background: #fff; padding: 0; box-sizing: border-box; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        #cert-print-area { display: none; }

        .cert-modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px);
          z-index: 1000; display: flex; flex-direction: column; align-items: center; padding: 20px;
          overflow-y: auto;
        }

        .cert-toolbar {
          background: #fff; padding: 12px 24px; border-radius: 12px;
          display: flex; gap: 12px; align-items: center; margin-bottom: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2); width: 100%; max-width: 1122px; flex-wrap: wrap;
        }

        .cert-preview-container {
          background: #fff;
          width: 1122px; height: 793px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          position: relative;
          transform-origin: top center;
          transform: scale(min(1, calc((100vw - 60px) / 1122)));
          margin-bottom: 40px;
          overflow: hidden;
        }

        .cert-wrapper {
          position: relative;
          width: 100%; height: 100%;
          background-color: #fff;
          background-image: url('/premium-bg.png');
          background-size: cover;
          background-position: center;
          z-index: 1;
        }

        .cert-border-outer {
          position: absolute; top: 30px; left: 30px; right: 30px; bottom: 30px;
          border: 12px solid #0B2B5E;
          box-shadow: 
            inset 0 0 0 4px #fff, 
            inset 0 0 0 8px #C5A059, 
            inset 0 0 0 10px #fff, 
            inset 0 0 0 11px #0B2B5E,
            0 0 0 4px #fff,
            0 0 0 6px #C5A059;
          pointer-events: none;
          z-index: 5;
        }

        .cert-corner {
          position: absolute; width: 60px; height: 60px;
          z-index: 6; pointer-events: none;
        }
        .cert-corner::before, .cert-corner::after {
          content: ''; position: absolute; background: #C5A059;
        }
        .cert-corner::before { width: 40px; height: 6px; }
        .cert-corner::after { width: 6px; height: 40px; }

        .corner-tl { top: 22px; left: 22px; }
        .corner-tl::before { top: 0; left: 0; }
        .corner-tl::after { top: 0; left: 0; }

        .corner-tr { top: 22px; right: 22px; }
        .corner-tr::before { top: 0; right: 0; }
        .corner-tr::after { top: 0; right: 0; }

        .corner-bl { bottom: 22px; left: 22px; }
        .corner-bl::before { bottom: 0; left: 0; }
        .corner-bl::after { bottom: 0; left: 0; }

        .corner-br { bottom: 22px; right: 22px; }
        .corner-br::before { bottom: 0; right: 0; }
        .corner-br::after { bottom: 0; right: 0; }

        .cert-content-area {
          position: absolute; top: 40px; left: 50px; right: 50px; bottom: 50px;
          z-index: 2;
        }

        /* PHOTO */
        .cert-photo-box {
          position: absolute; bottom: -15px; left: 50%; transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; z-index: 10;
        }
        .cert-photo-frame {
          width: 120px; height: 150px; border: 4px solid #C5A059; background: #fff;
          padding: 4px; box-shadow: 0 5px 20px rgba(0,0,0,0.2); overflow: hidden;
        }
        .cert-photo-frame img { width: 100%; height: 100%; object-fit: cover; }
        .cert-photo-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-family: "Battambang"; text-align: center; font-size: 1rem; background: #f1f5f9; }

        /* CUSTOM TEXT */
        .cert-custom-field {
          position: absolute; z-index: 9; white-space: nowrap;
          font-family: "Battambang", "Khmer OS Battambang", sans-serif; font-size: 0.95rem; color: #1e293b;
        }

        /* CUSTOM IMAGES */
        .cert-custom-image {
          position: absolute; z-index: 8;
        }

        /* SETTINGS UI */
        .settings-btn { padding: 8px 16px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 6px; }
        .settings-btn:hover { background: #e2e8f0; }
        .print-btn { padding: 8px 20px; background: #C5A059; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; box-shadow: 0 2px 8px rgba(197,160,89,0.4); }
        .print-btn:hover { background: #b48b3b; }
        .close-btn { margin-left: auto; width: 36px; height: 36px; border-radius: 50%; border: none; background: #fee2e2; color: #ef4444; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
        .close-btn:hover { background: #fecaca; }

        .cert-settings-panel {
          position: fixed; top: 20px; right: 20px; bottom: 20px; width: 650px;
          background: white; border-radius: 12px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          z-index: 1000; overflow-y: auto; font-family: sans-serif;
        }
        .cert-settings-full { width: 100%; display: flex; gap: 20px; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 15px; }
        .cert-pos-controls { display: flex; flex-direction: column; align-items: center; gap: 5px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .cert-pos-row { display: flex; gap: 10px; }
        .cert-pos-btn { background: white; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 12px; cursor: pointer; font-size: 1.1rem; }
        .cert-pos-btn:hover { background: #e2e8f0; }
        .cert-pos-info { font-size: 0.85rem; color: #64748b; margin-left: 10px; }

        .cert-custom-row { display: flex; align-items: center; gap: 14px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 10px; }
        .cert-custom-row-info { flex: 1; font-size: 0.9rem; color: #1e293b; word-break: break-word; }
        .cert-custom-pad { display: flex; flex-direction: column; align-items: center; gap: 4px; background: #f8fafc; padding: 6px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .cert-custom-pad-row { display: flex; gap: 6px; }
        .cert-custom-pad-btn { background: white; border: 1px solid #cbd5e1; border-radius: 4px; width: 30px; height: 26px; cursor: pointer; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; padding: 0; }
        .cert-custom-pad-btn:hover { background: #e2e8f0; }
        .cert-custom-remove-btn { background: #fee2e2; border: 1px solid #fecaca; color: #ef4444; border-radius: 4px; width: 30px; height: 26px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; padding: 0; }
        .cert-custom-remove-btn:hover { background: #fecaca; }

        .cert-settings-panel h4 { margin: 0 0 16px 0; color: #0f172a; font-size: 1.1rem; }
        .cert-input { width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-family: inherit; font-size: 0.9rem; color: #0f172a; background: #ffffff; box-sizing: border-box; }
        .cert-input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }

        /* Image upload area */
        .cert-img-upload-zone {
          border: 2px dashed #cbd5e1; border-radius: 10px; padding: 20px; text-align: center;
          cursor: pointer; transition: all 0.2s; background: #f8fafc; margin-bottom: 12px;
        }
        .cert-img-upload-zone:hover { border-color: #2563eb; background: #eff6ff; }
        .cert-img-upload-zone p { margin: 0; color: #64748b; font-size: 0.9rem; }
        .cert-img-upload-zone span { font-size: 2rem; display: block; margin-bottom: 6px; }

        .cert-img-row {
          display: flex; align-items: center; gap: 10px; padding: 8px 10px;
          border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; background: #fafafa;
        }
        .cert-img-thumb { width: 50px; height: 50px; object-fit: contain; border-radius: 4px; border: 1px solid #e2e8f0; background: #fff; flex-shrink: 0; }
        .cert-img-row-info { flex: 1; font-size: 0.8rem; color: #64748b; }
        .cert-img-size-btns { display: flex; gap: 4px; }
        .cert-img-size-btn { background: white; border: 1px solid #cbd5e1; border-radius: 4px; width: 28px; height: 26px; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; padding: 0; }
        .cert-img-size-btn:hover { background: #e2e8f0; }

        /* ALIGNMENT GUIDES */
        .cert-guides { position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 50; pointer-events: none; }
        .cert-guide-v {
          position: absolute; top: 0; bottom: 0; width: 0;
          border-left: 1px dashed rgba(59, 130, 246, 0.7);
        }
        .cert-guide-h {
          position: absolute; left: 0; right: 0; height: 0;
          border-top: 1px dashed rgba(59, 130, 246, 0.7);
        }
        .cert-guide-third {
          border-color: rgba(59, 130, 246, 0.25);
          border-style: dotted;
        }
        .cert-guide-label {
          position: absolute; font-size: 9px; font-family: sans-serif;
          color: rgba(59, 130, 246, 0.7); font-weight: 700; letter-spacing: 1px;
          background: rgba(255,255,255,0.8); padding: 1px 6px; border-radius: 3px;
        }
      `}</style>

      {createPortal(
        <div id="cert-print-area">
          {renderCertificate(false)}
        </div>,
        document.body
      )}

      {createPortal(
        <div className="cert-modal-overlay" onClick={onClose}>
          <div className="cert-toolbar" onClick={e => e.stopPropagation()}>
            <span style={{ fontSize: '1.4rem' }}>🎓</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>រៀបចំវិញ្ញាបនបត្រ (Premium Edition)</h3>
              <div style={{ fontSize: '0.85rem', color: '#475569' }}>{certificate.student.name} - {certificate.student.studentCode}</div>
            </div>

            <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
              ⚙️ ការកំណត់
            </button>
            <button
              className="settings-btn"
              onClick={() => setShowGuides(!showGuides)}
              style={{ background: showGuides ? '#dbeafe' : undefined, borderColor: showGuides ? '#3b82f6' : undefined, color: showGuides ? '#2563eb' : undefined }}
            >
              📏 បន្ទាត់កណ្ដាល
            </button>
            <button className="print-btn" onClick={handlePrint}>🖨️ បោះពុម្ព</button>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          {showSettings && (
            <div className="cert-settings-panel" onClick={e => e.stopPropagation()}>

              {/* Position controls */}
              <div className="cert-settings-full">
                <div>
                  <h4 style={{ margin: 0, marginBottom: '10px', borderBottom: 'none' }}>រំកិលទីតាំង (Position)</h4>
                  <div className="cert-pos-controls">
                    <button className="cert-pos-btn" onClick={() => setOffsetY(y => y - 5)}>⬆️</button>
                    <div className="cert-pos-row">
                      <button className="cert-pos-btn" onClick={() => setOffsetX(x => x - 5)}>⬅️</button>
                      <button className="cert-pos-btn" onClick={() => { setOffsetX(0); setOffsetY(0); }}>⟲</button>
                      <button className="cert-pos-btn" onClick={() => setOffsetX(x => x + 5)}>➡️</button>
                    </div>
                    <button className="cert-pos-btn" onClick={() => setOffsetY(y => y + 5)}>⬇️</button>
                  </div>
                </div>
                <div className="cert-pos-info">
                  <p>X: {offsetX}px</p>
                  <p>Y: {offsetY}px</p>
                  <p style={{ marginTop: '10px' }}>ប្រើប៊ូតុងទាំងនេះ ដើម្បីរំកិលអត្ថបទលើវិញ្ញាបនបត្រឱ្យចំកណ្ដាលល្អ ពេលបោះពុម្ព។</p>
                </div>
              </div>

              {/* Global template variables */}
              <div style={{ width: '100%', borderBottom: '1px solid #e2e8f0', paddingBottom: 15, marginBottom: 15 }}>
                <h4 style={{ borderBottom: 'none', marginBottom: 10 }}>🌐 ទិន្នន័យទូទៅ (Global Variables)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>និទ្ទេស <code>{'{grade}'}</code></label>
                    <input type="text" className="cert-input" style={{ width: '100%' }} placeholder="ឧ. ល្អណាស់" value={globalGrade} onChange={e => setGlobalGrade(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>ថ្ងៃចន្ទគតិ <code>{'{lunar}'}</code></label>
                    <input type="text" className="cert-input" style={{ width: '100%' }} placeholder="ឧ. ថ្ងៃចន្ទ ១កើត ខែមាឃ" value={globalLunarDate} onChange={e => setGlobalLunarDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>ថ្ងៃចាប់ផ្ដើម <code>{'{start}'}</code></label>
                    <input type="date" className="cert-input" style={{ width: '100%' }} value={globalStartDate} onChange={e => setGlobalStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>ថ្ងៃបញ្ចប់ <code>{'{end}'}</code></label>
                    <input type="date" className="cert-input" style={{ width: '100%' }} value={globalEndDate} onChange={e => setGlobalEndDate(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Custom text fields */}
              <div style={{ width: '100%', borderBottom: '1px solid #e2e8f0', paddingBottom: 15, marginBottom: 15 }}>
                <h4 style={{ borderBottom: 'none', marginBottom: 10 }}>📝 ព័ត៌មានបន្ថែម (Custom Text)</h4>
                
                <div style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem', color: '#1e40af', marginBottom: 15, border: '1px solid #bfdbfe' }}>
                  💡 <b>គន្លឹះ៖</b> លោកគ្រូអាចប្រើអថេរខាងក្រោមក្នុងប្រអប់ "តម្លៃ" ជំនួសឲ្យចុចៗ `.....` ដើម្បីឲ្យវាទាញទិន្នន័យសិស្សស្វ័យប្រវត្តិ៖<br/>
                  <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, marginRight: 6 }}>{'{name}'}</code> ឈ្មោះសិស្ស
                  <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>{'{gender}'}</code> ភេទ
                  <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>{'{dob}'}</code> ថ្ងៃខែឆ្នាំកំណើត<br/>
                  <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, marginRight: 6, marginTop: 4, display: 'inline-block' }}>{'{course}'}</code> វគ្គសិក្សា
                  <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>{'{desc}'}</code> មុខវិជ្ជា
                  <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>{'{date}'}</code> ថ្ងៃចេញវិញ្ញាបនបត្រ<br/>
                  <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, marginRight: 6, marginTop: 4, display: 'inline-block' }}>{'{grade}'}</code> និទ្ទេស
                  <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>{'{score}'}</code> ពិន្ទុ
                  <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>{'{start}'}</code> ថ្ងៃចុះឈ្មោះចូលរៀន
                  <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>{'{end}'}</code> ថ្ងៃប្រឡង
                  <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>{'{lunar}'}</code> ចន្ទគតិ
                  <div style={{ marginTop: '12px', borderTop: '1px solid #bfdbfe', paddingTop: '12px' }}>
                    <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, marginRight: 6, display: 'inline-block' }}>{'{name_en}'}</code> ឈ្មោះ(EN)
                    <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>{'{gender_en}'}</code> ភេទ(EN)
                    <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>{'{dob_en}'}</code> ថ្ងៃកំណើត(EN)<br/>
                    <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, marginRight: 6, marginTop: 4, display: 'inline-block' }}>{'{course_en}'}</code> វគ្គសិក្សា(EN)
                    <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>{'{grade_en}'}</code> និទ្ទេស(EN)
                    <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>{'{start_en}'}</code> ថ្ងៃចុះឈ្មោះ(EN)
                    <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>{'{end_en}'}</code> ថ្ងៃប្រឡង(EN)<br/>
                    <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, marginRight: 6, marginTop: 4, display: 'inline-block' }}>{'{date_en}'}</code> ថ្ងៃចេញសញ្ញាបត្រ(EN)
                    <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>{'{id}'}</code> កូដសិស្ស
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <input type="text" className="cert-input" placeholder="ចំណងជើង (ឧ. Award)" style={{ flex: 1 }}
                    value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} />
                  <input type="text" className="cert-input" placeholder="តម្លៃ (ឧ. ពានរង្វាន់ទី១)" style={{ flex: 1 }}
                    value={newFieldValue} onChange={e => setNewFieldValue(e.target.value)} />
                  <button type="button" className="settings-btn" onClick={addCustomField}>+ បន្ថែម</button>
                </div>

                {customFields.map(f => (
                  <div key={f.id} className="cert-custom-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <div className="cert-custom-row-info" style={{ display: 'flex', gap: 4, flex: 1 }}>
                        <input
                          type="text"
                          className="cert-input"
                          value={f.label}
                          onChange={e => updateFieldStyle(f.id, { label: e.target.value })}
                          placeholder="ចំណងជើង"
                          style={{ flex: '0 1 120px', padding: '4px 6px', fontSize: '0.8rem', fontWeight: 700 }}
                        />
                        <input
                          type="text"
                          className="cert-input"
                          value={f.value}
                          onChange={e => updateFieldStyle(f.id, { value: e.target.value })}
                          placeholder="តម្លៃ"
                          style={{ flex: 1, padding: '4px 6px', fontSize: '0.8rem' }}
                        />
                      </div>
                      <div className="cert-custom-pad">
                        <button type="button" className="cert-custom-pad-btn" onClick={() => moveCustomField(f.id, 0, -5)}>⬆️</button>
                        <div className="cert-custom-pad-row">
                          <button type="button" className="cert-custom-pad-btn" onClick={() => moveCustomField(f.id, -5, 0)}>⬅️</button>
                          <button type="button" className="cert-custom-pad-btn" onClick={() => moveCustomField(f.id, 5, 0)}>➡️</button>
                        </div>
                        <button type="button" className="cert-custom-pad-btn" onClick={() => moveCustomField(f.id, 0, 5)}>⬇️</button>
                      </div>
                      <button type="button" className="cert-custom-pad-btn" style={{ fontSize: '0.8rem' }} onClick={() => duplicateCustomField(f.id)} title="ចម្លង">📋</button>
                      <button type="button" className="cert-custom-remove-btn" onClick={() => removeCustomField(f.id)} title="លុប">🗑️</button>
                    </div>
                    {/* Font / Size / Color / Bold controls */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        className="cert-input"
                        style={{ flex: '1 1 120px', padding: '4px 6px', fontSize: '0.8rem' }}
                        value={f.font}
                        onChange={e => updateFieldStyle(f.id, { font: e.target.value })}
                      >
                        {FONT_OPTIONS.map(fo => (
                          <option key={fo.value} value={fo.value}>{fo.label}</option>
                        ))}
                      </select>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <button type="button" className="cert-custom-pad-btn" style={{ fontSize: '0.75rem' }} onClick={() => updateFieldStyle(f.id, { fontSize: Math.max(8, (f.fontSize || 16) - 1) })}>A-</button>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', minWidth: 28, textAlign: 'center' }}>{f.fontSize || 16}</span>
                        <button type="button" className="cert-custom-pad-btn" style={{ fontSize: '0.75rem' }} onClick={() => updateFieldStyle(f.id, { fontSize: Math.min(72, (f.fontSize || 16) + 1) })}>A+</button>
                      </div>
                      <input
                        type="color"
                        value={f.color || '#1e293b'}
                        onChange={e => updateFieldStyle(f.id, { color: e.target.value })}
                        style={{ width: 28, height: 26, padding: 0, border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}
                        title="ពណ៌អក្សរ"
                      />
                      <button
                        type="button"
                        className="cert-custom-pad-btn"
                        style={{ fontWeight: f.bold ? 900 : 400, fontSize: '0.85rem', background: f.bold ? '#e2e8f0' : 'white' }}
                        onClick={() => updateFieldStyle(f.id, { bold: !f.bold })}
                        title="ដិត"
                      >B</button>
                      <select
                        className="cert-input"
                        style={{ width: 80, padding: '4px', fontSize: '0.8rem' }}
                        value={f.textAlign || 'left'}
                        onChange={e => updateFieldStyle(f.id, { textAlign: e.target.value })}
                        title="Align"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                        <option value="justify">Justify</option>
                      </select>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>W:</span>
                        <input type="number" className="cert-input" placeholder="Auto" style={{ width: 55, padding: '2px 6px', fontSize: '0.8rem' }} value={f.width || ''} onChange={e => updateFieldStyle(f.id, { width: e.target.value ? Number(e.target.value) : undefined })} title="ប្រវែងទទឹង (Width)" />
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>X:</span>
                        <input type="number" className="cert-input" style={{ width: 55, padding: '2px 6px', fontSize: '0.8rem' }} value={Math.round(f.x)} onChange={e => updateFieldStyle(f.id, { x: Number(e.target.value) })} />
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Y:</span>
                        <input type="number" className="cert-input" style={{ width: 55, padding: '2px 6px', fontSize: '0.8rem' }} value={Math.round(f.y)} onChange={e => updateFieldStyle(f.id, { y: Number(e.target.value) })} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom images */}
              <div style={{ width: '100%' }}>
                <h4 style={{ borderBottom: 'none', marginBottom: 10 }}>🖼️ រូបភាព (Upload Images)</h4>

                <input
                  ref={imgInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />

                <div className="cert-img-upload-zone" onClick={() => imgInputRef.current?.click()}>
                  <span>📤</span>
                  <p>ចុចត្រង់នេះ ដើម្បីបញ្ចូលរូបភាព</p>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>PNG, JPG, SVG — អូសវាទៅទីតាំងណាក៏បានលើវិញ្ញាបនបត្រ</p>
                </div>

                {customImages.map(img => (
                  <div key={img.id} className="cert-img-row">
                    <img className="cert-img-thumb" src={img.src} alt="" />
                    <div className="cert-img-row-info">
                      <div style={{ marginBottom: 6 }}>{img.w} × {img.h}px</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>X:</span>
                        <input type="number" className="cert-input" style={{ width: 55, padding: '2px 6px', fontSize: '0.8rem' }} value={Math.round(img.x)} onChange={e => updateCustomImage(img.id, { x: Number(e.target.value) })} />
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Y:</span>
                        <input type="number" className="cert-input" style={{ width: 55, padding: '2px 6px', fontSize: '0.8rem' }} value={Math.round(img.y)} onChange={e => updateCustomImage(img.id, { y: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div className="cert-img-size-btns">
                      <button type="button" className="cert-img-size-btn" onClick={() => resizeCustomImage(img.id, -10)} title="បង្រួម">➖</button>
                      <button type="button" className="cert-img-size-btn" onClick={() => resizeCustomImage(img.id, 10)} title="ពង្រីក">➕</button>
                    </div>
                    <button type="button" className="cert-custom-pad-btn" style={{ fontSize: '0.8rem' }} onClick={() => duplicateCustomImage(img.id)} title="ចម្លង">📋</button>
                    <button type="button" className="cert-custom-remove-btn" onClick={() => removeCustomImage(img.id)} title="លុប">🗑️</button>
                  </div>
                ))}
              </div>

            </div>
          )}

          <div className="cert-preview-container" onClick={e => { e.stopPropagation(); setShowSettings(false); }}>
            {renderCertificate(true)}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
