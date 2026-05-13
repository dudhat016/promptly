import { useLocation } from 'react-router-dom';
import UserLayout from '../../layouts/UserLayout';
import HorizontalLayout from '../../layouts/HorizontalLayout';
import BlankLayout from '../../layouts/BlankLayout';
import Header from '../Header';
import Footer from '../Footer';

/**
 * LayoutWrapper selects the appropriate layout based on the current route.
 */
export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const path = location.pathname;

  // 1. Auth & Error Pages (Blank Layout)
  if (path.includes('/login') || path.includes('/register') || path.includes('/forgot-password')) {
    return <BlankLayout>{children}</BlankLayout>;
  }

  // 2. Dashboard & Settings (Vertical Sidebar Layout)
  if (path.includes('/dashboard') || path.includes('/settings') || path.includes('/admin')) {
    return <UserLayout>{children}</UserLayout>;
  }

  // 3. Landing & Marketing (Horizontal Topbar Layout)
  return <HorizontalLayout>{children}</HorizontalLayout>;
}
