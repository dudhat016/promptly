import React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { Timeline, TimelineItem } from '../components/data';
import { Card, Button } from '../components/primitives';
import { Bell, Info, CheckCircle2, AlertTriangle, AlertCircle, CheckSquare, ArrowLeft } from 'lucide-react';
import { usePath } from '../hooks/usePath';
import { Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';

/**
 * Full history page for user notifications.
 * Uses the premium Timeline component to display account activity.
 */
export default function NotificationsPage() {
  const { notifications, markAllAsRead, loading } = useNotifications();
  const { prefix } = usePath();

  const timelineItems: TimelineItem[] = notifications.map(n => ({
    id: n.id,
    title: n.title,
    description: (
      <div className="space-y-2">
        <p className={n.readAt ? "text-muted-foreground/70" : "text-muted-foreground"}>
          {n.body}
        </p>
        {n.link && (
          <Link 
            to={prefix(n.link)}
            className="inline-flex items-center text-xs font-bold text-primary hover:underline group"
          >
            Action Required
            <span className="ml-1 group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
        )}
      </div>
    ),
    timestamp: formatTime(n.createdAt),
    icon: getIcon(n.type),
    color: n.type === 'info' ? 'primary' : n.type === 'success' ? 'success' : n.type === 'warning' ? 'warning' : 'error'
  }));

  return (
    <div className="min-h-screen bg-background">
      <PageContainer className="py-12 max-w-4xl">
        {/* Breadcrumb / Back */}
        <Link 
          to={prefix('/dashboard/vault')} 
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-2">
              <Bell className="w-3 h-3" />
              Activity Log
            </div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight leading-none">
              Notifications
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your alerts and keep track of account milestones.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="md" 
              leftIcon={CheckSquare}
              onClick={markAllAsRead}
              disabled={loading || notifications.length === 0 || notifications.every(n => !!n.readAt)}
              className="bg-card font-bold"
            >
              Mark all as read
            </Button>
          </div>
        </div>

        {/* Content */}
        <Card variant="raised" className="p-8 md:p-12 min-h-[400px] border-primary/5">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-card/50 backdrop-blur-[2px] z-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Synchronizing activity...</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-6 rotate-12 group-hover:rotate-0 transition-transform">
                <Bell className="w-10 h-10 text-muted-foreground/20" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">Your inbox is empty</h3>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto text-lg leading-relaxed">
                When you unlock prompts, earn credits, or get support replies, they'll show up here.
              </p>
              <Button as={Link} to={prefix('/explore')} variant="primary" size="lg" className="mt-10 px-8 shadow-xl shadow-primary/20">
                Start Exploring
              </Button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Timeline items={timelineItems} />
            </div>
          )}
        </Card>

        {/* Info card */}
        <div className="mt-12 p-6 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Info className="w-6 h-6" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="font-bold text-foreground">Notification Settings</h4>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Want to receive these alerts via email too? You can toggle your preference in your 
              <Link to={prefix('/settings/profile')} className="text-primary hover:underline font-bold ml-1">Account Settings</Link>.
            </p>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

function getIcon(type: string) {
  switch (type) {
    case 'success': return CheckCircle2;
    case 'warning': return AlertTriangle;
    case 'error': return AlertCircle;
    default: return Info;
  }
}

function formatTime(dateInput: any) {
  if (!dateInput) return '';
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  return date.toLocaleString(undefined, { 
    month: 'short', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true
  });
}
