'use client';

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import styles from './admin.module.css';

interface Session {
  id: string;
  examCode: string;
  status: string;
  startedAt: string | null;
  exam: {
    title: string;
    questions: any[];
  };
  participations: {
    id: string;
    studentId: string;
    status: string;
    currentScore: number;
    student: {
      studentCode: string;
      name: string;
      photoUrl: string | null;
    };
    answers: any[];
  }[];
}

function Avatar({ photoUrl, name, small }: { photoUrl: string | null; name: string; small?: boolean }) {
  const sizeClass = small ? styles.avatarSm : '';
  if (photoUrl) {
    return <img src={photoUrl} alt="" className={`${styles.avatar} ${sizeClass}`} />;
  }
  return <div className={`${styles.avatarFallback} ${sizeClass}`}>{name.charAt(0)}</div>;
}

let globalAudioCtx: AudioContext | null = null;

const initAudio = () => {
  if (typeof window === 'undefined') return;
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {});
  }
};

const playTickSound = () => {
  try {
    initAudio();
    if (!globalAudioCtx) return;
    const osc = globalAudioCtx.createOscillator();
    const gain = globalAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, globalAudioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, globalAudioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, globalAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, globalAudioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(globalAudioCtx.destination);
    osc.start();
    osc.stop(globalAudioCtx.currentTime + 0.1);
  } catch(e) { console.error(e); }
};

const playNextSound = () => {
  try {
    initAudio();
    if (!globalAudioCtx) return;
    const osc = globalAudioCtx.createOscillator();
    const gain = globalAudioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, globalAudioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, globalAudioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, globalAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, globalAudioCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(globalAudioCtx.destination);
    osc.start();
    osc.stop(globalAudioCtx.currentTime + 0.5);
  } catch(e) { console.error(e); }
};

