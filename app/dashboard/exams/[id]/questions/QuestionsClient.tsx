'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from '../../../students/students.module.css';

export default function QuestionsClient({ exam }: { exam: any }) {
  const [questions, setQuestions] = useState<any[]>(exam.questions || []);
  const [modal, setModal] = useState(false);
  
  const isTypingCourse = exam.course?.name?.toLowerCase().includes('typing');

  const EMPTY = {
    id: '',
    text: '',
    type: isTypingCourse ? 'TYPING' : 'SINGLE',
    options: ['ជម្រើសទី១', 'ជម្រើសទី២'],
    correctAnswer: [] as string[],
    timeLimitSeconds: 60,
    points: 10,
    typingLang: 'BOTH',
    typingMode: 'AUTO',
    typingLength: 50,
    typingCustomText: ''
  };

  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<any | null>(null);
  const [importModal, setImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [reordering, setReordering] = useState(false);

  const [timeUnit, setTimeUnit] = useState('SECONDS');
  const [timeValue, setTimeValue] = useState(60);

  const handleTimeChange = (v: number, u: string) => {
    let s = v;
    if (u === 'MINUTES') s = v * 60;
    if (u === 'HOURS') s = v * 3600;
    setForm(prev => ({ ...prev, timeLimitSeconds: s }));
    setTimeValue(v);
    setTimeUnit(u);
  };

  const handleGenerateText = useCallback(() => {
    const khmerWords = [
      'សួស្តី', 'កម្ពុជា', 'សាលា', 'រៀន', 'សរសេរ', 'អាន', 'គណិតវិទ្យា', 'វិទ្យាសាស្ត្រ', 
      'គ្រូបង្រៀន', 'សិស្ស', 'សៀវភៅ', 'ប៊ិច', 'តុ', 'កៅអី', 'ថ្នាក់រៀន', 'ប្រឡង', 
      'កុំព្យូទ័រ', 'បច្ចេកវិទ្យា', 'ចំណេះដឹង', 'អនាគត', 'ការងារ', 'ជោគជ័យ', 'ព្យាយាម',
      'អត់ធ្មត់', 'វិន័យ', 'សីលធម៌', 'បញ្ញា', 'សុខភាព', 'កីឡា', 'សិល្បៈ', 'វប្បធម៌'
    ];
    const englishWords = ['school', 'cambodia', 'student', 'teacher', 'knowledge', 'book', 'pen', 'table', 'whiteboard', 'friend', 'study', 'computer', 'typing', 'future', 'light', 'success', 'effort', 'nation', 'technology', 'happiness', 'peace', 'development', 'love', 'smart', 'world'];

    let source = [];
    if (form.typingLang === 'ENGLISH') source = englishWords;
    else if (form.typingLang === 'KHMER') source = khmerWords;
    else source = [...khmerWords, ...englishWords];

    let result = [];
    for (let i = 0; i < form.typingLength; i++) {
      const w = source[Math.floor(Math.random() * source.length)];
      result.push(w);
    }
    setForm(prev => ({ ...prev, typingCustomText: result.join(' ') }));
  }, [form.typingLang, form.typingLength]);

  // Auto-generate text when in AUTO mode and typing options change
  useEffect(() => {
    if (modal && form.type === 'TYPING' && form.typingMode === 'AUTO') {
      handleGenerateText();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, form.type, form.typingMode, form.typingLang, form.typingLength]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(questions.length / itemsPerPage);
  const paginatedQuestions = questions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openAdd = () => {
    let defaults = EMPTY;
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('exam_question_defaults');
        if (saved) {
          const parsed = JSON.parse(saved);
          defaults = {
            ...EMPTY,
            type: isTypingCourse ? 'TYPING' : (parsed.type || EMPTY.type),
            timeLimitSeconds: parsed.timeLimitSeconds || EMPTY.timeLimitSeconds,
            points: parsed.points || EMPTY.points,
            options: (isTypingCourse || parsed.type === 'TYPING') ? [] : (Array.isArray(parsed.options) ? parsed.options : EMPTY.options)
          };
        }
      }
    } catch (e) {}
    
    // Sync timeUnit and timeValue
    let tVal = defaults.timeLimitSeconds, tUnit = 'SECONDS';
    if (defaults.timeLimitSeconds % 3600 === 0 && defaults.timeLimitSeconds >= 3600) {
      tUnit = 'HOURS'; tVal = defaults.timeLimitSeconds / 3600;
    } else if (defaults.timeLimitSeconds % 60 === 0 && defaults.timeLimitSeconds >= 60) {
      tUnit = 'MINUTES'; tVal = defaults.timeLimitSeconds / 60;
    }
    setTimeValue(tVal); setTimeUnit(tUnit);

    setForm(defaults);
    setModal(true);
  };
  
  const openEdit = (q: any) => {
    let parsedOpts = [];
    let parsedAns = [];
    try { parsedOpts = JSON.parse(q.options); } catch { parsedOpts = [q.options]; }
    try { parsedAns = JSON.parse(q.correctAnswer).map(String); } catch { parsedAns = [q.correctAnswer]; }
    
    let tLang = 'BOTH', tMode = 'AUTO', tLen = 50, tCustom = '';
    if (q.type === 'TYPING') {
      try {
        const tConf = JSON.parse(q.options);
        tLang = tConf.lang || 'BOTH';
        tMode = tConf.mode || 'AUTO';
        tLen = tConf.wordCount || 50;
        tCustom = q.correctAnswer || '';
      } catch (e) {}
    }

    setForm({
      id: q.id,
      text: q.text,
      type: isTypingCourse ? 'TYPING' : q.type,
      options: (isTypingCourse || q.type === 'TYPING') ? [] : parsedOpts,
      correctAnswer: (isTypingCourse || q.type === 'TYPING') ? [] : parsedAns,
      timeLimitSeconds: q.timeLimitSeconds,
      points: q.points,
      typingLang: tLang,
      typingMode: tMode,
      typingLength: tLen,
      typingCustomText: tCustom
    });
    
    let tVal = q.timeLimitSeconds, tUnit = 'SECONDS';
    if (q.timeLimitSeconds % 3600 === 0 && q.timeLimitSeconds >= 3600) {
      tUnit = 'HOURS'; tVal = q.timeLimitSeconds / 3600;
    } else if (q.timeLimitSeconds % 60 === 0 && q.timeLimitSeconds >= 60) {
      tUnit = 'MINUTES'; tVal = q.timeLimitSeconds / 60;
    }
    setTimeValue(tVal); setTimeUnit(tUnit);
    
    setModal(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    
    // Check for duplicates
    const duplicate = questions.find(q => q.text.trim().toLowerCase() === form.text.trim().toLowerCase() && q.id !== form.id);
    if (duplicate) {
      alert('សំណួរនេះមានរួចហើយនៅក្នុងបញ្ជី! សូមបញ្ចូលសំណួរផ្សេងទៀត។');
      return;
    }

    setSubmitting(true);
    
    try {
      const isTyping = form.type === 'TYPING';
      const payload = {
        ...form,
        options: isTyping ? JSON.stringify({ lang: form.typingLang, mode: form.typingMode, wordCount: form.typingLength }) : JSON.stringify(form.options),
        correctAnswer: isTyping ? form.typingCustomText : JSON.stringify(form.correctAnswer)
      };

      const url = form.id ? `/api/exams/${exam.id}/questions/${form.id}` : `/api/exams/${exam.id}/questions`;
      const res = await fetch(url, {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Save defaults to localStorage for future questions
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('exam_question_defaults', JSON.stringify({
            type: form.type,
            timeLimitSeconds: form.timeLimitSeconds,
            points: form.points,
            options: form.options
          }));
        }
      } catch (e) {}

      const addAnother = (ev.nativeEvent as any).submitter?.name === 'addAnother';

      if (form.id) {
        setQuestions(prev => prev.map(q => q.id === form.id ? data : q));
        setModal(false);
      } else {
        setQuestions(prev => [...prev, data]);
        if (addAnother) {
          setForm(prev => ({
            ...prev,
            id: '',
            text: '',
            correctAnswer: []
          }));
        } else {
          setModal(false);
        }
      }
    } catch (err: any) {
      alert(err.message || 'មានបញ្ហាកើតឡើង');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/exams/${exam.id}/questions/${deleteTarget}`, { method: 'DELETE' });
      if (res.ok) {
        setQuestions(prev => prev.filter(q => q.id !== deleteTarget));
      }
    } finally {
      setDeleteTarget(null);
    }
  };

  const moveQuestion = async (questionId: string, direction: 'up' | 'down') => {
    if (reordering) return;
    const index = questions.findIndex(q => q.id === questionId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= questions.length) return;

    const previous = questions;
    const reordered = [...questions];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setQuestions(reordered);
    setReordering(true);

    try {
      const res = await fetch(`/api/exams/${exam.id}/questions/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: reordered.map(q => q.id) })
      });
      if (res.ok) {
        setQuestions(await res.json());
      } else {
        setQuestions(previous);
      }
    } catch (err) {
      setQuestions(previous);
    } finally {
      setReordering(false);
    }
  };

  const updateOption = (index: number, val: string) => {
    const newOpts = [...form.options];
    newOpts[index] = val;
    setForm({ ...form, options: newOpts });
  };

  const addOption = () => setForm({ ...form, options: [...form.options, ''] });
  const removeOption = (index: number) => {
    const newOpts = form.options.filter((_, i) => i !== index);
    const newAns = form.correctAnswer.filter(a => a !== String(index));
    setForm({ ...form, options: newOpts, correctAnswer: newAns });
  };

  const toggleCorrect = (index: string) => {
    if (form.type === 'SINGLE') {
      setForm({ ...form, correctAnswer: [index] });
    } else {
      setForm(p => ({
        ...p,
        correctAnswer: p.correctAnswer.includes(index) 
          ? p.correctAnswer.filter(a => a !== index)
          : [...p.correctAnswer, index]
      }));
    }
  };

  const downloadTemplate = () => {
    const csvContent = "សំណួរ,ក,ខ,គ,ឃ,ចម្លើយត្រូវ,ម៉ោងគិតជាវិនាទី,ពិន្ទុ\n"
      + "តើប្រទេសកម្ពុជាមានខេត្ត-ក្រុងប៉ុន្មាន?,២៣,២៤,២៥,២៦,C,30,2\n"
      + "តើអង្គរវត្តស្ថិតនៅខេត្តណា?,ភ្នំពេញ,សៀមរាប,បាត់ដំបង,,B,30,2";
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "exam_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processCSVText = async (textStr: string) => {
    try {
      setSubmitting(true);
      const rows = textStr.split(/\r?\n/).filter(r => r.trim());
        
        const newQuestions = [];
        for (let i = 1; i < rows.length; i++) {
          let row = rows[i];
          const cols = [];
          let cur = '';
          let inQuote = false;
          for(let c=0; c<row.length; c++) {
            if(row[c] === '"') inQuote = !inQuote;
            else if(row[c] === ',' && !inQuote) { cols.push(cur.replace(/^"|"$/g, '')); cur=''; }
            else cur += row[c];
          }
          cols.push(cur.replace(/^"|"$/g, ''));

          if (cols.length < 8) continue;
          
          const text = cols[0].trim();
          const options = [cols[1].trim(), cols[2].trim(), cols[3].trim(), cols[4].trim()].filter(Boolean);
          const correctAnswerRaw = cols[5].trim().toUpperCase();
          const timeLimitSeconds = Number(cols[6].trim()) || 60;
          const points = Number(cols[7].trim()) || 10;
          
          const correctAnswerIndex = ['A','B','C','D'].indexOf(correctAnswerRaw);
          const correctAnswer = correctAnswerIndex !== -1 ? [String(correctAnswerIndex)] : [];

          if (text && options.length > 0) {
            newQuestions.push({
              text,
              options: JSON.stringify(options),
              correctAnswer: JSON.stringify(correctAnswer),
              timeLimitSeconds,
              points,
              type: 'SINGLE'
            });
          }
        }

        if (newQuestions.length === 0) {
          alert('ឯកសារទទេ ឬទម្រង់មិនត្រឹមត្រូវ');
          return;
        }

        // Check for duplicates
        const existingTexts = new Set(questions.map(q => q.text.trim().toLowerCase()));
        const duplicates = newQuestions.filter(q => existingTexts.has(q.text.toLowerCase()));
        if (duplicates.length > 0) {
          alert(`រកឃើញសំណួរចំនួន ${duplicates.length} ជាន់គ្នាជាមួយសំណួរដែលមានស្រាប់! សូមពិនិត្យឯកសាររបស់លោកអ្នកម្ដងទៀត។`);
          setSubmitting(false);
          return;
        }

        const res = await fetch(`/api/exams/${exam.id}/questions/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions: newQuestions })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setQuestions(data);
        alert(`បាននាំចូលសំណួរចំនួន ${newQuestions.length} ដោយជោគជ័យ!`);
        setImportModal(false);
        setImportText('');
      } catch (err: any) {
        alert(err.message || 'មានបញ្ហាក្នុងការនាំចូលសំណួរ');
      } finally {
        setSubmitting(false);
      }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const textStr = event.target?.result as string;
      await processCSVText(textStr);
      e.target.value = ''; // reset file input
    };
    reader.readAsText(file);
  };

  return (
    <div className="animate-fade-in">
      <div className={styles.pageHeader}>
        <div>
          <button onClick={() => window.location.href='/dashboard/exams'} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: 8 }}>← ត្រឡប់ក្រោយ</button>
          <h2>សំណួរ: {exam.title}</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
            សំណួរសរុប: <strong style={{ color: 'var(--color-accent)' }}>{questions.length}</strong> | 
            ពិន្ទុសរុប: <strong>{questions.reduce((sum, q) => sum + q.points, 0)}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button type="button" onClick={() => setImportModal(true)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>នាំចូលពី CSV</button>
          <button className="btn-primary" onClick={openAdd}>+ បន្ថែមសំណួរថ្មី</button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem', marginTop: '2rem' }}>
        {questions.length === 0 ? (
          <div className={styles.emptyState}>មិនទាន់មានសំណួរទេ</div>
        ) : (
          paginatedQuestions.map((q, i) => {
            const actualIndex = (currentPage - 1) * itemsPerPage + i;
            return (
            <div key={q.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.4rem', marginBottom: '1rem', color: '#050480' }}>
                  {actualIndex + 1}. {q.text}
                </div>
                <div style={{ display: 'flex', gap: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
                  <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6 }}>⏱ {q.timeLimitSeconds} វិនាទី</span>
                  <span style={{ background: '#eff6ff', padding: '4px 8px', borderRadius: 6, color: '#3b82f6' }}>⭐ {q.points} ពិន្ទុ</span>
                  <span style={{ background: q.type === 'TYPING' ? '#fdf2f8' : '#f8fafc', color: q.type === 'TYPING' ? '#db2777' : 'inherit', padding: '4px 8px', borderRadius: 6 }}>
                    {q.type === 'SINGLE' ? 'រើសបានមួយ' : q.type === 'MULTIPLE' ? 'រើសបានច្រើន' : 'វាយអត្ថបទ'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '0.25rem' }}>
                  <button className={styles.actionBtn} onClick={() => moveQuestion(q.id, 'up')} disabled={reordering || actualIndex === 0} title="ផ្លាស់ទីឡើងលើ" style={{ height: 26 }}>↑</button>
                  <button className={styles.actionBtn} onClick={() => moveQuestion(q.id, 'down')} disabled={reordering || actualIndex === questions.length - 1} title="ផ្លាស់ទីចុះក្រោម" style={{ height: 26 }}>↓</button>
                </div>
                <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => setPreviewTarget(q)} title="មើលសំណួរ">👁️</button>
                <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => openEdit(q)} title="កែប្រែ">✏️</button>
                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => setDeleteTarget(q.id)} title="លុប">🗑️</button>
              </div>
            </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            style={{ padding: '8px 16px', background: currentPage === 1 ? '#f1f5f9' : 'white', color: currentPage === 1 ? '#94a3b8' : '#3b82f6', border: '1px solid #cbd5e1', borderRadius: 8, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            ← ត្រឡប់
          </button>
          <span style={{ fontWeight: 600, color: '#475569' }}>
            ទំព័រ {currentPage} នៃ {totalPages}
          </span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
            style={{ padding: '8px 16px', background: currentPage === totalPages ? '#f1f5f9' : 'white', color: currentPage === totalPages ? '#94a3b8' : '#3b82f6', border: '1px solid #cbd5e1', borderRadius: 8, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            បន្ទាប់ →
          </button>
        </div>
      )}

      {modal && (
        <div className={styles.modalOverlay} onClick={() => !submitting && setModal(false)} style={{ display: 'flex', padding: '5vh 20px' }}>
          <div className={`glass-panel ${styles.modalCard}`} onClick={e => e.stopPropagation()} style={{ maxWidth: 800, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', margin: 'auto' }}>
            <div className={styles.modalHeader} style={{ padding: '24px 28px 16px', margin: 0, flexShrink: 0, borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0 }}>{form.id ? 'កែប្រែសំណួរ' : 'បន្ថែមសំណួរថ្មី'}</h3>
              <button className={styles.closeBtn} type="button" onClick={() => setModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.form} style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', margin: 0 }}>
              <div className={styles.formGroup}>
                <label>{isTypingCourse ? 'ឈ្មោះចំណងជើងវិញ្ញាសា *' : 'ខ្លឹមសារសំណួរ *'}</label>
                <textarea className={styles.input} required rows={isTypingCourse ? 2 : 3}
                  value={form.text} onChange={e => setForm({...form, text: e.target.value})} />
              </div>

              <div className={styles.formRow}>
                {!isTypingCourse && (
                  <div className={styles.formGroup}>
                    <label>ប្រភេទសំណួរ</label>
                    <select className={styles.input} value={form.type} onChange={e => {
                      setForm({...form, type: e.target.value, correctAnswer: []});
                    }}>
                      <option value="SINGLE">រើសបានមួយ (Single Choice)</option>
                      <option value="MULTIPLE">រើសបានច្រើន (Multiple Choice)</option>
                      <option value="TYPING">វាយអត្ថបទ (Typing Test)</option>
                    </select>
                  </div>
                )}
                <div className={styles.formGroup}>
                  <label>កំណត់ម៉ោង *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" min="1" className={styles.input} required
                      value={timeValue} onChange={e => handleTimeChange(Number(e.target.value), timeUnit)} />
                    <select className={styles.input} style={{ width: '120px' }} value={timeUnit} onChange={e => handleTimeChange(timeValue, e.target.value)}>
                      <option value="SECONDS">វិនាទី</option>
                      <option value="MINUTES">នាទី</option>
                      <option value="HOURS">ម៉ោង</option>
                    </select>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>ពិន្ទុ *</label>
                  <input type="number" step="0.5" min="1" className={styles.input} required
                    value={form.points} onChange={e => setForm({...form, points: Number(e.target.value)})} />
                </div>
              </div>

              {form.type !== 'TYPING' ? (
                <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>ជម្រើសចម្លើយ (ធីកយកចម្លើយដែលត្រឹមត្រូវ) *</span>
                    <button type="button" onClick={addOption} style={{ background: '#f1f5f9', border: 'none', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem' }}>+ បន្ថែមជម្រើស</button>
                  </label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {form.options.map((opt, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input 
                          type={form.type === 'SINGLE' ? 'radio' : 'checkbox'} 
                          checked={form.correctAnswer.includes(String(i))}
                          onChange={() => toggleCorrect(String(i))}
                          style={{ width: 20, height: 20, cursor: 'pointer' }}
                        />
                        <input type="text" className={styles.input} style={{ flex: 1 }} required
                          value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`ជម្រើសទី ${i + 1}`} />
                        {form.options.length > 2 && (
                          <button type="button" onClick={() => removeOption(i)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', width: 36, height: 36, borderRadius: 8, cursor: 'pointer' }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {form.correctAnswer.length === 0 && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>សូមជ្រើសរើសចម្លើយត្រឹមត្រូវយ៉ាងហោចណាស់១</div>}
                </div>
              ) : (
                <>
                  <div className={styles.formRow} style={{ marginTop: '1rem' }}>
                    <div className={styles.formGroup}>
                      <label>ជម្រើសភាសា *</label>
                      <select className={styles.input} value={form.typingLang} onChange={e => setForm({...form, typingLang: e.target.value})}>
                        <option value="BOTH">អង់គ្លេស និងខ្មែរ (English & Khmer)</option>
                        <option value="ENGLISH">អង់គ្លេស (English)</option>
                        <option value="KHMER">ខ្មែរ (Khmer)</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>របៀបបង្កើតពាក្យ *</label>
                      <select className={styles.input} value={form.typingMode} onChange={e => setForm({...form, typingMode: e.target.value})}>
                        <option value="AUTO">បង្កើតដោយស្វ័យប្រវត្តិ (Auto-generate)</option>
                        <option value="CUSTOM">កំណត់ខ្លួនឯង (Custom text)</option>
                      </select>
                    </div>
                    {form.typingMode === 'AUTO' && (
                      <div className={styles.formGroup}>
                        <label>ចំនួនពាក្យសរុប *</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="number" className={styles.input} min="10" max="1000" required value={form.typingLength} onChange={e => setForm({...form, typingLength: Number(e.target.value)})} />
                          <button type="button" onClick={handleGenerateText} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            បង្កើតពាក្យឥឡូវនេះ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {form.typingMode === 'CUSTOM' ? (
                    <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                      <label>អត្ថបទ ឬពាក្យសម្រាប់វាយ *</label>
                      <textarea className={styles.input} rows={4} required placeholder="បញ្ចូលអត្ថបទ ឬពាក្យនៅទីនេះ..." value={form.typingCustomText} onChange={e => setForm({...form, typingCustomText: e.target.value})} />
                    </div>
                  ) : (
                    form.typingCustomText && (
                      <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                        <label>អត្ថបទដែលបានបង្កើត (មើលមុន)៖</label>
                        <div style={{ padding: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, minHeight: '80px', fontFamily: 'monospace', fontSize: '1rem', color: '#334155' }}>
                          {form.typingCustomText}
                        </div>
                      </div>
                    )
                  )}
                </>
              )}

              <div className={styles.formActions} style={{ marginTop: '2rem' }}>
                <button type="button" className={styles.cancelBtn} onClick={() => setModal(false)}>បោះបង់</button>
                {!form.id && (
                  <button type="submit" name="addAnother" style={{ background: '#f8fafc', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '9px 18px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }} disabled={submitting || (form.type !== 'TYPING' && form.correctAnswer.length === 0)}>
                    {submitting ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក និងបន្ថែមទៀត'}
                  </button>
                )}
                <button type="submit" name="save" className="btn-primary" disabled={submitting || (form.type !== 'TYPING' && form.correctAnswer.length === 0)}>
                  {submitting ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={`glass-panel ${styles.confirmCard}`}>
            <h3 style={{ color: '#f87171' }}>⚠️ លុបសំណួរ?</h3>
            <div className={styles.formActions} style={{ marginTop: 28 }}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)}>បោះបង់</button>
              <button className="btn-primary" style={{ background: '#ef4444' }} onClick={handleDelete}>លុបចោល</button>
            </div>
          </div>
        </div>
      )}

      {previewTarget && (
        <div className={styles.modalOverlay} onClick={() => setPreviewTarget(null)} style={{ display: 'flex', padding: '5vh 20px' }}>
          <div className={`glass-panel ${styles.modalCard}`} onClick={e => e.stopPropagation()} style={{ maxWidth: 600, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', margin: 'auto' }}>
            <div className={styles.modalHeader} style={{ padding: '24px 28px 16px', margin: 0, flexShrink: 0, borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0 }}>មើលសំណួរមុន (Preview)</h3>
              <button className={styles.closeBtn} type="button" onClick={() => setPreviewTarget(null)}>✕</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#050480', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                {previewTarget.text}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(() => {
                if (previewTarget.type === 'TYPING') {
                  let conf: any = {};
                  try { conf = JSON.parse(previewTarget.options); } catch {}
                  return (
                    <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                      <div style={{ marginBottom: 10, fontSize: '0.9rem', color: '#64748b', display: 'flex', gap: '1rem' }}>
                        <span><strong>ភាសា៖</strong> {conf.lang === 'ENGLISH' ? 'អង់គ្លេស' : conf.lang === 'KHMER' ? 'ខ្មែរ' : 'អង់គ្លេស និងខ្មែរ'}</span>
                        <span><strong>របៀប៖</strong> {conf.mode === 'AUTO' ? 'បង្កើតដោយស្វ័យប្រវត្តិ' : 'កំណត់ខ្លួនឯង'}</span>
                        {conf.mode === 'AUTO' && <span><strong>ចំនួនពាក្យ៖</strong> {conf.wordCount} ពាក្យ</span>}
                      </div>
                      {conf.mode === 'CUSTOM' && (
                        <div style={{ background: '#fff', padding: '12px', border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'monospace', fontSize: '1rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {previewTarget.correctAnswer}
                        </div>
                      )}
                      {conf.mode === 'AUTO' && (
                        <div style={{ background: '#fff', padding: '12px', border: '1px dashed #cbd5e1', borderRadius: 8, textAlign: 'left', color: '#475569', fontStyle: 'italic', fontFamily: 'monospace' }}>
                          {previewTarget.correctAnswer || '(សូមចុច "កែប្រែ" ដើម្បីបង្កើតពាក្យ)'}
                        </div>
                      )}
                    </div>
                  );
                }

                let opts = [];
                let correctAns = [];
                try { opts = JSON.parse(previewTarget.options); } catch { opts = [previewTarget.options]; }
                try { correctAns = JSON.parse(previewTarget.correctAnswer).map(String); } catch { correctAns = [previewTarget.correctAnswer]; }
                
                return opts.map((opt: string, i: number) => {
                  const isCorrect = correctAns.includes(String(i));
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '16px', textAlign: 'left', fontSize: '1.1rem',
                        background: isCorrect ? '#dcfce7' : '#f8fafc',
                        border: isCorrect ? '2px solid #22c55e' : '2px solid #e2e8f0',
                        borderRadius: 12, color: '#1e293b',
                        display: 'flex', alignItems: 'center'
                      }}
                    >
                      <span style={{ display: 'inline-block', width: 30, height: 30, background: isCorrect ? '#22c55e' : '#cbd5e1', color: 'white', borderRadius: previewTarget.type === 'SINGLE' ? '50%' : '8px', textAlign: 'center', lineHeight: '30px', marginRight: 12, fontSize: '0.9rem', flexShrink: 0 }}>
                        {['ក', 'ខ', 'គ', 'ឃ', 'ង', 'ច', 'ឆ', 'ជ', 'ឈ', 'ញ'][i] || String.fromCharCode(65 + i)}
                      </span>
                      <span style={{ flex: 1 }}>{opt}</span>
                      {isCorrect && <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ ចម្លើយត្រូវ</span>}
                    </div>
                  );
                });
              })()}
            </div>
            </div>
          </div>
        </div>
      )}

      {importModal && (
        <div className={styles.modalOverlay} onClick={() => !submitting && setImportModal(false)} style={{ display: 'flex', padding: '5vh 20px' }}>
          <div className={`glass-panel ${styles.modalCard}`} onClick={e => e.stopPropagation()} style={{ maxWidth: 600, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', margin: 'auto' }}>
            <div className={styles.modalHeader} style={{ padding: '24px 28px 16px', margin: 0, flexShrink: 0, borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0 }}>នាំចូលសំណួរ (Import CSV)</h3>
              <button className={styles.closeBtn} type="button" onClick={() => setImportModal(false)}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
              <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
                លោកអ្នកអាច <button type="button" onClick={downloadTemplate} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>ទាញយកគំរូ CSV (Excel)</button> រួចបំពេញទិន្នន័យ បន្ទាប់មក <strong>ចម្លង (Copy) និងដាក់បញ្ចូល (Paste)</strong> ចូលក្នុងប្រអប់ខាងក្រោមនេះ៖
              </p>

              <textarea
                style={{ width: '100%', height: 200, padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.9rem', resize: 'vertical' }}
                placeholder="សំណួរ,ក,ខ,គ,ឃ,ចម្លើយត្រូវ,ម៉ោងគិតជាវិនាទី,ពិន្ទុ..."
                value={importText}
                onChange={e => setImportText(e.target.value)}
              />

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>— ឬជ្រើសរើសឯកសារ —</span>
              </div>

              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <label style={{ display: 'inline-block', background: '#f1f5f9', border: '1px dashed #cbd5e1', color: '#475569', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, width: '100%' }}>
                  <span>{submitting ? 'កំពុងនាំចូល...' : 'ជ្រើសរើសឯកសារ .csv (Upload File)'}</span>
                  <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} disabled={submitting} />
                </label>
              </div>

              <div className={styles.formActions} style={{ marginTop: '2rem' }}>
                <button type="button" className={styles.cancelBtn} onClick={() => setImportModal(false)}>បោះបង់</button>
                <button type="button" className="btn-primary" onClick={() => processCSVText(importText)} disabled={submitting || !importText.trim()}>
                  {submitting ? 'កំពុងនាំចូល...' : 'បញ្ជាក់ការនាំចូល'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
