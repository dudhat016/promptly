import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';


export default function DashboardLayout() {
  const { profile, loading: authLoading } = useAuth();

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Loading Dashboard...</div>;

  return (
    <div className="min-h-[500px]">
      <Outlet />
    </div>
  );
}
