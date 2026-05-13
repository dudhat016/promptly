import { Outlet } from 'react-router-dom';

/**
 * Blank layout — no sidebar, no header, no footer.
 * Used for auth pages (Login, Register, ForgotPassword), 404, and print views.
 */
export default function BlankLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {children || <Outlet />}
    </div>
  );
}
