import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, LifeBuoy } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  updatedAt: any;
  messages: any[];
}

export default function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // New Ticket State
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    if (user) loadTickets();
  }, [user]);

  const loadTickets = async () => {
    try {
      const res = await fetch(`/api/support/tickets/user/${user?.uid}`);
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;

    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          userEmail: user?.email,
          subject,
          message,
          priority
        })
      });
      
      if (res.ok) {
        toast.success("Ticket created successfully!");
        setSubject('');
        setMessage('');
        setIsCreating(false);
        loadTickets();
      }
    } catch (err) {
      toast.error("Failed to create ticket");
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-foreground mb-2 flex items-center gap-3">
              <LifeBuoy className="w-10 h-10 text-indigo-600" />
              Support Hub
            </h1>
            <p className="text-muted-foreground">Need help? Our neural assistance team is here for you.</p>
          </div>
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200"
          >
            {isCreating ? 'View My Tickets' : 'Open New Ticket'}
          </button>
        </div>

        {isCreating ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-2xl shadow-indigo-100/50">
            <form onSubmit={handleCreateTicket} className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Subject</label>
                <input 
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 font-bold focus:ring-2 focus:ring-indigo-500"
                  placeholder="What can we help you with?"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Priority</label>
                  <select 
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 font-bold focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Message</label>
                <textarea 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 font-bold focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe your issue in detail..."
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Submit Ticket
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold">No tickets yet. We're here if you need us!</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <div key={ticket.id} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      ticket.status === 'resolved' ? 'bg-green-50 text-green-600' : 
                      ticket.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      {ticket.status === 'resolved' ? <CheckCircle className="w-6 h-6" /> : 
                       ticket.status === 'pending' ? <Clock className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900">{ticket.subject}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID: {ticket.id.slice(0, 8)}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                          ticket.priority === 'high' ? 'text-rose-500' : 'text-slate-400'
                        }`}>{ticket.priority} Priority</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      ticket.status === 'resolved' ? 'bg-green-100 text-green-700' : 
                      ticket.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
