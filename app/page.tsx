'use client';
import styles from './page.module.css';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        <div className={styles.brandLogo}>
          <div className={styles.brandIcon}>🏫</div>
          <span className={styles.brandName}>ប្រព័ន្ធគ្រប់គ្រង<br />ថ្នាក់រៀន</span>
        </div>

        <div className={styles.brandCenter}>
          <div className={styles.brandTitle}>
            គ្រប់គ្រងការ<br />អប់រំប្រកប<br />ដោយប្រសិទ្ធភាព
          </div>
          <p className={styles.brandSubtitle}>
            ប្រព័ន្ធទំនើបសម្រាប់គ្រប់គ្រងសិស្ស គ្រូ វគ្គសិក្សា
            វត្តមាន និងការប្រឡង ក្នុងពេលតែមួយ។
          </p>
        </div>

        <div className={styles.brandFeatures}>
          {[
            'គ្រប់គ្រងសិស្ស និងគ្រូ',
            'តាមដានវត្តមានប្រចាំថ្ងៃ',
            'ប្រព័ន្ធប្រឡង និងផ្តល់ពិន្ទុ',
            'វិញ្ញាបនបត្រ និងស្នាដៃ',
          ].map(f => (
            <div key={f} className={styles.brandFeature}>
              <span className={styles.featureDot} />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className={styles.formPanel}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>🔐</div>
            <h1 className={styles.cardTitle}>ចូលទៅកាន់ប្រព័ន្ធ</h1>
            <p className={styles.cardSubtitle}>
              សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់របស់អ្នក
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

            <div className={styles.field}>
              <label className={styles.label}>ពាក្យសម្ងាត់</label>
              <input
                type="password"
                placeholder="••••••••"
                className={styles.input}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'កំពុងចូល...' : 'ចូលទៅកាន់ប្រព័ន្ធ'}
            </button>
          </form>

          <p className={styles.footerNote}>
            ប្រព័ន្ធគ្រប់គ្រងថ្នាក់រៀន © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
