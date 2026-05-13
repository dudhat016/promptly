import React, { useState } from 'react';
import { Bell, Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications, Notification } from '../../hooks/useNotifications';
import { Button, Card } from '../primitives';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

/**
 * A premium Notification Bell component for the user header.
 * Features: unread badge, real-time dropdown, batch actions, and responsive layout.
 */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();

  return (
    <div className="relative">
      <Button
        onClick={() => setOpen(!open)}
        variant="ghost"
        size="icon"
        className="relative text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Toggle notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-[10px] font-bold text-primary-foreground rounded-full flex items-center justify-center ring-2 ring-background animate-in zoom-in duration-300">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop for closing */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 mt-2 w-[320px] sm:w-[380px] z-50 origin-top-right"
            >
              <Card variant="raised" padding="none" className="overflow-hidden border-primary/10 shadow-2xl">
                {/* Header */}
                <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Notifications</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-0.5">
                      {unreadCount} UNREAD
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { markAllAsRead(); setOpen(false); }}
                    disabled={unreadCount === 0}
                    className="text-[10px] font-bold uppercase tracking-widest h-7 px-2 hover:bg-primary/10 hover:text-primary"
                  >
                    Mark all read
                  </Button>
                </div>

                {/* List Container */}
                <div className="max-h-[400px] overflow-y-auto py-1 custom-scrollbar">
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Syncing...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                      <p className="text-sm font-bold text-foreground">All caught up!</p>
                      <p className="text-xs text-muted-foreground mt-1 px-4">
                        We'll notify you about rewards, credits, and updates here.
                      </p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <NotificationItem 
                        key={n.id} 
                        notification={n} 
                        onRead={() => markAsRead(n.id)} 
                        onClick={() => setOpen(false)}
                      />
                    ))
                  )}
                </div>

                {/* Footer */}
                <Link 
                  to="/notifications" 
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-center text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 border-t border-border transition-colors"
                >
                  View All Activity
                </Link>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationItem({ notification, onRead, onClick }: { 
  notification: Notification; 
  onRead: () => void; 
  onClick: () => void;
}) {
  const icons = {
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    success: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    error: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  };

  const config = icons[notification.type] || icons.info;
  const Icon = config.icon;

  const isRead = !!notification.readAt;

  return (
    <div 
      className={cn(
        "px-4 py-3.5 flex gap-3 hover:bg-muted/50 transition-colors relative group cursor-pointer border-b border-border/50 last:border-0",
        !isRead && "bg-primary/[0.03]"
      )}
      onClick={() => {
        if (!isRead) onRead();
        onClick();
      }}
    >
      {!isRead && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
      )}
      
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm", config.bg)}>
        <Icon className={cn("w-5 h-5", config.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className={cn("text-sm font-bold truncate leading-tight", !isRead ? "text-foreground" : "text-muted-foreground/80")}>
            {notification.title}
          </p>
          <span className="text-[10px] font-medium text-muted-foreground/60 shrink-0 mt-0.5">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        <p className={cn(
          "text-xs leading-relaxed line-clamp-2",
          !isRead ? "text-muted-foreground" : "text-muted-foreground/60"
        )}>
          {notification.body}
        </p>
      </div>
    </div>
  );
}

function formatRelativeTime(dateInput: any) {
  if (!dateInput) return '';
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
