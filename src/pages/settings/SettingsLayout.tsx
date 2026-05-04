import { Outlet } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import PageShell from '../../components/ui/PageShell';

export default function SettingsLayout() {
  return (
    <PageShell 
      title="Settings" 
      description="Manage your personal information, billing preferences, and security."
      maxWidth="4xl"
    >
      <div className="min-h-[600px]">
        <AnimatePresence mode="wait">
          <Outlet />
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
