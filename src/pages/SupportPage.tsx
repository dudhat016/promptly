import { collection, onSnapshot, orderBy, query, serverTimestamp, where, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { AlertCircle, CheckCircle, Clock, HelpCircle, LifeBuoy, MessageSquare, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';

interface Message {
  senderId: string;
  senderRole: 'user' | 'admin';
  text: string;
  createdAt: any;
}

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  updatedAt: any;
  messages: Message[];
}

const STATUS_CONFIG = {
  open:     { icon: AlertCircle,   color: 'text-primary',     bg: 'bg-primary/10',    label: 'Open' },
  pending:  { icon: Clock,         color: 'text-amber-500',   bg: 'bg-amber-500/10',  label: 'Pending' },
  resolved: { icon: CheckCircle,   color: 'text-emerald-500', bg: 'bg-emerald-500/10',label: 'Resolved' },
};

const PRIORITY_COLOR = { low: 'text-muted-foreground', medium: 'text-amber-500', high: 'text-rose-500' };

export default function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'tickets'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
      setTickets(data);
      setLoading(false);
      if (selectedTicket) {
        const updated = data.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    }, () => setLoading(false));
    return unsub;
  }, [user, selectedTicket?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message || !user) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, userEmail: user.email, subject, message, priority }),
      });
      if (res.ok) {
        toast.success('Ticket created! We\'ll respond within 24 hours.');
        setSubject(''); setMessage(''); setIsCreating(false);
      } else {
        throw new Error('Server error');
      }
    } catch {
      toast.error('Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!reply.trim() || !selectedTicket || !user) return;
    setSending(true);
    try {
      await updateDoc(doc(db, 'tickets', selectedTicket.id), {
        messages: arrayUnion({
          senderId: user.uid,
          senderRole: 'user',
          text: reply.trim(),
          createdAt: serverTimestamp(),
        }),
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'open',
      });
      setReply('');
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const inputClass = "w-full rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all bg-background border border-border focus:border-primary/50";

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            <LifeBuoy className="w-3.5 h-3.5" />
            Help Center
          </div>
          <h1 className="text-2xl font-bold text-foreground">Support Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">Submit a ticket and we'll get back to you within 24 hours.</p>
        </div>
        <button
          onClick={() => { setIsCreating(!isCreating); setSelectedTicket(null); }}
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
          style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))' }}
        >
          {isCreating ? <X className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
          {isCreating ? 'Cancel' : 'Open New Ticket'}
        </button>
      </div>

      {isCreating ? (
        /* ── New Ticket Form ── */
        <div className="max-w-2xl bg-card border border-border rounded-2xl p-8">
          <h2 className="text-lg font-bold text-foreground mb-6">Describe your issue</h2>
          <form onSubmit={handleCreateTicket} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Subject</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                className={inputClass} placeholder="What can we help you with?" required />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className={inputClass}>
                <option value="low">Low — General question</option>
                <option value="medium">Medium — Feature or account issue</option>
                <option value="high">High — Billing or access problem</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                rows={6} className={inputClass} placeholder="Describe your issue in detail..." required />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
              style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))' }}>
              {submitting
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Send className="w-4 h-4" />}
              Submit Ticket
            </button>
          </form>
        </div>
      ) : (
        /* ── Ticket List + Conversation ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Ticket list */}
          <div className="space-y-2 lg:col-span-1 overflow-y-auto max-h-[75vh]">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)
            ) : tickets.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-border">
                <HelpCircle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm font-semibold text-muted-foreground">No tickets yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">We're here if you need us!</p>
              </div>
            ) : tickets.map(ticket => {
              const cfg = STATUS_CONFIG[ticket.status];
              const Icon = cfg.icon;
              const isSelected = selectedTicket?.id === ticket.id;
              return (
                <button key={ticket.id} onClick={() => setSelectedTicket(ticket)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${isSelected ? 'border-primary/30 bg-primary/5' : 'border-border bg-card hover:border-border/60 hover:bg-muted/30'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${cfg.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${PRIORITY_COLOR[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ticket.messages?.length || 0} message{(ticket.messages?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Conversation panel */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="bg-card border border-border rounded-2xl flex flex-col h-[75vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-foreground">{selectedTicket.subject}</h2>
                    <div className={`flex items-center gap-1.5 text-xs font-semibold mt-1 ${STATUS_CONFIG[selectedTicket.status].color}`}>
                      {(() => { const Icon = STATUS_CONFIG[selectedTicket.status].icon; return <Icon className="w-3.5 h-3.5" />; })()}
                      {STATUS_CONFIG[selectedTicket.status].label}
                      <span className="text-muted-foreground/40">·</span>
                      <span className={`uppercase tracking-wider ${PRIORITY_COLOR[selectedTicket.priority]}`}>{selectedTicket.priority} priority</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedTicket(null)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-muted/20">
                  {(selectedTicket.messages || []).map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.senderRole === 'user'
                          ? 'text-white rounded-tr-md'
                          : 'bg-card border border-border text-foreground rounded-tl-md'
                      }`}
                        style={msg.senderRole === 'user' ? { background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))' } : undefined}>
                        <p>{msg.text}</p>
                        <span className={`text-xs font-semibold block mt-2 ${msg.senderRole === 'user' ? 'text-white/60' : 'text-muted-foreground/60'}`}>
                          {msg.senderRole === 'admin' ? 'Support Team' : 'You'}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply */}
                {selectedTicket.status !== 'resolved' && (
                  <div className="p-4 border-t border-border flex gap-3">
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                      placeholder="Type a reply… (Enter to send)"
                      rows={2}
                      className={`${inputClass} resize-none flex-grow`}
                    />
                    <button onClick={handleSendReply} disabled={sending || !reply.trim()}
                      className="self-end px-4 py-3 rounded-xl font-bold text-sm text-white flex items-center gap-2 disabled:opacity-50 transition-all"
                      style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))' }}>
                      {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                )}
                {selectedTicket.status === 'resolved' && (
                  <div className="p-4 border-t border-border text-center text-xs text-muted-foreground font-semibold">
                    This ticket has been resolved. <button onClick={() => setIsCreating(true)} className="text-primary hover:underline ml-1">Open a new ticket</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[75vh] flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm font-semibold text-muted-foreground">Select a ticket to view conversation</p>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">Or open a new ticket if you have a question for our support team.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
