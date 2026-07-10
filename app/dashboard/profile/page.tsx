import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.id) redirect('/');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          គណនីរបស់ខ្ញុំ
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0' }}>
          គ្រប់គ្រង​ព័ត៌មាន​និង​សុវត្ថិភាព​គណនី​របស់អ្នក
        </p>
      </div>
      <ProfileClient userId={session.id as string} />
    </div>
  );
}
