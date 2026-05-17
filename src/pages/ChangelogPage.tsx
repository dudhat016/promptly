import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Timeline, TimelineItem } from '../components/data';
import { Card, Chip, Button } from '../components/primitives';
import { Rocket, Sparkles, Zap, Wrench, Bug, History } from 'lucide-react';
import { cn } from '../lib/utils';
import PageContainer from '../components/layout/PageContainer';

interface ChangelogEntry {
  id: string;
  version: string;
  date: any;
  title: string;
  items: {
    type: 'new' | 'improved' | 'fixed';
    text: string;
  }[];
}

/**
 * Public Changelog page to showcase platform updates.
 * Uses the Timeline component with custom badges for feature categorization.
 */
export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'changelogs'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChangelogEntry)));
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, []);

  const timelineItems: TimelineItem[] = entries.map(entry => ({
    id: entry.id,
    title: (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xl font-black text-foreground">{entry.title}</span>
        <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
          v{entry.version}
        </div>
      </div>
    ),
    description: (
      <div className="mt-4 space-y-4">
        {entry.items.map((item, idx) => (
          <div key={idx} className="flex gap-3">
            <div className="mt-1">
              {item.type === 'new' && <Chip variant="soft" color="success" size="sm" className="h-5 px-1.5 text-[9px] uppercase font-black">NEW</Chip>}
              {item.type === 'improved' && <Chip variant="soft" color="info" size="sm" className="h-5 px-1.5 text-[9px] uppercase font-black">IMP</Chip>}
              {item.type === 'fixed' && <Chip variant="soft" color="warning" size="sm" className="h-5 px-1.5 text-[9px] uppercase font-black">FIX</Chip>}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>
    ),
    timestamp: formatLongDate(entry.date),
    icon: Rocket,
    color: 'primary'
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative pt-24 pb-12 md:pb-16 overflow-hidden border-b border-border bg-muted/20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 70%)' }} />
        <PageContainer ignoreCustomizer className="text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-5 md:mb-6">
            <History className="w-3.5 h-3.5" />
            Product Updates
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-foreground tracking-tight mb-3 md:mb-4">
            See what's <span className="gradient-text">new</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto px-2">
            We ship fast. Here's every update, improvement, and fix — newest first.
          </p>
        </PageContainer>
      </div>

      <PageContainer ignoreCustomizer className="py-14 md:py-20 max-w-4xl">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Loading history...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-20 text-center">
             <Card variant="flat" className="p-12 border-dashed border-2">
                <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground">No updates yet</h3>
                <p className="text-muted-foreground mt-2">Check back soon for our first major release notes!</p>
             </Card>
          </div>
        ) : (
          <Timeline items={timelineItems} />
        )}
      </PageContainer>

      {/* Subscription CTA */}
      <PageContainer ignoreCustomizer className="pb-20">
        <Card variant="raised" className="max-w-3xl mx-auto p-8 md:p-12 bg-primary text-primary-foreground overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10 text-center space-y-6">
             <h2 className="text-3xl font-bold tracking-tight">Stay in the loop</h2>
             <p className="text-primary-foreground/80 max-w-md mx-auto">
               Get notified about major feature releases and platform improvements directly in your inbox.
             </p>
             <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <Button variant="white" size="lg" className="font-bold">Subscribe</Button>
             </div>
          </div>
        </Card>
      </PageContainer>
    </div>
  );
}

function formatLongDate(dateInput: any) {
  if (!dateInput) return '';
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  return date.toLocaleDateString(undefined, { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  });
}
