'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewStudentPage() {
  const router = useRouter();
  const [studentCode, setStudentCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentCode, name, phone })
      });

      if (res.ok) {
        router.push('/dashboard/students');
        router.refresh(); // Refresh the server component to load new data
      } else {
        const data = await res.json();
        setError(data.error || 'មានបញ្ហាក្នុងការរក្សាទុក');
      }
    } catch (err) {
      setError('មិនអាចភ្ជាប់ទៅកាន់ Server បានទេ');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', 
    padding: '12px', 
    background: 'rgba(255,255,255,0.05)', 
    border: '1px solid rgba(255,255,255,0.1)', 
    borderRadius: '8px', 
    color: 'white',
    outline: 'none',
    fontFamily: 'inherit'
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <Link href="/dashboard/students" style={{ color: 'var(--text-secondary)', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '8px' }}>
          ← ត្រឡប់ក្រោយ
        </Link>
        <h2 style={{ margin: 0 }}>ចុះឈ្មោះសិស្សថ្មី</h2>
      </div>

      <div className="glass-panel">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && <div style={{ color: '#ef4444', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>{error}</div>}
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>អត្តលេខសិស្ស (Student ID) *</label>
            <input 
              type="text" 
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
              style={inputStyle}
              placeholder="Ex: STU-001"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>ឈ្មោះសិស្ស (Full Name) *</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              placeholder="ឈ្មោះពេញរបស់សិស្ស"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>លេខទូរស័ព្ទ (Phone Number)</label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
              placeholder="012 345 678"
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '16px', padding: '14px' }} disabled={loading}>
            {loading ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកទិន្នន័យ (Save)'}
          </button>
        </form>
      </div>
    </div>
  );
}
