'use client';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  return (
    <button onClick={handleLogout} className="btn-primary" style={{ width: '100%', background: 'rgba(239, 68, 68, 0.8)' }}>
      ចាកចេញ (Log Out)
    </button>
  );
}
