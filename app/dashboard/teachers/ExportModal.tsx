'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '../students/students.module.css';

const COLUMNS = [
  { key: 'index', label: '#' },
  { key: 'photo', label: 'រូបថត' },
  { key: 'teacherCode', label: 'លេខកូដ' },
  { key: 'name', label: 'ឈ្មោះ' },
  { key: 'gender', label: 'ភេទ' },
  { key: 'phone', label: 'ទូរស័ព្ទ' },
  { key: 'email', label: 'អ៊ីមែល' },
  { key: 'dateOfBirth', label: 'ថ្ងៃខែឆ្នាំកំណើត' },
  { key: 'nationality', label: 'សញ្ជាតិ' },
  { key: 'subject', label: 'មុខវិជ្ជា' },
  { key: 'createdAt', label: 'កាលបរិច្ឆេទ' },
] as const;

type ColKey = (typeof COLUMNS)[number]['key'];

interface Teacher {
  id: string;
  teacherCode: string;
  name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  subject: string | null;
  photoUrl: string | null;
  notes: string | null;
  createdAt: string;
}

function cellValue(t: Teacher, key: ColKey, idx: number): string {
  switch (key) {
    case 'index': return String(idx + 1);
    case 'photo': return t.photoUrl ? 'មានរូប' : 'គ្មានរូប';
    case 'gender': return t.gender === 'M' ? 'ប្រុស' : t.gender === 'F' ? 'ស្រី' : '—';
    case 'createdAt': return new Date(t.createdAt).toLocaleDateString('km-KH', { year: 'numeric', month: 'short', day: 'numeric' });
    default: return (t as any)[key] ?? '—';
  }
}

interface Props {
  teachers: Teacher[];
  onClose: () => void;
}

