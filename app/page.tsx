'use client';
import styles from './page.module.css';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        const data = await res.json();
        setError(data.error || 'ការចូលប្រព័ន្ធបរាជ័យ');
      }
    } catch {
      setError('មានបញ្ហាបច្ចេកទេសកើតឡើង។');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* ── Left branding panel ── */}
      <div className={styles.brand}>
        <div className={styles.brandPattern} aria-hidden="true" />

        <div className={styles.brandLogo}>
          <img src="/school-emblem.jpg" alt="School emblem" className={styles.brandIcon} />
          <span className={styles.brandName}>សាលាអនុវិទ្យាល័យសម្តេចព្រះសង្ឃរាជ<br />ទេព វង្ស និរោធរង្សី</span>
        </div>

        <div className={styles.brandCenter}>
          <span className={styles.brandKicker}>ប្រព័ន្ធគ្រប់គ្រងសាលារៀនទំនើប</span>
          <h1 className={styles.brandTitle}>
            គ្រប់គ្រងការ<br />អប់រំប្រកប<br />ដោយប្រសិទ្ធភាព
          </h1>
          <p className={styles.brandSubtitle}>
            ប្រព័ន្ធទំនើបសម្រាប់គ្រប់គ្រងសិស្ស គ្រូ វគ្គសិក្សា
            វត្តមាន និងការប្រឡង ក្នុងពេលតែមួយ។
          </p>

          <div className={styles.brandFeatures}>
            {[
              'គ្រប់គ្រងសិស្ស និងគ្រូ',
              'តាមដានវត្តមានប្រចាំថ្ងៃ',
              'ប្រព័ន្ធប្រឡង និងផ្តល់ពិន្ទុ',
              'វិញ្ញាបនបត្រ និងស្នាដៃ',
            ].map(f => (
              <div key={f} className={styles.brandFeature}>
                <span className={styles.featureCheck}>✓</span>
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.creator}>
          <div className={styles.creatorAvatarRing}>
            <img src="/profile-tob-chenda.png" alt="Tob Chenda" className={styles.creatorAvatar} />
          </div>
          <div className={styles.creatorInfo}>
            <span className={styles.creatorLabel}>Crafted by</span>
            <span className={styles.creatorName}>Tob Chenda</span>
            <span className={styles.creatorBadge}>🎓 Master&apos;s Degree</span>
            <span className={styles.creatorMeta}>Created this system on 2026-06-08</span>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className={styles.formPanel}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>🔐</div>
            <h2 className={styles.cardTitle}>ចូលទៅកាន់ប្រព័ន្ធ</h2>
            <p className={styles.cardSubtitle}>
              សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់របស់អ្នក ដើម្បីបន្ត
            </p>
          </div>

          <form className={styles.form} onSubmit={handleLogin}>
            {error && (
              <div className={styles.error}>
                <span>⚠</span>
                {error}
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label}>អ៊ីមែល</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="3" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="admin@school.edu"
                  className={styles.input}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>ពាក្យសម្ងាត់</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="10" width="16" height="11" rx="2.5" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`${styles.input} ${styles.inputWithToggle}`}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.toggleVisibility}
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'លាក់ពាក្យសម្ងាត់' : 'បង្ហាញពាក្យសម្ងាត់'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a3 3 0 0 0 4.24 4.24" />
                      <path d="M9.4 5.5A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-3.4 4.1M6.3 6.5C3.8 8.1 2 12 2 12s3.5 7 10 7c1.3 0 2.5-.2 3.6-.6" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? (
                <span className={styles.spinner} aria-hidden="true" />
              ) : null}
              {loading ? 'កំពុងចូល...' : 'ចូលទៅកាន់ប្រព័ន្ធ'}
            </button>
          </form>

          <p className={styles.footerNote}>
            ប្រព័ន្ធគ្រប់គ្រងថ្នាក់រៀន © {new Date().getFullYear()} · សូមរក្សាព័ត៌មានគណនីរបស់អ្នកជាសម្ងាត់
          </p>
        </div>
      </div>
    </div>
  );
}
