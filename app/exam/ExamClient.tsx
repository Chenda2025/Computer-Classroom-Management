'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ExamClient() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [step, setStep] = useState<'JOIN' | 'LOBBY' | 'EXAM' | 'RESULTS'>('JOIN');
  const [examCode, setExamCode] = useState(initialCode);
  const [studentCode, setStudentCode] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [participationId, setParticipationId] = useState<string | null>(null);
  const [examData, setExamData] = useState<any>(null);
  const [participationStatus, setParticipationStatus] = useState('');
  
  // Exam Player State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);

  // Review state
  const [reviewData, setReviewData] = useState<any>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('exam_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.participationId && parsed.examCode === initialCode) {
          setParticipationId(parsed.participationId);
          if (parsed.currentQuestionIndex !== undefined) setCurrentQuestionIndex(parsed.currentQuestionIndex);
          if (parsed.score !== undefined) setScore(parsed.score);
          setStep('LOBBY'); // Let the poller figure out the real state
        }
      } catch (e) {}
    }
  }, [initialCode]);



  const handleJoin = async (e?: any) => {
    if (e && typeof e.preventDefault === 'function') {
      try { e.preventDefault(); } catch (err) {}
    }
    alert('👉 ប៊ូតុងបានចុចហើយ! កំពុងដំណើរការ...');


    if (!examCode?.trim() || !studentCode?.trim()) {
      alert('សូមបញ្ចូលលេខកូដប្រឡង និងលេខកូដសិស្ស');
      setError('សូមបញ្ចូលលេខកូដប្រឡង និងលេខកូដសិស្ស');
      return;
    }
    
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/exam/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examCode: examCode?.trim()?.toUpperCase() || '', studentCode: studentCode?.trim() || '' })
      });
      const data = await res.json().catch(() => ({ error: 'បញ្ហាបច្ចេកទេស (Network/Server Error)' }));
      if (!res.ok) throw new Error(data.error || 'លេខកូដប្រឡង ឬលេខកូដសិស្សមិនត្រឹមត្រូវ');

      setParticipationId(data.participation.id);
      localStorage.setItem('exam_session', JSON.stringify({
        participationId: data.participation.id,
        examCode
      }));
      setStep('LOBBY');
    } catch (err: any) {
      alert(err.message || 'មានបញ្ហាមិនស្គាល់ (Unknown Error)');
      setError(err.message || 'មានបញ្ហាមិនស្គាល់ (Unknown Error)');
    } finally {
      setLoading(false);
    }
  };

  // Poll Lobby Status
  useEffect(() => {
    if ((step !== 'LOBBY' && step !== 'EXAM') || !participationId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/exam/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participationId })
        });
        const data = await res.json();
        
        if (data.participationStatus === 'REJECTED') {
          setError('សំណើរបស់អ្នកត្រូវបានបដិសេធ។');
          localStorage.removeItem('exam_session');
          setStep('JOIN');
          return;
        }

        setParticipationStatus(data.participationStatus);
        
        if (data.sessionStatus === 'IN_PROGRESS' && data.participationStatus === 'APPROVED' && step === 'LOBBY') {
          setExamData(data.exam);
          setStep('EXAM');
          // If returning from offline, the question index is loaded from localStorage
          // Initialize timer
          const q = data.exam.questions[currentQuestionIndex];
          if (q) setTimeLeft(q.timeLimitSeconds);
        } else if (data.sessionStatus === 'COMPLETED') {
          setStep('RESULTS');
        }
      } catch (e) {}
    }, 3000);

    return () => clearInterval(interval);
  }, [step, participationId, currentQuestionIndex]);

  // Exam Timer
  useEffect(() => {
    if (step !== 'EXAM' || !examData) return;

    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, step]);

  const handleOptionToggle = (optIndex: string, type: string) => {
    if (type === 'SINGLE') {
      setSelectedOptions([optIndex]);
    } else {
      setSelectedOptions(prev => 
        prev.includes(optIndex) ? prev.filter(o => o !== optIndex) : [...prev, optIndex]
      );
    }
  };

  const handleAutoSubmit = async () => {
    if (!examData || !participationId) return;
    const q = examData.questions[currentQuestionIndex];
    if (!q) {
      setStep('RESULTS');
      return;
    }

    try {
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participationId,
          questionId: q.id,
          selectedOptions
        })
      });
      const data = await res.json();
      if (res.ok) {
        const newScore = data.totalScore;
        setScore(newScore);
        
        // Advance
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex >= examData.questions.length) {
          setStep('RESULTS');
          localStorage.removeItem('exam_session');
        } else {
          setCurrentQuestionIndex(nextIndex);
          setTimeLeft(examData.questions[nextIndex].timeLimitSeconds);
          setSelectedOptions([]);
          localStorage.setItem('exam_session', JSON.stringify({
            participationId, examCode, currentQuestionIndex: nextIndex, score: newScore
          }));
        }
      }
    } catch (e) {
      console.error(e);
      // Wait and try again or handle offline...
    }
  };

  // Auto-fetch review when entering RESULTS
  useEffect(() => {
    if (step !== 'RESULTS' || !participationId || reviewData) return;
    setReviewLoading(true);
    fetch('/api/exam/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participationId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.questions) {
          setReviewData(data);
          setShowReview(true);
        }
      })
      .catch(() => {})
      .finally(() => setReviewLoading(false));
  }, [step, participationId]);

  // UI Helpers
  const getGrade = (pct: number) => {
    if (pct < 60) return { label: 'ធ្លាក់', color: '#ef4444' };
    if (pct < 70) return { label: 'មធ្យម', color: '#f59e0b' };
    if (pct < 80) return { label: 'ល្អបង្គួរ', color: '#3b82f6' };
    if (pct < 90) return { label: 'ល្អ', color: '#8b5cf6' };
    return { label: 'ល្អណាស់', color: '#10b981' };
  };

  const scorePct = reviewData?.totalPoints > 0
    ? Math.round((score / reviewData.totalPoints) * 100)
    : score;
  const passingPct = reviewData?.passingScore ?? 60;
  const passed = scorePct >= passingPct;

  const currentQ = examData?.questions?.[currentQuestionIndex];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'var(--font-battambang), "Khmer OS Battambang", sans-serif' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: 600 }}>
        
        {step === 'JOIN' && (
          <div className="animate-fade-in">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓</div>
              <h2 style={{ color: '#1e293b' }}>ចូលរួមប្រឡងអនឡាញ</h2>
            </div>
            
            {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '1rem', borderRadius: 8, marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 'bold', border: '1px solid #fca5a5' }}>{error}</div>}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569' }}>លេខកូដប្រឡង (Exam Code)</label>
              <input type="text" value={examCode} onChange={e => setExamCode(e.target.value)} placeholder="ឧ. ABC123" style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center' }} onKeyDown={e => e.key === 'Enter' && handleJoin(e as any)} />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569' }}>លេខកូដសិស្ស (Student ID)</label>
              <input type="text" value={studentCode} onChange={e => setStudentCode(e.target.value)} placeholder="វាយលេខកូដសិស្សទីនេះ..." style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '1rem' }} onKeyDown={e => e.key === 'Enter' && handleJoin(e as any)} />
            </div>

            <button 
              type="button"
              onClick={handleJoin}
              onTouchEnd={(e) => { e.preventDefault(); handleJoin(e); }}
              disabled={loading}
              style={{ width: '100%', padding: '16px', background: loading ? '#94a3b8' : 'var(--color-accent)', color: 'white', border: 'none', borderRadius: 12, fontSize: '1.2rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', textAlign: 'center', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
            >
              {loading ? 'កំពុងភ្ជាប់...' : '👉 ចុចទីនេះដើម្បីចូលរួមប្រឡង 👈'}
            </button>
          </div>
        )}

        {step === 'LOBBY' && (
          <div className="animate-fade-in" style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>
              {participationStatus === 'PENDING' ? '⏳' : '✅'}
            </div>
            <h2 style={{ color: '#1e293b', marginBottom: '1rem' }}>
              {participationStatus === 'PENDING' ? 'កំពុងរង់ចាំគ្រូអនុញ្ញាត...' : 'បានអនុញ្ញាត! សូមរង់ចាំ...'}
            </h2>
            <p style={{ color: '#64748b', lineHeight: 1.6 }}>
              {participationStatus === 'PENDING' 
                ? 'សូមកុំទាន់បិទទំព័រនេះ។ ប្រព័ន្ធនឹងបញ្ចូលអ្នកដោយស្វ័យប្រវត្តិពេលគ្រុចុចអនុញ្ញាត។'
                : 'គ្រូបានអនុញ្ញាតហើយ។ វិញ្ញាសានឹងលោតចេញមកនៅពេលគ្រូចុចប៊ូតុង "ចាប់ផ្ដើម"។'}
            </p>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 40, height: 40, border: '4px solid #f1f5f9', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          </div>
        )}

        {step === 'EXAM' && currentQ && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div style={{ fontWeight: 600, color: '#64748b' }}>
                សំណួរ {currentQuestionIndex + 1} នៃ {examData.questions.length}
              </div>
              <div style={{ background: timeLeft <= 10 ? '#fef2f2' : '#eff6ff', color: timeLeft <= 10 ? '#ef4444' : '#3b82f6', padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                ⏱ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            </div>

            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#050480', marginBottom: '2rem', lineHeight: 1.6 }}>
              <span style={{ color: '#ef4444', marginRight: '8px' }}>សំណួរទី {currentQuestionIndex + 1}៖</span>
              {currentQ.text}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {(() => {
                let opts = [];
                try { opts = JSON.parse(currentQ.options); } catch { opts = [currentQ.options]; }
                return opts.map((opt: string, i: number) => {
                  const isSelected = selectedOptions.includes(String(i));
                  return (
                    <button
                      key={i}
                      onClick={() => handleOptionToggle(String(i), currentQ.type)}
                      style={{
                        padding: '16px', textAlign: 'left', fontSize: '1.1rem',
                        background: isSelected ? '#eff6ff' : 'white',
                        border: isSelected ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                        borderRadius: 12, cursor: 'pointer', transition: 'all 0.1s',
                        color: isSelected ? '#1e40af' : '#475569',
                        fontWeight: isSelected ? 600 : 400
                      }}
                    >
                      <span style={{ display: 'inline-block', width: 30, height: 30, background: isSelected ? '#3b82f6' : '#f1f5f9', color: isSelected ? 'white' : '#94a3b8', borderRadius: currentQ.type === 'SINGLE' ? '50%' : '8px', textAlign: 'center', lineHeight: '30px', marginRight: 12, fontSize: '0.9rem' }}>
                        {['ក', 'ខ', 'គ', 'ឃ', 'ង', 'ច', 'ឆ', 'ជ', 'ឈ', 'ញ'][i] || String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </button>
                  );
                });
              })()}
            </div>

            <button onClick={handleAutoSubmit} style={{ width: '100%', padding: '16px', background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: 12, fontSize: '1.2rem', fontWeight: 600, cursor: 'pointer' }}>
              បញ្ជូនចម្លើយ (Submit)
            </button>
          </div>
        )}

        {step === 'RESULTS' && (
          <div className="animate-fade-in" style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>
              {passed ? '🎉' : '💔'}
            </div>
            <h2 style={{ color: '#1e293b', marginBottom: '2rem', fontSize: '2rem' }}>ការប្រឡងត្រូវបានបញ្ចប់!</h2>

            <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: 16, display: 'inline-block', minWidth: 300 }}>
              <div style={{ color: '#64748b', marginBottom: '0.5rem' }}>ពិន្ទុសរុបរបស់អ្នក</div>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--color-accent)', marginBottom: '0.25rem', lineHeight: 1 }}>
                {score}{reviewData ? <span style={{ fontSize: '1.5rem', fontWeight: 500, color: '#94a3b8' }}>/{reviewData.totalPoints}</span> : null}
              </div>
              {reviewData && (
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
                  ត្រូវ {reviewData.correctCount}/{reviewData.totalQuestions} សំណួរ
                </div>
              )}
              {reviewLoading && !reviewData && (
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>⏳ កំពុងផ្ទុក...</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 4 }}>លទ្ធផល</div>
                  <div style={{ fontWeight: 700, color: passed ? '#16a34a' : '#ef4444', fontSize: '1.2rem' }}>{passed ? 'ជាប់' : 'ធ្លាក់'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 4 }}>និទ្ទេស</div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.2rem' }}>{getGrade(scorePct).label}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              {reviewData && (
                <button
                  onClick={() => setShowReview(v => !v)}
                  style={{
                    padding: '10px 22px', background: showReview ? '#f1f5f9' : '#3b82f6', color: showReview ? '#475569' : 'white',
                    border: showReview ? '2px solid #e2e8f0' : 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {showReview ? '🔼 លាក់ការពិនិត្យ' : '📋 ពិនិត្យចម្លើយ'}
                </button>
              )}
              <button onClick={() => window.location.href = '/'} style={{ background: 'white', border: '2px solid #e2e8f0', padding: '12px 24px', borderRadius: 8, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                ត្រឡប់ទៅទំព័រដើម
              </button>
            </div>

            {/* Answer Review List */}
            {showReview && reviewData && (
              <div style={{ marginTop: '2rem', textAlign: 'left', maxWidth: 700, margin: '2rem auto 0' }}>
                <h3 style={{ color: '#1e293b', marginBottom: '1rem', fontSize: '1.2rem', textAlign: 'center' }}>
                  📝 ការពិនិត្យចម្លើយ ({reviewData.correctCount}/{reviewData.totalQuestions} ត្រូវ)
                </h3>
                {reviewData.questions.map((q: any, qi: number) => (
                  <div key={q.id} style={{
                    background: q.isCorrect ? '#f0fdf4' : '#fef2f2',
                    border: `2px solid ${q.isCorrect ? '#86efac' : '#fca5a5'}`,
                    borderRadius: 12, padding: '1rem', marginBottom: '1rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                        {q.isCorrect ? '✅' : '❌'} សំណួរទី {qi + 1}
                      </div>
                      <div style={{
                        background: q.isCorrect ? '#22c55e' : '#ef4444', color: 'white',
                        padding: '2px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700
                      }}>
                        {q.earnedPoints}/{q.points} ពិន្ទុ
                      </div>
                    </div>
                    <div style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '0.8rem', lineHeight: 1.6, fontWeight: 600 }}>
                      {q.text}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {q.options.map((opt: string, i: number) => {
                        const idx = String(i);
                        const isStudentPick = q.selectedOptions.includes(idx);
                        const isCorrectAnswer = q.correctAnswer.includes(idx);
                        let bg = 'white'; let borderColor = '#e2e8f0'; let textColor = '#475569'; let icon = '';
                        if (isCorrectAnswer && isStudentPick) {
                          bg = '#dcfce7'; borderColor = '#22c55e'; textColor = '#166534'; icon = '✅';
                        } else if (isCorrectAnswer && !isStudentPick) {
                          bg = '#dbeafe'; borderColor = '#3b82f6'; textColor = '#1e40af'; icon = '🔵';
                        } else if (isStudentPick && !isCorrectAnswer) {
                          bg = '#fee2e2'; borderColor = '#ef4444'; textColor = '#991b1b'; icon = '❌';
                        }
                        return (
                          <div key={i} style={{
                            padding: '10px 14px', borderRadius: 8, fontSize: '0.95rem',
                            background: bg, border: `2px solid ${borderColor}`, color: textColor,
                            fontWeight: (isStudentPick || isCorrectAnswer) ? 600 : 400,
                            display: 'flex', alignItems: 'center', gap: 8
                          }}>
                            <span style={{
                              width: 24, height: 24, borderRadius: q.type === 'SINGLE' ? '50%' : 6,
                              background: (isStudentPick || isCorrectAnswer) ? borderColor : '#f1f5f9',
                              color: (isStudentPick || isCorrectAnswer) ? 'white' : '#94a3b8',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                            }}>
                              {['ក','ខ','គ','ឃ','ង','ច','ឆ','ជ'][i] || String.fromCharCode(65+i)}
                            </span>
                            <span style={{ flex: 1 }}>{opt}</span>
                            {icon && <span>{icon}</span>}
                          </div>
                        );
                      })}
                    </div>
                    {!q.isCorrect && (
                      <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                        🔵 = ចម្លើយត្រឹមត្រូវ &nbsp;|&nbsp; ❌ = ចម្លើយអ្នកជ្រើស (ខុស)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
