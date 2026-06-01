import { collection, onSnapshot, orderBy, query, serverTimestamp, where, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { AlertCircle, CheckCircle, Clock, HelpCircle, LifeBuoy, MessageSquare, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import Input from '../components/primitives/Input';
import Textarea from '../components/primitives/Textarea';
import Select from '../components/primitives/Select';
import Button from '../components/primitives/Button';
import Skeleton from '../components/feedback/Skeleton';
import Card from '../components/primitives/Card';

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
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!subject.trim()) newErrors.subject = "Subject is required";
    if (!message.trim()) newErrors.message = "Message is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;
    
    setSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ userId: user.uid, userEmail: user.email, subject, message, priority }),
      });
      if (res.ok) {
        toast.success('Ticket created! We\'ll respond within 24 hours.');
        setSubject(''); setMessage(''); setIsCreating(false);
        setErrors({});
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

  const inputClass = "w-full rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors bg-background border border-border focus:border-primary";

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
        <Button
          onClick={() => { setIsCreating(!isCreating); setSelectedTicket(null); }}
          variant={isCreating ? 'secondary' : 'primary'}
          size="md"
          leftIcon={isCreating ? X : MessageSquare}
          className="shrink-0"
        >
          {isCreating ? 'Cancel' : 'Open New Ticket'}
        </Button>
      </div>

      {isCreating ? (
        /* ── New Ticket Form ── */
        <Card padding="lg" className="max-w-2xl !rounded-2xl">
          <h2 className="text-lg font-bold text-foreground mb-6">Describe your issue</h2>
          <form onSubmit={handleCreateTicket} className="space-y-5">
            <Input
              label="Subject"
              id="subject"
              name="subject"
              type="text"
              required
              error={errors.subject}
              value={subject}
              onChange={e => {
                setSubject(e.target.value);
                if (errors.subject) setErrors({...errors, subject: ''});
              }}
              placeholder="What can we help you with?"
            />
            <Select
              label="Priority"
              id="priority"
              value={priority}
              onChange={val => setPriority(val)}
              options={[
                { label: 'Low', value: 'low', description: 'General question' },
                { label: 'Medium', value: 'medium', description: 'Feature or account issue' },
                { label: 'High', value: 'high', description: 'Billing or access problem' }
              ]}
              isSearchable={false}
            />
            <Textarea
              label="Message"
              id="message"
              name="message"
              required
              error={errors.message}
              value={message}
              onChange={e => {
                setMessage(e.target.value);
                if (errors.message) setErrors({...errors, message: ''});
              }}
              rows={6}
              placeholder="Describe your issue in detail..."
            />
            <Button 
              type="submit" 
              isLoading={submitting}
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={Send}
            >
              Submit Ticket
            </Button>
          </form>
        </Card>
      ) : (
        /* ── Ticket List + Conversation ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Ticket list */}
          <div className="space-y-2 lg:col-span-1 overflow-y-auto max-h-[75vh]">
            {loading ? (
              [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)
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
                 <Button
                   key={ticket.id}
                   onClick={() => setSelectedTicket(ticket)}
                   variant="ghost"
                   size="lg"
                   fullWidth
                   className={cn(
                     "flex-col items-start h-auto p-4 transition-all border rounded-xl",
                     isSelected
                       ? "bg-primary/8 border-primary/30 text-foreground hover:bg-primary/10"
                       : "bg-card border-border text-foreground hover:bg-muted/30"
                   )}
                 >
                   <div className="flex items-center justify-between w-full mb-1.5">
                     <div className={cn("flex items-center gap-1.5 text-xs font-bold", cfg.color)}>
                       <Icon className="w-3.5 h-3.5" />
                       {cfg.label}
                     </div>
                     <span className={cn("text-xs font-bold uppercase tracking-wider", PRIORITY_COLOR[ticket.priority])}>
                       {ticket.priority}
                     </span>
                   </div>
                   <p className="text-sm font-semibold text-foreground truncate w-full">{ticket.subject}</p>
                   <p className="text-xs text-muted-foreground mt-0.5">
                     {ticket.messages?.length || 0} message{(ticket.messages?.length || 0) !== 1 ? 's' : ''}
                   </p>
                 </Button>
              );
            })}
          </div>

          {/* Conversation panel */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <Card padding="none" className="!rounded-2xl h-[75vh]">
                <Card.Header
                  title={
                    <div>
                      <h2 className="font-bold text-foreground">{selectedTicket.subject}</h2>
                      <div className={`flex items-center gap-1.5 text-xs font-semibold mt-1 ${STATUS_CONFIG[selectedTicket.status].color}`}>
                        {(() => { const Icon = STATUS_CONFIG[selectedTicket.status].icon; return <Icon className="w-3.5 h-3.5" />; })()}
                        {STATUS_CONFIG[selectedTicket.status].label}
                        <span className="text-muted-foreground/40">·</span>
                        <span className={`uppercase tracking-wider ${PRIORITY_COLOR[selectedTicket.priority]}`}>{selectedTicket.priority} priority</span>
                      </div>
                    </div>
                  }
                  action={
                    <Button onClick={() => setSelectedTicket(null)} variant="ghost" size="icon" className="shrink-0">
                      <X className="w-4 h-4" />
                    </Button>
                  }
                />

                {/* Messages */}
                <Card.Body className="overflow-y-auto p-5 space-y-4 bg-muted/20">
                  {(selectedTicket.messages || []).map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.senderRole === 'user'
                          ? 'gradient-cta rounded-tr-md'
                          : 'bg-card border border-border text-foreground rounded-tl-md'
                      }`}>
                        <p>{msg.text}</p>
                        <span className={`text-xs font-semibold block mt-2 ${msg.senderRole === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>
                          {msg.senderRole === 'admin' ? 'Support Team' : 'You'}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </Card.Body>

                {/* Reply */}
                {selectedTicket.status !== 'resolved' && (
                  <Card.Footer className="flex gap-3">
                    <Textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                      placeholder="Type a reply… (Enter to send)"
                      rows={2}
                      variant="outline"
                      className="min-h-0 flex-grow"
                    />
                    <Button
                      onClick={handleSendReply}
                      isLoading={sending}
                      disabled={!reply.trim()}
                      variant="primary"
                      size="md"
                      className="self-end px-4 h-12"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </Card.Footer>
                )}
                {selectedTicket.status === 'resolved' && (
                  <Card.Footer className="text-center text-xs text-muted-foreground font-semibold">
                    This ticket has been resolved.
                    <Button
                      onClick={() => setIsCreating(true)}
                      variant="ghost"
                      className="text-primary hover:underline ml-1 h-auto py-1 inline-flex"
                    >
                      Open a new ticket
                    </Button>
                  </Card.Footer>
                )}
              </Card>
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
