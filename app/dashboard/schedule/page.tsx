import { redirect } from 'next/navigation';
import { getSessionUser } from '../../../lib/getSessionUser';
import ScheduleClient from './ScheduleClient';

export default async function SchedulePage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  return (
    <ScheduleClient
      userRole={session.role}
      userPerms={session.permissions}
    />
  );
}
