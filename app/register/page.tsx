'use client';

import { useEffect, useState } from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import styles from './register.module.css';

const NATIONALITY_OPTIONS = [
  'ខ្មែរ', 'វៀតណាម', 'ចិន', 'ថៃ', 'ឡាវ', 'ភូមា', 'ហ្វីលីពីន', 'ឥណ្ឌូនេស៊ី', 'ម៉ាឡេស៊ី', 'ឥណ្ឌា',
].map(n => ({ value: n, label: n }));

const EMPTY = {
  name: '', nameEn: '', phone: '', photoUrl: undefined as string | undefined,
  gender: '', dateOfBirth: '', nationality: '',
  wat: '', kuti: '', kutiHead: '',
  academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  educationLevel: '', grade: '',
};

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    background: state.isFocused ? '#ffffff' : '#f8fafc',
    borderColor: state.isFocused ? 'var(--color-accent)' : 'var(--color-border)',
    borderWidth: '1.5px',
    boxShadow: state.isFocused ? '0 0 0 4px rgba(99, 102, 241, 0.12)' : 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem',
    minHeight: '44px',
  }),
  menu: (base: any) => ({ ...base, zIndex: 20 }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  singleValue: (base: any) => ({ ...base, color: '#000' }),
  input: (base: any) => ({ ...base, color: '#000' }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused
      ? 'var(--color-accent)'
      : state.isSelected
        ? 'var(--color-accent-light)'
        : 'transparent',
    color: state.isFocused ? '#fff' : '#000',
  }),
};