export default function AdminLiveExamClient({ initialSession }: { initialSession: Session }) {
  const [session, setSession] = useState<Session>(initialSession);
  const [loading, setLoading] = useState(false);
  const [projectorSlide, setProjectorSlide] = useState(0);
  const [projectorTimeLeft, setProjectorTimeLeft] = useState(-1);
  const [isPaused, setIsPaused] = useState(false);
  const [projectorTextSize, setProjectorTextSize] = useState(1.8);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewAutoAdvanceSeconds, setReviewAutoAdvanceSeconds] = useState(5);

  const [preApproveModal, setPreApproveModal] = useState(false);
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
  const [selectedEligibleIds, setSelectedEligibleIds] = useState<Set<string>>(new Set());
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [preApproveSearch, setPreApproveSearch] = useState('');

  const openPreApprove = async () => {
    setPreApproveModal(true);
    setPreApproveSearch('');
    setLoadingEligible(true);
    try {
      const res = await fetch(`/api/live-exams/${session.id}/eligible-students`);
      if (res.ok) {
        const data = await res.json();
        setEligibleStudents(data);
        setSelectedEligibleIds(new Set());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEligible(false);
    }
  };

  const filteredEligible = preApproveSearch.trim()
    ? eligibleStudents.filter(s =>
        s.name.toLowerCase().includes(preApproveSearch.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(preApproveSearch.toLowerCase())
      )
    : eligibleStudents;

  const handleBulkApprove = async () => {
    if (selectedEligibleIds.size === 0) return;
    try {
      setLoadingEligible(true);
      const res = await fetch(`/api/live-exams/${session.id}/bulk-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: Array.from(selectedEligibleIds) })
      });
      if (res.ok) {
        const newParticipations = await res.json();
        
        // Ensure we don't add duplicates
        const newIds = new Set(newParticipations.map((p: any) => p.id));
        
        setSession(prev => ({
          ...prev,
          participations: [
            ...prev.participations.filter(p => !newIds.has(p.id)), 
            ...newParticipations
          ]
        }));
        setPreApproveModal(false);
      }
    } catch (err) {
      alert('មានបញ្ហាកើតឡើង');
    } finally {
      setLoadingEligible(false);
    }
  };

  // Auto-advance slide based on time limit
  useEffect(() => {
    if (session.status === 'IN_PROGRESS' && session.exam?.questions?.[projectorSlide] && projectorTimeLeft === -1) {
      setProjectorTimeLeft(session.exam.questions[projectorSlide].timeLimitSeconds || 60);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectorSlide, session.status, projectorTimeLeft]); // Removed session.exam to prevent reset during polling

  useEffect(() => {
    if (session.status !== 'IN_PROGRESS') return;
    if (projectorTimeLeft === -1 && !isReviewMode) return; // Wait for initialization
    if (isPaused) return; // Wait if paused
    
    if (projectorTimeLeft <= 0) {
      if (session.exam?.questions && projectorSlide < session.exam.questions.length - 1) {
        setProjectorSlide(p => p + 1);
        setProjectorTimeLeft(isReviewMode ? reviewAutoAdvanceSeconds : -1); // Auto-reset for review mode
        playNextSound();
      } else if (isReviewMode && projectorSlide === session.exam.questions.length - 1) {
        setIsReviewMode(false);
        setProjectorTimeLeft(0);
      }
      return;
    }

    if (projectorTimeLeft > 0 && projectorTimeLeft <= 5 && !isReviewMode) {
      playTickSound();
    }

    const timer = setInterval(() => setProjectorTimeLeft(t => t > 0 ? t - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, [projectorTimeLeft, session.status, projectorSlide, session.exam?.questions?.length, isPaused, isReviewMode, reviewAutoAdvanceSeconds]);

  // Poll for updates every 3 seconds
  useEffect(() => {
    if (session.status === 'COMPLETED') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/live-exams/${session.id}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [session.id, session.status]);

  const handleParticipant = async (participationId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setLoading(true);
      const res = await fetch(`/api/live-exams/${session.id}/participants`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participationId, status })
      });
      if (res.ok) {
        // Optimistic update
        setSession(prev => ({
          ...prev,
          participations: prev.participations.map(p =>
            p.id === participationId ? { ...p, status } : p
          )
        }));
      }
    } catch (err) {
      alert('មានបញ្ហាកើតឡើង');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    initAudio(); // Initialize audio context on explicit user interaction
    if (!confirm('តើអ្នកពិតជាចង់ចាប់ផ្ដើមការប្រឡងមែនទេ? សិស្សដែល Approved នឹងឃើញសំណួរលោតចេញមក។')) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/live-exams/${session.id}/start`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSession(prev => ({ ...prev, status: data.status, startedAt: data.startedAt }));
      }
    } catch (err) {
      alert('មានបញ្ហាកើតឡើង');
    } finally {
      setLoading(false);
    }
  };

  const handleEndExam = async () => {
    if (!confirm('តើអ្នកពិតជាចង់បញ្ចប់ការប្រឡងឥឡូវនេះមែនទេ? សិស្សទាំងអស់នឹងត្រូវកាត់ផ្ដាច់។')) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/live-exams/${session.id}/end`, { method: 'POST' });
      if (res.ok) {
        window.location.href = `/dashboard/live-exams/${session.id}/results`;
      }
    } catch (err) {
      alert('មានបញ្ហាកើតឡើង');
    } finally {
      setLoading(false);
    }
  };

  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/exam?code=${session.examCode}`);
  }, [session.examCode]);

  const telegramShareUrl = joinUrl ? `https://t.me/share/url?url=${encodeURIComponent(joinUrl)}&text=${encodeURIComponent(`សូមចូលរួមប្រឡងអនឡាញ: ${session.exam.title}`)}` : '#';

  const pending = session.participations.filter(p => p.status === 'PENDING');
  const approved = session.participations.filter(p => p.status === 'APPROVED');
  const totalQuestions = session.exam.questions.length;

  const statusBadgeClass =
    session.status === 'LOBBY' ? styles.statusLobby :
    session.status === 'IN_PROGRESS' ? styles.statusLive :
    styles.statusEnded;

  const statusLabel =
    session.status === 'LOBBY' ? '⏳ កំពុងរង់ចាំក្នុងបន្ទប់' :
    session.status === 'IN_PROGRESS' ? '● កំពុងប្រឡងផ្ទាល់' :
    '✓ បានបញ្ចប់ការប្រឡង';

  return (
    <div className="animate-fade-in">
      <div className={styles.headerBar}>
        <div>
          <button className={styles.backBtn} onClick={() => window.location.href = '/dashboard/exams'}>
            ← ត្រឡប់ក្រោយ
          </button>
          <h2 className={styles.examTitle}>
            បន្ទប់ប្រឡង <span className={styles.examName}>{session.exam.title}</span>
          </h2>
          <div className={styles.metaRow}>
            <span className={`${styles.statusBadge} ${statusBadgeClass}`}>{statusLabel}</span>
            <span className={styles.metaItem}>👥 សិស្សចូលរួម <strong>{approved.length}</strong> នាក់</span>
            <span className={styles.metaItem}>📝 សំណួរសរុប <strong>{totalQuestions}</strong></span>
          </div>
        </div>

        {session.status === 'LOBBY' && (
          <button className={styles.startBtn} onClick={handleStartExam} disabled={loading}>
            ▶ ចាប់ផ្តើមប្រឡង
          </button>
        )}
        {session.status === 'IN_PROGRESS' && (
          <button className={styles.endBtn} onClick={handleEndExam} disabled={loading}>
            ⏹ បញ្ចប់ការប្រឡង
          </button>
        )}
      </div>

      {session.status === 'LOBBY' && (
        <div className={styles.lobbyGrid}>
          {/* Invite card */}
          <div className={styles.inviteCard}>
            <div className={styles.inviteLabel}>កូដចូលរួមប្រឡង</div>
            <div className={styles.examCode}>{session.examCode}</div>
            {joinUrl && (
              <div className={styles.qrFrame}>
                <QRCode value={joinUrl} size={176} />
              </div>
            )}
            <p className={styles.joinUrl}>{joinUrl}</p>
            {joinUrl && (
              <a href={telegramShareUrl} target="_blank" rel="noopener noreferrer" className={styles.telegramBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                ផ្ញើតាម Telegram
              </a>
            )}
          </div>

          {/* Waiting room */}
          <div className={styles.panelCard}>
            <div className={styles.cardHead} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3 style={{ margin: 0 }}>បញ្ជីរង់ចាំចូលរួម</h3>
                {pending.length > 0 && <span className={styles.pendingCount}>{pending.length} សំណើថ្មី</span>}
              </div>
              <button className="btn-primary" onClick={openPreApprove} style={{ padding: '6px 12px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>+ អនុញ្ញាតសិស្សមុន</button>
            </div>

            {pending.length === 0 && approved.length === 0 ? (
              <div className={styles.emptyState}>
                មិនទាន់មានសិស្សចូលរួមទេ...<br />សូមឱ្យសិស្សស្កេន QR Code ឬបញ្ចូលកូដខាងលើ
              </div>
            ) : (
              <>
                {pending.length > 0 && (
                  <div className={styles.requestList}>
                    {pending.map(p => (
                      <div key={p.id} className={styles.requestRow}>
                        <div className={styles.requestInfo}>
                          <Avatar photoUrl={p.student.photoUrl} name={p.student.name} />
                          <div>
                            <div className={styles.requestName}>{p.student.name}</div>
                            <div className={styles.requestMeta}>ID: {p.student.studentCode}</div>
                          </div>
                        </div>
                        <div className={styles.requestActions}>
                          <button className={styles.approveBtn} onClick={() => handleParticipant(p.id, 'APPROVED')} disabled={loading}>អនុញ្ញាត</button>
                          <button className={styles.rejectBtn} onClick={() => handleParticipant(p.id, 'REJECTED')} disabled={loading}>បដិសេធ</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {approved.length > 0 && (
                  <>
                    <div className={styles.sectionLabel}>សិស្សដែលបានអនុញ្ញាត ({approved.length})</div>
                    <div className={styles.approvedGrid}>
                      {approved.map(p => (
                        <div key={p.id} className={styles.approvedCard}>
                          <Avatar photoUrl={p.student.photoUrl} name={p.student.name} small />
                          <div>
                            <div className={styles.approvedName}>{p.student.name}</div>
                            <div className={styles.approvedStatus}>✓ រួចរាល់ហើយ</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {session.status === 'IN_PROGRESS' && (
        <>
        {session.exam?.questions && session.exam.questions.length > 0 && (
          <div id="projector-container" style={{ background: 'white', borderRadius: 16, padding: '2.5rem', marginBottom: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center', overflowY: 'auto', position: 'relative' }}>
            {projectorSlide === session.exam.questions.length - 1 && projectorTimeLeft === 0 && !isReviewMode ? (
              <div style={{ padding: '6rem 2rem', textAlign: 'center', animation: 'fade-in 0.5s ease-out' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                <h3 style={{ fontSize: '2.5rem', color: '#1e293b', marginBottom: '1.5rem' }}>ការប្រឡងបានបញ្ចប់!</h3>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', alignItems: 'center' }}>
                  <label style={{ fontSize: '1.2rem', color: '#64748b' }}>ប្ដូរសំណួរបន្ទាប់រៀងរាល់៖</label>
                  <input type="number" min="1" value={reviewAutoAdvanceSeconds} onChange={e => setReviewAutoAdvanceSeconds(Number(e.target.value))} style={{ width: 80, padding: '8px', fontSize: '1.2rem', borderRadius: 8, border: '1px solid #cbd5e1', textAlign: 'center' }} />
                  <span style={{ fontSize: '1.2rem', color: '#64748b' }}>វិនាទី</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button onClick={() => { setIsReviewMode(true); setProjectorSlide(0); setProjectorTimeLeft(reviewAutoAdvanceSeconds); }} disabled={loading} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '16px 32px', borderRadius: 30, fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 10px rgba(139, 92, 246, 0.3)' }}>
                    មើលចម្លើយ (Review)
                  </button>
                  <button onClick={handleEndExam} disabled={loading} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '16px 32px', borderRadius: 30, fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)' }}>
                    {loading ? 'កំពុងដំណើរការ...' : 'បញ្ចប់ នឹងមើលលទ្ធផល'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {session.exam.questions[projectorSlide]?.type === 'TYPING' && (
                  <div style={{ position: 'absolute', top: '2rem', right: '2rem', display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.5rem', borderRadius: 30 }}>
                    <button onClick={() => setProjectorTextSize(s => Math.max(1, s - 0.2))} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>A-</button>
                    <button onClick={() => setProjectorTextSize(s => Math.min(4, s + 0.2))} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>A+</button>
                  </div>
                )}
                <div style={{ marginTop: '2rem', fontSize: '2.2rem', fontWeight: 'bold', color: '#050480', marginBottom: '4rem', lineHeight: 1.6, paddingRight: '100px' }}>
                  <span style={{ color: '#ef4444', marginRight: '12px' }}>សំណួរទី {projectorSlide + 1}៖</span>
                  {session.exam.questions[projectorSlide]?.text}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '4rem' }}>
                  <div className="animate-float" style={{ fontSize: '3.5rem', marginRight: '2rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>
                    👩‍🎓
                  </div>
                  {isReviewMode ? (
                    <span style={{ fontWeight: 'bold', fontSize: '2.4rem', padding: '16px 120px', borderRadius: 50, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 12, zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                      🔍 ត្រូវប្ដូរក្នុង {projectorTimeLeft}s
                    </span>
                  ) : (
                    <span style={{ fontWeight: 'bold', fontSize: '2.4rem', padding: '16px 120px', borderRadius: 50, background: projectorTimeLeft <= 10 && projectorTimeLeft >= 0 ? '#fef2f2' : '#eff6ff', color: projectorTimeLeft <= 10 && projectorTimeLeft >= 0 ? '#ef4444' : '#3b82f6', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.3s', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                      ⏱ {Math.max(0, Math.floor(projectorTimeLeft / 60))}:{Math.max(0, projectorTimeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                  <div className="animate-float-delayed" style={{ fontSize: '3.5rem', marginLeft: '2rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>
                    👨‍🎓
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', textAlign: 'left', marginBottom: '3rem' }}>
                  {(() => {
                    const currentQuestion = session.exam.questions[projectorSlide];
                    if (currentQuestion.type === 'TYPING') {
                      return (
                        <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '2rem', borderRadius: 16, border: '2px dashed #cbd5e1', fontFamily: 'monospace', fontSize: `${projectorTextSize}rem`, lineHeight: 1.8, color: '#1e293b', whiteSpace: 'pre-wrap', textAlign: 'left', transition: 'font-size 0.2s' }}>
                          {currentQuestion.correctAnswer || '(មិនមានអត្ថបទ)'}
                        </div>
                      );
                    }
                    try {
                      const opts = JSON.parse(currentQuestion.options);
                      let correctAnswers: string[] = [];
                      if (isReviewMode) {
                        try { correctAnswers = JSON.parse(currentQuestion.correctAnswer) } catch { }
                      }

                      return opts.map((opt: string, i: number) => {
                        const isCorrect = isReviewMode && correctAnswers.includes(opt);
                        const isWrong = isReviewMode && !isCorrect;
                        
                        const bg = isCorrect ? '#dcfce7' : (isWrong ? '#fef2f2' : '#f8fafc');
                        const border = isCorrect ? '2px solid #22c55e' : (isWrong ? '2px solid #ef4444' : '2px solid #e2e8f0');
                        const color = isCorrect ? '#166534' : (isWrong ? '#991b1b' : 'black');
                        const badgeBg = isCorrect ? '#22c55e' : (isWrong ? '#ef4444' : '#3b82f6');
                        
                        return (
                          <div key={i} style={{ padding: '1.5rem', background: bg, borderRadius: 12, border: border, fontSize: '1.4rem', display: 'flex', alignItems: 'center', color: color, position: 'relative' }}>
                            <span style={{ minWidth: 44, height: 44, background: badgeBg, color: 'white', borderRadius: '50%', textAlign: 'center', lineHeight: '44px', marginRight: 16, fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                              {['ក', 'ខ', 'គ', 'ឃ', 'ង', 'ច', 'ឆ', 'ជ', 'ឈ', 'ញ'][i] || String.fromCharCode(65 + i)}
                            </span>
                            {opt}
                            {isCorrect && <span style={{ position: 'absolute', right: '1.5rem', fontSize: '2rem' }}>✅</span>}
                            {isWrong && <span style={{ position: 'absolute', right: '1.5rem', fontSize: '2rem' }}>❌</span>}
                          </div>
                        );
                      });
                    } catch { return null; }
                  })()}
                </div>
              </>
            )}

            <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '2.5rem' }}>
              <h4 style={{ color: '#64748b', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: 1 }}>សិស្សកំពុងប្រឡង ({approved.length})</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                {approved.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '6px 16px 6px 6px', borderRadius: 30, border: '1px solid #e2e8f0' }}>
                    <Avatar photoUrl={p.student.photoUrl} name={p.student.name} small />
                    <span style={{ marginLeft: 12, fontWeight: 600, color: '#1e293b' }}>{p.student.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', marginTop: '3rem', paddingTop: '2rem', borderTop: '2px dashed #f1f5f9' }}>
              <button 
                onClick={() => {
                  if (isReviewMode && projectorSlide === 0) {
                    setIsReviewMode(false);
                    setProjectorTimeLeft(0);
                    return;
                  }
                  setProjectorSlide(p => Math.max(0, p - 1)); 
                  setProjectorTimeLeft(isReviewMode ? reviewAutoAdvanceSeconds : -1); 
                  playNextSound(); 
                }} 
                disabled={!isReviewMode && projectorSlide === 0} 
                style={{ width: 64, height: 64, borderRadius: '50%', border: 'none', background: (!isReviewMode && projectorSlide === 0) ? '#f8fafc' : '#f1f5f9', color: (!isReviewMode && projectorSlide === 0) ? '#cbd5e1' : '#64748b', cursor: (!isReviewMode && projectorSlide === 0) ? 'not-allowed' : 'pointer', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: (!isReviewMode && projectorSlide === 0) ? 'none' : '0 4px 6px rgba(0,0,0,0.05)' }}
                title={isReviewMode && projectorSlide === 0 ? 'បោះបង់ការមើលចម្លើយ' : 'សំណួរមុន'}
              >
                {isReviewMode && projectorSlide === 0 ? '✕' : '⏮'}
              </button>
              
              <button 
                onClick={() => setIsPaused(!isPaused)} 
                style={{ width: 64, height: 64, borderRadius: '50%', border: 'none', background: isPaused ? '#f59e0b' : '#f1f5f9', color: isPaused ? 'white' : '#64748b', cursor: 'pointer', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                title={isPaused ? "បន្ត" : "ផ្អាក"}
              >
                {isPaused ? '▶' : '⏸'}
              </button>

              <button 
                onClick={() => {
                  const el = document.getElementById('projector-container');
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(()=>{});
                  } else {
                    el?.requestFullscreen().catch(()=>{});
                  }
                }} 
                style={{ width: 64, height: 64, borderRadius: '50%', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                title="ពង្រីកពេញអេក្រង់"
              >
                ⛶
              </button>

              <button 
                onClick={() => {
                  if (isReviewMode && projectorSlide === session.exam.questions.length - 1) {
                    setIsReviewMode(false);
                    setProjectorTimeLeft(0);
                    return;
                  }
                  setProjectorSlide(p => Math.min(session.exam.questions.length - 1, p + 1)); 
                  setProjectorTimeLeft(isReviewMode ? reviewAutoAdvanceSeconds : -1); 
                  playNextSound(); 
                }} 
                disabled={!isReviewMode && projectorSlide === session.exam.questions.length - 1} 
                style={{ width: 64, height: 64, borderRadius: '50%', border: 'none', background: (!isReviewMode && projectorSlide === session.exam.questions.length - 1) ? '#f8fafc' : '#f1f5f9', color: (!isReviewMode && projectorSlide === session.exam.questions.length - 1) ? '#cbd5e1' : '#64748b', cursor: (!isReviewMode && projectorSlide === session.exam.questions.length - 1) ? 'not-allowed' : 'pointer', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: (!isReviewMode && projectorSlide === session.exam.questions.length - 1) ? 'none' : '0 4px 6px rgba(0,0,0,0.05)' }}
                title={isReviewMode && projectorSlide === session.exam.questions.length - 1 ? 'បញ្ចប់ការមើលចម្លើយ' : 'សំណួរបន្ទាប់'}
              >
                {isReviewMode && projectorSlide === session.exam.questions.length - 1 ? '✓' : '⏭'}
              </button>
            </div>
          </div>
        )}

        <div className={styles.panelCard}>
          <div className={styles.cardHead}>
            <h3>🏆 ពិន្ទុបច្ចុប្បន្នភាព (Live Leaderboard)</h3>
          </div>

          <div className={styles.leaderboardGrid}>
            {[...approved].sort((a, b) => b.currentScore - a.currentScore).map((p, index) => {
              const pct = totalQuestions > 0 ? Math.min(100, Math.round((p.answers.length / totalQuestions) * 100)) : 0;
              return (
                <div key={p.id} className={`${styles.leaderItem} ${index === 0 ? styles.leaderItemTop : ''}`}>
                  <span className={`${styles.rankBadge} ${index === 0 ? styles.rankBadgeGold : ''}`}>{index + 1}</span>
                  <Avatar photoUrl={p.student.photoUrl} name={p.student.name} />
                  <div className={styles.leaderInfo}>
                    <div className={styles.leaderName}>{p.student.name}</div>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                    </div>
                    <div className={styles.progressLabel}>បានឆ្លើយ {p.answers.length} / {totalQuestions} សំណួរ</div>
                  </div>
                  <div className={styles.scoreBox}>
                    <div className={styles.scoreValue}>{p.currentScore}</div>
                    <div className={styles.scoreLabel}>ពិន្ទុ</div>
                  </div>
                  {index === 0 && p.currentScore > 0 && <span className={styles.crown}>👑</span>}
                </div>
              );
            })}
          </div>

          {/* Late joiners — still allowed in while exam is live */}
          {pending.length > 0 && (
            <div className={styles.lateSection}>
              <h4 className={styles.lateTitle}>អ្នកមកយឺត — រង់ចាំការអនុញ្ញាត</h4>
              <div className={styles.requestList}>
                {pending.map(p => (
                  <div key={p.id} className={styles.requestRow}>
                    <div className={styles.requestInfo}>
                      <Avatar photoUrl={p.student.photoUrl} name={p.student.name} />
                      <div>
                        <div className={styles.requestName}>{p.student.name}</div>
                        <div className={styles.requestMeta}>មកយឺត — សូមអនុញ្ញាតឱ្យចូលរួម</div>
                      </div>
                    </div>
                    <div className={styles.requestActions}>
                      <button className={styles.approveBtn} onClick={() => handleParticipant(p.id, 'APPROVED')} disabled={loading}>អនុញ្ញាត</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        </>
      )}

      {session.status === 'COMPLETED' && (
        <div className={styles.endedCard}>
          <div className={styles.endedIcon}>✅</div>
          <h3>ការប្រឡងបានបញ្ចប់ហើយ</h3>
          <p>អ្នកអាចមើលលទ្ធផលលម្អិតរបស់សិស្សម្នាក់ៗ ពិន្ទុ ចំណាត់ថ្នាក់ និងអនុញ្ញាតឱ្យសិស្សដែលជាប់ឡើងទៅវគ្គបន្ទាប់។</p>
          <button className="btn-primary" onClick={() => window.location.href = `/dashboard/live-exams/${session.id}/results`}>
            មើលលទ្ធផលប្រឡង →
          </button>
        </div>
      )}

      {preApproveModal && (
        <div className={styles.modalOverlay} onClick={() => !loadingEligible && setPreApproveModal(false)}>
          <div className={styles.preApproveModal} onClick={e => e.stopPropagation()}>

            {/* ── Header ── */}
            <div className={styles.preApproveHeader}>
              <div className={styles.preApproveHeaderLeft}>
                <div className={styles.preApproveHeaderIcon}>👥</div>
                <div>
                  <h3 className={styles.preApproveTitle}>អនុញ្ញាតសិស្សមុន</h3>
                  <p className={styles.preApproveSubtitle}>Pre-approve students before the exam starts</p>
                </div>
              </div>
              <button className={styles.preApproveClose} type="button" onClick={() => setPreApproveModal(false)}>✕</button>
            </div>

            {/* ── Body ── */}
            <div className={styles.preApproveBody}>
              {loadingEligible ? (
                <div className={styles.preApproveLoading}>
                  <div className={styles.loadingSpinner} />
                  <p>កំពុងទាញយកទិន្នន័យសិស្ស...</p>
                </div>
              ) : eligibleStudents.length === 0 ? (
                <div className={styles.preApproveEmpty}>
                  <div className={styles.preApproveEmptyIcon}>✅</div>
                  <p>សិស្សទាំងអស់បានអនុញ្ញាតហើយ</p>
                  <span>ឬមិនមានសិស្សចុះឈ្មោះក្នុងវគ្គនេះទេ</span>
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div className={styles.preApproveToolbar}>
                    <div className={styles.preApproveSearchWrap}>
                      <span className={styles.preApproveSearchIcon}>⌕</span>
                      <input
                        type="text"
                        autoFocus
                        className={styles.preApproveSearchInput}
                        placeholder="ស្វែងរកសិស្ស..."
                        value={preApproveSearch}
                        onChange={e => setPreApproveSearch(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className={styles.selectAllBtn}
                      onClick={() => {
                        if (selectedEligibleIds.size === eligibleStudents.length) {
                          setSelectedEligibleIds(new Set());
                        } else {
                          setSelectedEligibleIds(new Set(eligibleStudents.map(s => s.id)));
                        }
                      }}
                    >
                      {selectedEligibleIds.size === eligibleStudents.length ? 'ដោះជ្រើស' : 'ជ្រើសទាំងអស់'}
                    </button>
                  </div>

                  {/* Stats */}
                  <div className={styles.preApproveStats}>
                    <span className={styles.preApproveStat}>
                      <strong>{eligibleStudents.length}</strong> សិស្សសរុប
                    </span>
                    <span className={styles.preApproveStatDivider} />
                    <span className={styles.preApproveStat}>
                      <strong className={styles.selectedCountText}>{selectedEligibleIds.size}</strong> បានជ្រើស
                    </span>
                  </div>

                  {/* Student list */}
                  <div className={styles.preApproveList}>
                    {filteredEligible.length === 0 ? (
                      <div className={styles.preApproveSearchEmpty}>រកមិនឃើញ</div>
                    ) : filteredEligible.map((s, i) => {
                      const selected = selectedEligibleIds.has(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`${styles.preApproveItem} ${selected ? styles.preApproveItemSelected : ''}`}
                          style={{ animationDelay: `${i * 28}ms` }}
                        >
                          <div className={styles.preApproveItemLeft}>
                            <Avatar photoUrl={s.photoUrl} name={s.name} small />
                            <div>
                              <div className={styles.preApproveStudentName}>{s.name}</div>
                              <div className={styles.preApproveStudentCode}>{s.studentCode}</div>
                            </div>
                          </div>
                          <div className={`${styles.preApproveCheck} ${selected ? styles.preApproveCheckActive : ''}`}>
                            {selected && <span>✓</span>}
                          </div>
                          <input
                            type="checkbox"
                            className={styles.preApproveHiddenCheck}
                            checked={selected}
                            onChange={e => {
                              const next = new Set(selectedEligibleIds);
                              if (e.target.checked) next.add(s.id);
                              else next.delete(s.id);
                              setSelectedEligibleIds(next);
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* ── Footer ── */}
            {!loadingEligible && eligibleStudents.length > 0 && (
              <div className={styles.preApproveFooter}>
                <div className={styles.preApproveFooterInfo}>
                  {selectedEligibleIds.size > 0 ? (
                    <span className={styles.preApproveSelBadge}>✓ {selectedEligibleIds.size} នាក់បានជ្រើស</span>
                  ) : (
                    <span className={styles.preApproveFooterHint}>សូមជ្រើសសិស្សមុន</span>
                  )}
                </div>
                <div className={styles.preApproveFooterActions}>
                  <button type="button" className={styles.preApproveCancelBtn} onClick={() => setPreApproveModal(false)}>
                    បោះបង់
                  </button>
                  <button
                    type="button"
                    className={styles.preApproveConfirmBtn}
                    onClick={handleBulkApprove}
                    disabled={selectedEligibleIds.size === 0 || loadingEligible}
                  >
                    {loadingEligible ? 'កំពុងដំណើរការ...' : `▶ អនុញ្ញាត${selectedEligibleIds.size > 0 ? ` (${selectedEligibleIds.size})` : ''}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
