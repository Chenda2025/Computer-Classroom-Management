'use client';
import { useState, useRef } from 'react';
import styles from './profile.module.css';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  photoUrl?: string | null;
  createdAt: string;
}

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#0ea5e9','#10b981','#f59e0b'];
function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

export default function ProfileClient({ initialUser }: { initialUser: UserData }) {
  const [user, setUser] = useState(initialUser);
  const [tab, setTab] = useState<'info' | 'password'>('info');

  // Photo upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Info form
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [infoMsg, setInfoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const createdDate = new Date(user.createdAt).toLocaleDateString('km-KH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setPhotoMsg({ ok: false, text: 'រូបភាពធំពេក (អតិបរមា 3MB)' });
      return;
    }
    setPhotoLoading(true);
    setPhotoMsg(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl: dataUrl }),
        });
        const data = await res.json();
        if (!res.ok) {
          setPhotoMsg({ ok: false, text: data.error || 'Failed to save photo' });
        } else {
          setUser(data.user);
          setPhotoMsg({ ok: true, text: 'រូបថតត្រូវបានរក្សាទុក!' });
        }
        setPhotoLoading(false);
      };
      reader.onerror = () => {
        setPhotoMsg({ ok: false, text: 'Could not read file' });
        setPhotoLoading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setPhotoMsg({ ok: false, text: 'Network error' });
      setPhotoLoading(false);
    }
    // reset so same file can be re-picked
    e.target.value = '';
  }

  async function removePhoto() {
    setPhotoLoading(true);
    setPhotoMsg(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: '' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhotoMsg({ ok: false, text: data.error || 'Failed' });
      } else {
        setUser(data.user);
        setPhotoMsg({ ok: true, text: 'រូបថតត្រូវបានលុប' });
      }
    } catch {
      setPhotoMsg({ ok: false, text: 'Network error' });
    } finally {
      setPhotoLoading(false);
    }
  }

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    setInfoLoading(true);
    setInfoMsg(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInfoMsg({ ok: false, text: data.error || 'Failed to save' });
      } else {
        setUser(data.user);
        setInfoMsg({ ok: true, text: 'ព័ត៌មានត្រូវបានរក្សាទុក!' });
      }
    } catch {
      setInfoMsg({ ok: false, text: 'Network error' });
    } finally {
      setInfoLoading(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwMsg({ ok: false, text: 'ពាក្យសម្ងាត់ថ្មីមិនដូចគ្នា' });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwMsg({ ok: false, text: data.error || 'Failed to change password' });
      } else {
        setPwMsg({ ok: true, text: 'ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្ដូរ!' });
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
      }
    } catch {
      setPwMsg({ ok: false, text: 'Network error' });
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      {/* Profile header card */}
      <div className={styles.profileCard}>
        {/* Clickable avatar */}
        <div className={styles.avatarWrap}>
          <div
            className={styles.avatarOuter}
            onClick={() => !photoLoading && fileRef.current?.click()}
            title="ចុចដើម្បីផ្លាស់ប្ដូររូបថត"
          >
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.name} className={styles.avatarImg} />
            ) : (
              <div
                className={styles.avatar}
                style={{ background: avatarColor(user.name) }}
              >
                {initials(user.name)}
              </div>
            )}
            <div className={styles.avatarOverlay}>
              {photoLoading ? '⏳' : '📷'}
            </div>
          </div>
          {user.photoUrl && !photoLoading && (
            <button className={styles.removePhotoBtn} onClick={removePhoto} title="លុបរូបថត">✕</button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoChange}
          />
          {photoMsg && (
            <div className={`${styles.photoMsg} ${photoMsg.ok ? styles.photoMsgOk : styles.photoMsgErr}`}>
              {photoMsg.text}
            </div>
          )}
        </div>

        <div className={styles.profileMeta}>
          <h1 className={styles.profileName}>{user.name}</h1>
          <div className={styles.profileBadges}>
            <span className={`${styles.roleBadge} ${user.role === 'ADMIN' ? styles.roleAdmin : styles.roleMonitor}`}>
              {user.role === 'ADMIN' ? 'អ្នកគ្រប់គ្រង' : 'អ្នកត្រួតពិនិត្យ'}
            </span>
          </div>
          <div className={styles.profileEmail}>{user.email}</div>
          <div className={styles.profileJoined}>ចូលប្រព័ន្ធតាំងពី {createdDate}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${tab === 'info' ? styles.tabActive : ''}`}
          onClick={() => setTab('info')}
        >
          ✏️ កែប្រែព័ត៌មាន
        </button>
        <button
          className={`${styles.tab} ${tab === 'password' ? styles.tabActive : ''}`}
          onClick={() => setTab('password')}
        >
          🔒 ផ្លាស់ប្ដូរពាក្យសម្ងាត់
        </button>
      </div>

      {/* Info form */}
      {tab === 'info' && (
        <form className={styles.form} onSubmit={saveInfo}>
          <div className={styles.formGroup}>
            <label className={styles.label}>ឈ្មោះ</label>
            <input
              className={styles.input}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>អ៊ីម៉ែល</label>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>តួនាទី</label>
            <input
              className={`${styles.input} ${styles.inputDisabled}`}
              type="text"
              value={user.role === 'ADMIN' ? 'អ្នកគ្រប់គ្រង (ADMIN)' : 'អ្នកត្រួតពិនិត្យ (MONITOR)'}
              disabled
            />
          </div>
          {infoMsg && (
            <div className={infoMsg.ok ? styles.msgSuccess : styles.msgError}>
              {infoMsg.ok ? '✅' : '❌'} {infoMsg.text}
            </div>
          )}
          <button className={styles.saveBtn} type="submit" disabled={infoLoading}>
            {infoLoading ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកការផ្លាស់ប្ដូរ'}
          </button>
        </form>
      )}

      {/* Password form */}
      {tab === 'password' && (
        <form className={styles.form} onSubmit={savePassword}>
          <div className={styles.formGroup}>
            <label className={styles.label}>ពាក្យសម្ងាត់បច្ចុប្បន្ន</label>
            <input
              className={styles.input}
              type="password"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>ពាក្យសម្ងាត់ថ្មី</label>
            <input
              className={styles.input}
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>បញ្ជាក់ពាក្យសម្ងាត់ថ្មី</label>
            <input
              className={styles.input}
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          {pwMsg && (
            <div className={pwMsg.ok ? styles.msgSuccess : styles.msgError}>
              {pwMsg.ok ? '✅' : '❌'} {pwMsg.text}
            </div>
          )}
          <button className={styles.saveBtn} type="submit" disabled={pwLoading}>
            {pwLoading ? 'កំពុងផ្លាស់ប្ដូរ...' : 'ផ្លាស់ប្ដូរពាក្យសម្ងាត់'}
          </button>
        </form>
      )}
    </div>
  );
}