export default function RegisterPage() {
  const [pagodas, setPagodas] = useState<any[]>([]);
  const [kutis, setKutis] = useState<any[]>([]);
  const [educationLevels, setEducationLevels] = useState<any[]>([]);

  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bgWarning, setBgWarning] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch('/api/public/registration-meta')
      .then(res => res.json())
      .then(data => {
        setPagodas(data.pagodas || []);
        setKutis(data.kutis || []);
        setEducationLevels(data.educationLevels || []);
        if (data.academicYears?.[0]?.name) {
          setForm(v => ({ ...v, academicYear: data.academicYears[0].name }));
        }
      })
      .catch(() => {});
  }, []);

  const checkDuplicate = async () => {
    if (form.name.trim() && form.nameEn.trim() && form.gender && form.phone.trim()) {
      try {
        const res = await fetch('/api/public/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            nameEn: form.nameEn,
            gender: form.gender,
            phone: form.phone,
          }),
        });
        const data = await res.json();
        if (data.duplicate) {
          setError(data.message);
        } else {
          setError(prev => 
            (prev === 'សិស្សដែលមានព័ត៌មានដូចគ្នានេះមានរួចហើយនៅក្នុងប្រព័ន្ធ' || 
             prev === 'សិស្សដែលមានព័ត៌មានដូចគ្នានេះកំពុងរង់ចាំការអនុម័តរួចហើយ') ? '' : prev
          );
        }
      } catch (e) {}
    }
  };

  const set = (k: keyof typeof EMPTY, val: string) => setForm(v => ({ ...v, [k]: val }));

  const checkImageBackground = (url: string) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      
      const samples = [
        ctx.getImageData(10, 10, 1, 1).data,
        ctx.getImageData(img.width - 10, 10, 1, 1).data,
        ctx.getImageData(10, img.height - 10, 1, 1).data,
        ctx.getImageData(img.width - 10, img.height - 10, 1, 1).data,
      ];
      
      let matchCount = 0;
      for (const [r, g, b] of samples) {
        const isWhite = r > 200 && g > 200 && b > 200;
        const isBlue = b > 100 && r < 120 && g < 150 && b > r + 30;
        if (isWhite || isBlue) matchCount++;
      }
      
      if (matchCount < 2) {
        setBgWarning('សូមប្រយ័ត្ន៖ ផ្ទៃខាងក្រោយរូបថតហាក់ដូចជាមិនត្រឹមត្រូវ។ សូមប្រាកដថាផ្ទៃខាងក្រោយពណ៌ស ឬខៀវ។');
      } else {
        setBgWarning('');
      }
    };
    img.src = url;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setBgWarning('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/public/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        setForm(v => ({ ...v, photoUrl: data.url }));
        checkImageBackground(data.url);
      } else {
        setError(data.error || 'មានបញ្ហាក្នុងការផ្ទុករូបភាព');
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.photoUrl) {
      setError('សូមផ្ទុករូបថត ៤x៦ របស់អ្នកជាមុនសិន (Photo is required)');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (bgWarning) {
      setError('រូបថតរបស់អ្នកមានផ្ទៃខាងក្រោយមិនត្រឹមត្រូវ។ សូមផ្ទុករូបថតថ្មីដែលមានផ្ទៃខាងក្រោយពណ៌ស ឬពណ៌ខៀវ។');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'មានបញ្ហាក្នុងការបញ្ជូនទម្រង់'); return; }
      setDone(true);
    } catch {
      setError('មានបញ្ហាបច្ចេកទេសកើតឡើង។');
    } finally {
      setSubmitting(false);
    }
  };

  const watKutis = form.wat
    ? kutis.filter(k => k.pagodaId === pagodas.find(p => p.name === form.wat)?.id)
    : [];

  const selectedLevel = educationLevels.find((l: any) => l.name === form.educationLevel);

  if (done) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.successWrap}>
            <div className={styles.successIcon}>✓</div>
            <h2 className={styles.successTitle}>បានទទួលសំណើចុះឈ្មោះ!</h2>
            <p className={styles.successText}>
              ព័ត៌មានរបស់អ្នកត្រូវបានបញ្ជូនដោយជោគជ័យ។<br />
              សូមរង់ចាំការត្រួតពិនិត្យ និងអនុម័តពីអ្នកគ្រប់គ្រងប្រព័ន្ធ។
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <img src="/school-emblem.png" alt="School emblem" className={styles.icon} />
          <h1 className={styles.title}>ទម្រង់ចុះឈ្មោះសិស្សថ្មី</h1>
          <p className={styles.subtitle}>
            សូមបំពេញព័ត៌មានខាងក្រោម។ ព័ត៌មានរបស់អ្នកនឹងត្រូវបានពិនិត្យ និងអនុម័តដោយអ្នកគ្រប់គ្រងប្រព័ន្ធ។
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>⚠ {error}</div>}

          <div className={styles.photoSection}>
            <p className={styles.photoWarning}>⚠ រូបថតត្រូវតែមានផ្ទៃខាងក្រោយពណ៌ស ឬពណ៌ខៀវ</p>
            <div className={styles.photoDisplayGrid}>
              {!form.photoUrl && (
                <div className={styles.sampleCol}>
                  <img src="/sample-monk-white.jpg" alt="Sample White" className={styles.sampleImg} />
                </div>
              )}
              <div className={styles.uploadCol}>
                {form.photoUrl ? (
                  <img src={form.photoUrl} alt="Preview" className={styles.photoPreview} />
                ) : (
                  <div className={styles.photoPlaceholder}>👤</div>
                )}
                <div className={styles.uploadBtnGroup}>
                  <input type="file" accept="image/*" id="photo-upload" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
                  <label htmlFor="photo-upload" className={styles.uploadLabel}>
                    {uploading ? 'កំពុងផ្ទុក...' : (form.photoUrl ? 'ប្តូររូបថតផ្សេង *' : 'ផ្ទុករូបភាព ៤x៦ *')}
                  </label>
                </div>
                {bgWarning && <p style={{ color: '#ea580c', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '4px' }}>{bgWarning}</p>}
              </div>
              {!form.photoUrl && (
                <div className={styles.sampleCol}>
                  <img src="/sample-monk-blue.jpg" alt="Sample Blue" className={styles.sampleImg} />
                </div>
              )}
            </div>
          </div>

          {/* ── Basic info ── */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>ព័ត៌មានទូទៅ</div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>ឈ្មោះពេញ *</label>
                <input className={styles.input} required autoFocus
                  placeholder="ឈ្មោះ និងនាមត្រកូល (ខ្មែរ)"
                  value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>ឈ្មោះឡាតាំង *</label>
                <input className={styles.input} required
                  placeholder="ឈ្មោះជាអក្សរអង់គ្លេស"
                  value={form.nameEn} onChange={e => set('nameEn', e.target.value)} />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>ភេទ *</label>
                <select className={styles.select} required value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">-- ជ្រើសរើស --</option>
                  <option value="M">ប្រុស</option>
                  <option value="F">ស្រី</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>ថ្ងៃខែឆ្នាំកំណើត *</label>
                <input type="date" className={styles.input} required
                  value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>លេខទូរស័ព្ទ *</label>
                <input type="tel" className={styles.input} required
                  placeholder="012 345 678"
                  value={form.phone} onChange={e => set('phone', e.target.value)}
                  onBlur={checkDuplicate} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>សញ្ជាតិ *</label>
                <CreatableSelect
                  instanceId="nationality"
                  required
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
                  placeholder="-- ជ្រើសរើស ឬ វាយបញ្ចូល --"
                  formatCreateLabel={(input: string) => `+ បន្ថែម "${input}"`}
                  options={NATIONALITY_OPTIONS}
                  value={form.nationality ? { value: form.nationality, label: form.nationality } : null}
                  onChange={(opt: any) => set('nationality', opt?.value || '')}
                  isClearable
                />
              </div>
            </div>
          </div>

          {/* ── Residence ── */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>ទីតាំងស្នាក់នៅ</div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>វត្ត *</label>
                <Select
                  instanceId="wat"
                  required
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
                  placeholder="-- ជ្រើសរើស --"
                  options={pagodas.map(p => ({ value: p.name, label: p.name }))}
                  value={form.wat ? { value: form.wat, label: form.wat } : null}
                  onChange={(opt: any) => setForm(v => ({ ...v, wat: opt?.value || '', kuti: '', kutiHead: '' }))}
                  isClearable
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>កុដិ *</label>
                <Select
                  instanceId="kuti"
                  required
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
                  placeholder="-- ជ្រើសរើស --"
                  options={watKutis.map(k => ({ value: k.name, label: k.name }))}
                  value={form.kuti ? { value: form.kuti, label: form.kuti } : null}
                  onChange={(opt: any) => {
                    const val = opt?.value || '';
                    const sk = watKutis.find(k => k.name === val);
                    setForm(v => ({ ...v, kuti: val, kutiHead: sk?.head?.name || '' }));
                  }}
                  isDisabled={!form.wat}
                  isClearable
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>មេកុដិឈ្មោះ</label>
              <input className={styles.input} disabled
                style={{ opacity: 0.8, cursor: 'not-allowed' }}
                value={form.kutiHead} />
            </div>
          </div>

          {/* ── Academic ── */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>ព័ត៌មានសិក្សា</div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>ឆ្នាំសិក្សា</label>
                <input className={styles.input} disabled
                  style={{ opacity: 0.8, cursor: 'not-allowed' }}
                  value={form.academicYear} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>កម្រិតសិក្សា *</label>
                <Select
                  instanceId="education-level"
                  required
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
                  placeholder="-- ជ្រើសរើស --"
                  options={educationLevels.map((l: any) => ({ value: l.name, label: l.name }))}
                  value={form.educationLevel ? { value: form.educationLevel, label: form.educationLevel } : null}
                  onChange={(opt: any) => setForm(v => ({ ...v, educationLevel: opt?.value || '', grade: '' }))}
                  isClearable
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>ថ្នាក់ទី *</label>
                <Select
                  instanceId="grade"
                  required
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
                  placeholder="-- ជ្រើសរើស --"
                  options={(selectedLevel?.grades || []).map((g: any) => ({ value: g.name, label: g.name }))}
                  value={form.grade ? { value: form.grade, label: form.grade } : null}
                  onChange={(opt: any) => set('grade', opt?.value || '')}
                  isDisabled={!form.educationLevel}
                  isClearable
                />
              </div>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'កំពុងបញ្ជូន...' : 'បញ្ជូនព័ត៌មាន'}
          </button>
        </form>
      </div>
    </div>
  );
}
