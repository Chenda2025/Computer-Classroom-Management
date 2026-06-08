'use client';

import { createPortal } from 'react-dom';
import styles from '../students/students.module.css';
import type { ExamResultRow } from './ExamReportsClient';

const COLUMNS = ['#', 'លេខកូដ', 'ឈ្មោះ', 'ប្រឡង', 'វគ្គសិក្សា', 'ពិន្ទុ', 'លទ្ធផល', 'វគ្គបន្ទាប់', 'ថ្ងៃប្រឡង'];

function rowValues(r: ExamResultRow, i: number): string[] {
  const passed = r.score >= r.exam.passingScore;
  return [
    String(i + 1),
    r.student.studentCode,
    r.student.name,
    r.exam.title,
    r.exam.course.name,
    String(r.score),
    passed ? 'ជាប់' : 'ធ្លាក់',
    r.promoted ? 'បានបន្តវគ្គ' : '—',
    new Date(r.createdAt).toLocaleDateString('km-KH', { year: 'numeric', month: 'short', day: 'numeric' }),
  ];
}

interface Props {
  results: ExamResultRow[];
  onClose: () => void;
}

export default function ExportModal({ results, onClose }: Props) {
  const handlePrint = () => window.print();

  const handleExcel = async () => {
    const XLSX = await import('xlsx');
    const aoa = [COLUMNS, ...results.map((r, i) => rowValues(r, i))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, 'exam_reports.xlsx');
  };

  const handleDocx = async () => {
    const { Document, Paragraph, Table, TableRow, TableCell, Packer, TextRun, WidthType, AlignmentType } = await import('docx');

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: COLUMNS.map(c => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c, bold: true })] })] })),
        }),
        ...results.map((r, i) =>
          new TableRow({
            children: rowValues(r, i).map(v => new TableCell({ children: [new Paragraph({ text: v })] })),
          })
        ),
      ],
    });

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'របាយការណ៍ប្រឡង', bold: true, size: 28 })] }),
          new Paragraph({ text: '' }),
          table,
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'exam_reports.docx';
    a.click();
  };

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { background: #fff !important; }
          body > :not(#exam-report-print-area) { display: none !important; }
          #exam-report-print-area { display: block !important; background: #fff; color: #000; }
        }
        #exam-report-print-area { display: none; }
      `}</style>
      {typeof document !== 'undefined' && createPortal(
        <div id="exam-report-print-area">
          <h2 style={{ textAlign: 'center', color: '#000691' }}>របាយការណ៍ប្រឡង</h2>
          <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.85em' }}>សរុប {results.length} លទ្ធផល • {new Date().toLocaleDateString('km-KH')}</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em', marginTop: 16 }}>
            <thead>
              <tr>{COLUMNS.map(c => <th key={c} style={{ border: '1px solid #333', padding: '6px 8px', background: '#eee', textAlign: 'left' }}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.id}>
                  {rowValues(r, i).map((v, j) => <td key={j} style={{ border: '1px solid #333', padding: '6px 8px' }}>{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
        document.body
      )}

      {typeof document !== 'undefined' && createPortal(
        <div className={styles.modalOverlay} onClick={onClose}>
          <div className={`glass-panel ${styles.modalCard}`} onClick={e => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className={styles.modalHeader}>
              <h3>📤 នាំចេញរបាយការណ៍ប្រឡង</h3>
              <button className={styles.closeBtn} onClick={onClose}>✕</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
                សរុប <strong style={{ color: 'var(--color-accent)' }}>{results.length}</strong> លទ្ធផល — ជ្រើសរើសទម្រង់ដែលចង់ទាញយក
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn-secondary" onClick={handlePrint}>🖨️ បោះពុម្ព / PDF</button>
                <button className="btn-secondary" onClick={handleDocx} style={{ color: '#3b82f6', borderColor: '#3b82f6' }}>📄 Word</button>
                <button className="btn-secondary" onClick={handleExcel} style={{ color: '#10b981', borderColor: '#10b981' }}>📊 Excel</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
