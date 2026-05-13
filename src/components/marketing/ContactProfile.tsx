import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import {
  Activity,
  AlertTriangle,
  Clock,
  Database,
  Mail, Tag as TagIcon,
  TrendingUp,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { ActivityItem, Contact, Tag } from '../../types';
import Button from '../primitives/Button';
import Badge from '../primitives/Badge';

interface Props {
  contact: Contact;
  tags: Tag[];
  onClose: () => void;
}

export default function ContactProfile({ contact, tags, onClose }: Props) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const q = query(
          collection(db, 'marketing_activities'),
          where('contactId', '==', contact.id),
          orderBy('timestamp', 'desc')
        );
        const snap = await getDocs(q);
        setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityItem)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
  }, [contact.id]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-end bg-foreground/60 backdrop-blur-sm">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="w-full max-w-2xl h-full bg-card shadow-2xl border-l border-border flex flex-col"
      >
        {/* Header */}
        <div className="p-8 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground uppercase tracking-tight">{contact.displayName || 'Anonymous'}</h3>
              <p className="text-muted-foreground font-medium">{contact.email}</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/30 p-4 rounded-xl border border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Lead Score</p>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-xl font-bold text-foreground">{contact.leadScore || 0}</span>
              </div>
            </div>
            <div className="bg-muted/30 p-4 rounded-xl border border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Status</p>
              <Badge 
                variant={contact.status === 'active' ? 'success' : 'error'} 
                dot 
                className="w-full justify-center"
              >
                {contact.status}
              </Badge>
            </div>
            <div className="bg-muted/30 p-4 rounded-xl border border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Churn Risk</p>
              <Badge 
                variant={contact.prediction?.churnRisk === 'high' ? 'error' : 'success'} 
                size="sm"
                className="w-full justify-center"
              >
                {contact.prediction?.churnRisk || 'Unknown'}
              </Badge>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <TagIcon className="w-4 h-4" /> Assigned Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {contact.tags.map(tId => {
                const tag = tags.find(t => t.id === tId);
                return tag ? (
                  <span key={tId} className="px-4 py-2 rounded-lg text-xs font-bold uppercase" style={{ backgroundColor: tag.color + '15', color: tag.color }}>
                    {tag.name}
                  </span>
                ) : null;
              })}
              {contact.tags.length === 0 && <p className="text-sm text-muted-foreground italic">No tags assigned to this contact.</p>}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" /> Activity Timeline
            </h4>

            <div className="space-y-8 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {loading ? (
                <div className="pl-12 py-4 animate-pulse text-muted-foreground font-bold uppercase tracking-widest text-xs">Loading history...</div>
              ) : activities.map((activity, idx) => (
                <div key={activity.id} className="relative pl-12">
                  <div className={`absolute left-0 top-1 w-9 h-9 rounded-full border-4 border-card flex items-center justify-center z-10 ${
                    activity.type.includes('email') ? 'bg-primary text-primary-foreground' :
                    activity.type.includes('tag') ? 'bg-amber-500 text-white' : 'bg-muted text-foreground'
                  }`}>
                    {activity.type.includes('email') && <Mail className="w-4 h-4" />}
                    {activity.type.includes('tag') && <TagIcon className="w-4 h-4" />}
                    {!activity.type.includes('email') && !activity.type.includes('tag') && <Clock className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-foreground text-md">{activity.description}</p>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{activity.timestamp?.toDate().toLocaleDateString()}</span>
                    </div>
                    {activity.metadata && (
                      <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground font-medium">
                        {Object.entries(activity.metadata).map(([key, val]) => (
                          <p key={key}>{key}: {val}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {activities.length === 0 && !loading && (
                <div className="pl-12 py-10 text-center text-muted-foreground italic text-sm">
                  No activity recorded yet for this contact.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-border bg-muted/10 flex gap-4">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={Mail}
            className="py-4 font-bold uppercase tracking-widest"
          >
            Send Direct Email
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="px-8 font-bold uppercase tracking-widest"
          >
            Manage Subscription
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
