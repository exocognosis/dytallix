import DashboardClient from '@/components/dashboard-client';
import { getServerSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

interface DashboardPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getServerSessionUser();

  if (!user) {
    redirect('/login');
  }

  const googleConnected = searchParams.google_connected === 'true';
  const connectedEmail = typeof searchParams.email === 'string' ? searchParams.email : '';
  const authError = typeof searchParams.auth_error === 'string' ? searchParams.auth_error : '';

  const initialNotice = googleConnected
    ? `Google account connected${connectedEmail ? `: ${connectedEmail}` : ''}`
    : '';
  const initialError = authError ? `Google auth failed: ${authError}` : '';

  return (
    <DashboardClient
      currentUser={user}
      initialNotice={initialNotice}
      initialError={initialError}
    />
  );
}