export default function ExportModal({ teachers, onClose }: Props) {
  const [leftLine1, setLeftLine1] = useState('មន្ទីរធម្មការនិងសាសនាខេត្ត');
  const [leftLine2, setLeftLine2] = useState('ភ្នំពេញ');
  const [leftLine3, setLeftLine3] = useState('សាលា ព.អ.វិ.ស.ច.ន.រ.');

  const [rightLine1, setRightLine1] = useState('ព្រះរាជាណាចក្រកម្ពុជា');
  const [rightLine2, setRightLine2] = useState('ជាតិ សាសនា ព្រះមហាក្សត្រ');
  const [rightLine3, setRightLine3] = useState('');

  
  const [mainTitle, setMainTitle] = useState('បញ្ជីឈ្មោះគ្រូបង្រៀនសរុប');
  const [subTitle, setSubTitle] = useState('នៃសាលាពុទ្ធិកអនុវិទ្យាល័យ សម្ដេចព្រះមហាសង្ឃរាជ បួរ គ្រី');
  const [logoUrl, setLogoUrl] = useState<string>('');

  const [signPlace, setSignPlace] = useState('រាជធានីភ្នំពេញ');
  const [autoLunarDate, setAutoLunarDate] = useState('ថ្ងៃ.......................ខែ.......................ឆ្នាំ....................... ព.ស.២៥......');
  const [autoSolarDate, setAutoSolarDate] = useState('ថ្ងៃទី...........ខែ...........ឆ្នាំ២០២...');
  const [signLeftRole, setSignLeftRole] = useState('ព្រះនាយកសាលា');
  const [signRightRole, setSignRightRole] = useState('ប្រធានថ្នាក់');

  const [selectedCols, setSelectedCols] = useState<ColKey[]>(COLUMNS.map(c => c.key));
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [chatId, setChatId] = useState('');
  const [tgSending, setTgSending] = useState(false);
  const [tgStatus, setTgStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [tgError, setTgError] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('exportSettings_teachers');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.leftLine1 !== undefined) setLeftLine1(data.leftLine1);
        if (data.leftLine2 !== undefined) setLeftLine2(data.leftLine2);
        if (data.leftLine3 !== undefined) setLeftLine3(data.leftLine3);
        if (data.rightLine1 !== undefined) setRightLine1(data.rightLine1);
        if (data.rightLine2 !== undefined) setRightLine2(data.rightLine2);
        if (data.rightLine3 !== undefined) setRightLine3(data.rightLine3);
        if (data.mainTitle !== undefined) setMainTitle(data.mainTitle);
        if (data.subTitle !== undefined) setSubTitle(data.subTitle);
        if (data.logoUrl !== undefined) setLogoUrl(data.logoUrl);
        if (data.logoUrl !== undefined) setLogoUrl(data.logoUrl);
        if (data.signPlace !== undefined) setSignPlace(data.signPlace);
        if (data.signLeftRole !== undefined) setSignLeftRole(data.signLeftRole);
        if (data.signRightRole !== undefined) setSignRightRole(data.signRightRole);
        else if (data.signRole !== undefined) setSignRightRole(data.signRole);
        if (data.selectedCols !== undefined) setSelectedCols(data.selectedCols);
        if (data.autoLunarDate !== undefined) setAutoLunarDate(data.autoLunarDate);
        if (data.autoSolarDate !== undefined) setAutoSolarDate(data.autoSolarDate);
      } catch (e) { }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const data = {
      leftLine1, leftLine2, leftLine3,
      rightLine1, rightLine2, rightLine3,
      mainTitle, subTitle,
      logoUrl,
      signPlace, signLeftRole, signRightRole,
      selectedCols, autoLunarDate, autoSolarDate
    };
    localStorage.setItem('exportSettings_teachers', JSON.stringify(data));
  }, [loaded, leftLine1, leftLine2, leftLine3, rightLine1, rightLine2, rightLine3, mainTitle, subTitle, logoUrl, signPlace, signLeftRole, signRightRole, selectedCols, autoLunarDate, autoSolarDate]);

  useEffect(() => {
    // Only auto-generate if it's the default value (meaning nothing was loaded from localStorage)
    if (autoLunarDate.includes('.......................')) {
      import('khmer-chhankitek-calendar').then((m) => {
        try {
          const lunar = m.toKhmerLunarDate(new Date());
          setAutoLunarDate(lunar.lunarDateText);
          setAutoSolarDate(lunar.gregorianDateText);
        } catch (e) { }
      }).catch(console.error);
    }
  }, []);

  const activeCols = COLUMNS.filter(c => selectedCols.includes(c.key));

  const toggleCol = (key: ColKey) => {
    setSelectedCols(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLogoUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const buildAoa = () => [
    [leftLine1, '', rightLine1],
    [leftLine2, '', rightLine2],
    [leftLine3, '', ''],
    [],
    ['', mainTitle, ''],
    ['', subTitle, ''],
    [],
    activeCols.map(c => c.label),
    ...teachers.map((s, i) => activeCols.map(c => cellValue(s, c.key, i))),
    [],
    ['សរុបអ្នកចូលរួម៖ ' + teachers.length + ' នាក់'],
    [],
    [autoLunarDate, '', autoLunarDate],
    [`${signPlace}, ${autoSolarDate}`, '', `${signPlace}, ${autoSolarDate}`],
    ['បានឃើញ និងឯកភាព', '', ''],
    ['', '', ''],
    [signLeftRole, '', signRightRole]
  ];

  const handlePrint = () => window.print();

  const handleExcel = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet(buildAoa());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Teachers');
    XLSX.writeFile(wb, 'teachers.xlsx');
  };

  const handlePdf = async () => {
    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('export-print-area');
      if (!element) return;
      
      element.classList.add(styles.pdfMode);

      const opt = {
        margin:       0, // Handled by CSS padding
        filename:     'teachers.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, windowWidth: 794 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'], avoid: 'tr' }
      };

      await html2pdf().set(opt as any).from(element).save();
    } catch (e) {
      console.error('Failed to generate PDF', e);
    } finally {
      const element = document.getElementById('export-print-area');
      if (element) element.classList.remove(styles.pdfMode);
    }
  };

  const handleDocx = async () => {
    const {
      Document, Paragraph, Table, TableRow, TableCell,
      Packer, TextRun, WidthType, AlignmentType,
    } = await import('docx');

    const headerParas = [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rightLine1, bold: true, size: 24 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rightLine2, bold: true, size: 20 })] }),
      new Paragraph({ text: '' }),
      new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: leftLine1, bold: true, size: 20 })] }),
      new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: leftLine2, size: 20 })] }),
      new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: leftLine3, size: 20 })] }),
      new Paragraph({ text: '' }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: mainTitle, bold: true, size: 26 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: subTitle, size: 22 })] }),
      new Paragraph({ text: '' }),
    ];

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: activeCols.map(c =>
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c.label, bold: true })] })] })
          ),
        }),
        ...teachers.map((s, i) =>
          new TableRow({
            children: activeCols.map(c =>
              new TableCell({ children: [new Paragraph({ text: cellValue(s, c.key, i) })] })
            ),
          })
        ),
      ],
    });

    const doc = new Document({ sections: [{ children: [...headerParas, table] }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'teachers.docx';
    a.click();
  };

  const handleTelegram = async () => {
    setTgSending(true);
    setTgStatus('idle');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const element = document.getElementById('export-print-area');
      if (!element) throw new Error('Preview element not found');

      element.classList.add(styles.pdfMode);
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, windowWidth: 794 });
      
      element.classList.remove(styles.pdfMode);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to generate image'));
        }, 'image/png');
      });

      const fd = new FormData();
      fd.append('file', blob);
      fd.append('filename', 'teachers.png');
      fd.append('chatId', chatId.trim());
      
      const fullCaption = `📄 ${mainTitle}\n${subTitle}\n\n👥 គ្រូសរុប: ${teachers.length} នាក់\n📅 កាលបរិច្ឆេទផ្ញើ: ${new Date().toLocaleString('km-KH')}`;
      fd.append('caption', fullCaption);

      const res = await fetch('/api/export/telegram', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'បរាជ័យក្នុងការផ្ញើ');
      }
      
      setTgStatus('ok');
    } catch (err: any) {
      setTgError(err.message);
      setTgStatus('error');
    } finally {
      setTgSending(false);
    }
  };

  if (!loaded) {
    if (typeof document === 'undefined') return null;
    return createPortal(
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', zIndex: 999999 }}>
        <div style={{ background: '#fff', padding: '30px 50px', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: '#475569', fontSize: '0.95rem', fontWeight: 500 }}>កំពុងរៀបចំទម្រង់...</span>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <>
      {/* ── Print-only area ── */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { background: #fff !important; margin: 0; padding: 0; }
          body > :not(#export-print-area) { display: none !important; }
          #export-print-area { display: block !important; background: #fff; color: #000; padding: 10mm; width: 100%; box-sizing: border-box; }
        }
        #export-print-area { display: none; }
      `}</style>
      {loaded && typeof document !== 'undefined' && createPortal(
        <div id="export-print-area">
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ textAlign: 'center', minWidth: 250, color: '#050A59' }}>
                <div style={{ fontFamily: '"Moul", "Khmer OS Muol Light", "Khmer OS Muol"', fontSize: '1.1em' }}>{leftLine1}</div>
                <div style={{ fontFamily: '"Moul", "Khmer OS Muol Light", "Khmer OS Muol"', fontSize: '1em', marginTop: 4 }}>{leftLine2}</div>
                <div style={{ fontFamily: '"Moul", "Khmer OS Muol Light", "Khmer OS Muol"', fontSize: '1em', marginTop: 4 }}>{leftLine3}</div>
              </div>

              {logoUrl && (
                <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 30 }}>
                  <img src={logoUrl} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain' }} />
                </div>
              )}

              <div style={{ textAlign: 'center', minWidth: 250, color: '#050A59' }}>
                <div style={{ fontFamily: '"Moul", "Khmer OS Muol Light", "Khmer OS Muol"', fontSize: '1.2em' }}>{rightLine1}</div>
                <div style={{ fontFamily: '"Moul", "Khmer OS Muol Light", "Khmer OS Muol"', fontSize: '1.1em', marginTop: 4 }}>{rightLine2}</div>
                {rightLine3 && <div style={{ fontFamily: 'Tacteing, Tacteng, "Khmer OS Tacteng"', fontSize: '1.5em', marginTop: 8 }}>{rightLine3}</div>}
              </div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 24, color: '#000691' }}>
              <div style={{ fontFamily: '"Moul", "Khmer OS Muol Light", "Khmer OS Muol"', fontSize: '1.3em' }}>{mainTitle}</div>
              <div style={{ fontFamily: '"Moul", "Khmer OS Muol Light", "Khmer OS Muol"', fontSize: '1.1em', marginTop: 4 }}>{subTitle}</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em' }}>
            <thead>
              <tr>
                {activeCols.map(c => (
                  <th key={c.key} style={{ border: '1px solid #333', padding: '6px 8px', background: '#eee', textAlign: 'left', color: '#000691' }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachers.map((s, i) => (
                <tr key={s.id}>
                  {activeCols.map(c => (
                    <td key={c.key} style={{ border: '1px solid #333', padding: '6px 8px', textAlign: c.key === 'photo' ? 'center' : 'left', verticalAlign: 'middle', color: '#000691' }}>
                      {c.key === 'photo' ? (
                        s.photoUrl ? (
                          <img src={s.photoUrl} alt="profile" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, display: 'block', margin: '0 auto' }} />
                        ) : '—'
                      ) : (
                        cellValue(s, c.key, i)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td colSpan={activeCols.length} style={{ border: 'none', padding: 0 }}>
                  <div style={{ fontSize: '0.85em', marginTop: 16, fontFamily: 'var(--font-battambang), "Khmer OS Battambang"', color: 'var(--color-primary, #2563eb)' }}>
                    <p style={{ margin: '0 0 4px' }}>សរុប <strong>{teachers.length}</strong> នាក់</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingBottom: 20, color: '#000691', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}>
                    <div style={{ textAlign: 'center', minWidth: 200, fontSize: '0.9em', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}>
                      <p style={{ margin: '0 0 4px', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}>{autoLunarDate}</p>
                      <p style={{ margin: '0 0 4px', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}>{signPlace}, {autoSolarDate}</p>
                      <p style={{ margin: '0 0 20px', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}>បានឃើញ និងឯកភាព</p>
                      <p style={{ margin: '0', fontFamily: 'var(--font-moul), "Khmer OS Muol Light", "Khmer OS Muol"', whiteSpace: 'pre-wrap' }}>{signLeftRole}</p>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 200, fontSize: '0.9em', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}>
                      <p style={{ margin: '0 0 4px', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}>{autoLunarDate}</p>
                      <p style={{ margin: '0 0 4px', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}>{signPlace}, {autoSolarDate}</p>
                      <p style={{ margin: '0 0 20px', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}></p>
                      <p style={{ margin: '0', fontFamily: 'var(--font-moul), "Khmer OS Muol Light", "Khmer OS Muol"', whiteSpace: 'pre-wrap' }}>{signRightRole}</p>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>,
        document.body
      )}

      {/* ── Modal ── */}
      {typeof document !== 'undefined' && createPortal(
        <div className={styles.modalOverlay} onClick={onClose}>
          <div className={styles.exportModal} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className={styles.exportModalHeader}>
              <div className={styles.exportModalHeaderLeft}>
                <span style={{ fontSize: '1.4rem' }}>📤</span>
              <div>
                <h3>មើលរបាយការណ៍ និង នាំចេញទិន្នន័យ</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  គ្រូសរុប៖ {teachers.length} នាក់
                </span>
              </div>
            </div>

            <div className={styles.exportModalHeaderRight}>
              <button
                className={styles.exportHeaderBtn}
                onClick={() => setShowSettings(!showSettings)}
                style={{ background: showSettings ? '#f1f5f9' : '#fff' }}
              >
                ✏️ កំណត់ក្បាលឯកសារ
              </button>
              <button className={styles.exportHeaderBtn} onClick={handlePrint}>
                🖨️ បោះពុម្ព
              </button>
              <button className={styles.exportHeaderBtn} onClick={handlePrint} style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                📄 PDF
              </button>
              <button className={styles.exportHeaderBtn} onClick={handleDocx} style={{ color: '#3b82f6', borderColor: '#3b82f6' }}>
                📄 Word
              </button>
              <button className={styles.exportHeaderBtn} onClick={handleExcel} style={{ color: '#10b981', borderColor: '#10b981' }}>
                📊 Excel
              </button>
              <button
                className={styles.exportHeaderBtn}
                onClick={handleTelegram}
                disabled={tgSending}
                style={{ color: '#0ea5e9', borderColor: '#0ea5e9', opacity: tgSending ? 0.7 : 1 }}
              >
                {tgSending ? 'កំពុងផ្ញើ...' : tgStatus === 'ok' ? '✓ បានផ្ញើ' : tgStatus === 'error' ? '✗ បរាជ័យ' : '✈️ Telegram'}
              </button>
              <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', margin: '0 4px' }} />
              <button className={styles.closeBtn} onClick={onClose}>✕</button>
            </div>
          </div>

          {/* Body: settings + preview */}
          <div className={styles.exportBody}>

            {/* Settings Modal (Overlay inside Modal) */}
            {showSettings && (
              <div className={styles.modalOverlay} onClick={() => setShowSettings(false)} style={{ zIndex: 100 }}>
                <div className={styles.settingsModalCard} onClick={e => e.stopPropagation()}>
                  <div className={styles.settingsModalHeader}>
                    <div>
                      <h3>កំណត់ក្បាលឯកសារ (Header Settings)</h3>
                      <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>ផ្លាស់ប្ដូរអត្ថបទសម្រាប់ក្បាលខាងលើ និងចំណងជើង</p>
                    </div>
                    <button className={styles.closeBtn} onClick={() => setShowSettings(false)}>✕</button>
                  </div>

                  <div className={styles.settingsModalBody}>
                    <div className={styles.settingsRow}>
                      {/* Left Org */}
                      <div className={styles.settingsSection}>
                        <label style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>អង្គភាពឆ្វេង</label>
                        <div>
                          <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>ជួរទី១</label>
                          <input className={styles.input} value={leftLine1} onChange={e => setLeftLine1(e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>ជួរទី២</label>
                          <input className={styles.input} value={leftLine2} onChange={e => setLeftLine2(e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>ជួរទី៣</label>
                          <input className={styles.input} value={leftLine3} onChange={e => setLeftLine3(e.target.value)} />
                        </div>
                      </div>

                      {/* Right Org */}
                      <div className={styles.settingsSection}>
                        <label style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>អង្គភាពស្ដាំ</label>
                        <div>
                          <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>ជួរទី១</label>
                          <input className={styles.input} value={rightLine1} onChange={e => setRightLine1(e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>ជួរទី២</label>
                          <input className={styles.input} value={rightLine2} onChange={e => setRightLine2(e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>ជួរទី៣ (បញ្ចូលនិមិត្តសញ្ញា)</label>
                          <input className={styles.input} style={{ fontFamily: 'Tacteing, Tacteng, "Khmer OS Tacteng"', fontSize: '1.2rem' }} value={rightLine3} onChange={e => setRightLine3(e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div className={styles.settingsSection}>
                      <label style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>ឡូហ្គូ (Logo)</label>
                      <div style={{ marginTop: 8 }}>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className={styles.input} style={{ padding: '6px' }} />
                        {logoUrl && <button onClick={() => setLogoUrl('')} style={{ marginTop: 8, color: 'red', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>លុបឡូហ្គូ (Remove)</button>}
                      </div>
                    </div>

                    <div className={styles.settingsSection}>
                      <label style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>ចំណងជើងកណ្ដាល</label>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>ចំណងជើងធំ (ជួរទី១)</label>
                        <input className={styles.input} value={mainTitle} onChange={e => setMainTitle(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>ចំណងជើងរង (ជួរទី២)</label>
                        <input className={styles.input} value={subTitle} onChange={e => setSubTitle(e.target.value)} />
                      </div>
                    </div>

                    <div className={styles.settingsSection}>
                      <label style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>ផ្នែកខាងក្រោម (ហត្ថលេខា)</label>
                      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                        <div style={{ flex: 1 }}>
                          <h5 style={{ fontSize: '0.9rem', marginBottom: 8, borderBottom: '1px solid var(--color-border)', paddingBottom: 4, color: 'var(--color-text-primary)' }}>ខាងឆ្វេង</h5>
                          <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>តួនាទី</label>
                            <textarea className={styles.input} style={{ minHeight: 80, resize: 'vertical' }} value={signLeftRole} onChange={e => setSignLeftRole(e.target.value)} />
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <h5 style={{ fontSize: '0.9rem', marginBottom: 8, borderBottom: '1px solid var(--color-border)', paddingBottom: 4, color: 'var(--color-text-primary)' }}>ខាងស្ដាំ</h5>
                          <div style={{ marginBottom: 8 }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>ទីកន្លែងចុះហត្ថលេខា</label>
                            <input className={styles.input} value={signPlace} onChange={e => setSignPlace(e.target.value)} placeholder="ឧ. រាជធានីភ្នំពេញ" />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>តួនាទី</label>
                            <textarea className={styles.input} style={{ minHeight: 80, resize: 'vertical' }} value={signRightRole} onChange={e => setSignRightRole(e.target.value)} />
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>កាលបរិច្ឆេទចន្ទគតិ</label>
                          <input className={styles.input} value={autoLunarDate} onChange={e => setAutoLunarDate(e.target.value)} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>កាលបរិច្ឆេទសុរិយគតិ</label>
                          <input className={styles.input} value={autoSolarDate} onChange={e => setAutoSolarDate(e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div className={styles.settingsSection} style={{ marginTop: 8, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                      <label style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>ជ្រើសរើសជួរឈរ (Columns)</label>
                      <div className={styles.colToggles} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {COLUMNS.map(c => (
                          <label key={c.key} className={styles.colToggle} style={{ background: '#f8fafc', padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                            <input type="checkbox" checked={selectedCols.includes(c.key)} onChange={() => toggleCol(c.key)} />
                            <span>{c.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc', borderTop: '1px solid var(--color-border)' }}>
                    <button className={styles.exportHeaderBtn} onClick={() => setShowSettings(false)} style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}>
                      រក្សាទុក / បិទ
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Right: preview */}
            <div className={styles.exportPreview}>
              <div className={styles.previewPaper}>


                <div className={styles.previewHeaderBlock} style={{ textAlign: 'left', marginBottom: 32 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                      <div style={{ textAlign: 'center', minWidth: 250, color: '#050A59' }}>
                        <div style={{ fontFamily: '"Moul", "Khmer OS Muol Light", "Khmer OS Muol"', fontSize: '1.1em' }}>{leftLine1}</div>
                        <div style={{ fontFamily: '"Moul", "Khmer OS Muol Light", "Khmer OS Muol"', fontSize: '1em', marginTop: 4 }}>{leftLine2}</div>
                        <div style={{ fontFamily: '"Moul", "Khmer OS Muol Light", "Khmer OS Muol"', fontSize: '1em', marginTop: 4 }}>{leftLine3}</div>
                      </div>

                      {logoUrl && (
                        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 10 }}>
                          <img src={logoUrl} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain' }} />
                        </div>
                      )}

                      <div style={{ textAlign: 'center', minWidth: 250, color: '#050A59' }}>
                        <div style={{ fontFamily: '"Moul", "Khmer OS Muol Light", "Khmer OS Muol"', fontSize: '1.2em' }}>{rightLine1}</div>
                        <div style={{ fontFamily: '"Moul", "Khmer OS Muol Light", "Khmer OS Muol"', fontSize: '1.1em', marginTop: 4 }}>{rightLine2}</div>
                        {rightLine3 && <div style={{ fontFamily: 'Tacteing, Tacteng, "Khmer OS Tacteng"', fontSize: '1.5em', marginTop: 8 }}>{rightLine3}</div>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', color: '#000691' }}>
                      <div style={{ fontFamily: '"Moul", "Khmer OS Muol Light", "Khmer OS Muol"', fontSize: '1.3em' }}>{mainTitle}</div>
                      <div style={{ fontFamily: '"Moul", "Khmer OS Muol Light", "Khmer OS Muol"', fontSize: '1.1em', marginTop: 4 }}>{subTitle}</div>
                    </div>
                  </div>
                </div>

                <div className={styles.previewTableWrap}>
                  <table className={styles.previewTable}>
                    <thead>
                      <tr>
                        {activeCols.map(c => (
                          <th key={c.key}>{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map((s, i) => (
                        <tr key={s.id}>
                          {activeCols.map(c => (
                            <td key={c.key} style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', textAlign: c.key === 'photo' ? 'center' : 'left' }}>
                              {c.key === 'photo' ? (
                                s.photoUrl ? <img src={s.photoUrl} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, display: 'block', margin: '0 auto' }} /> : '—'
                              ) : (
                                cellValue(s, c.key, i)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ fontSize: '0.9em', marginTop: 16, fontFamily: 'var(--font-battambang), "Khmer OS Battambang"', color: 'var(--color-primary, #2563eb)' }}>
                  <p style={{ margin: '0 0 4px' }}>សរុប <strong>{teachers.length}</strong> នាក់</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingBottom: 40, color: 'var(--color-text-primary)', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}>
                  <div style={{ textAlign: 'center', minWidth: 200, fontSize: '0.9em', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}>
                    <p style={{ margin: '0 0 4px', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}>{autoLunarDate}</p>
                    <p style={{ margin: '0 0 4px', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}>{signPlace}, {autoSolarDate}</p>
                    <p style={{ margin: '0 0 40px', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}>បានឃើញ និងឯកភាព</p>
                    <p style={{ margin: '0', fontFamily: 'var(--font-moul), "Khmer OS Muol Light", "Khmer OS Muol"', whiteSpace: 'pre-wrap' }}>{signLeftRole}</p>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 200, fontSize: '0.9em', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}>
                    <p style={{ margin: '0 0 4px', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}>{autoLunarDate}</p>
                    <p style={{ margin: '0 0 4px', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}>{signPlace}, {autoSolarDate}</p>
                    <p style={{ margin: '0 0 40px', fontFamily: 'var(--font-battambang), "Khmer OS Battambang"' }}></p>
                    <p style={{ margin: '0', fontFamily: 'var(--font-moul), "Khmer OS Muol Light", "Khmer OS Muol"', whiteSpace: 'pre-wrap' }}>{signRightRole}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
