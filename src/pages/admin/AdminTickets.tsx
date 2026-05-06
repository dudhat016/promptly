import { useState, useEffect } from 'react';
import { MessageSquare, Clock, CheckCircle, AlertCircle, Search, User } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Ticket {
  id: string;
  userEmail: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  lastMessageAt: any;
  messages: any[];
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const res = await fetch('/api/support/admin/tickets');
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/support/admin/tickets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      toast.success(`Status updated to ${status}`);
      loadTickets();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 mb-2">Support Tickets</h1>
        <p className="text-slate-500">Manage user inquiries and resolve issues across the platform.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ticket List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 font-bold focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[70vh]">
            {tickets.map(ticket => (
              <button 
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`w-full text-left p-6 rounded-2xl border transition-all ${
                  selectedTicket?.id === ticket.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-white border-slate-100 text-slate-900 hover:border-indigo-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                    selectedTicket?.id === ticket.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {ticket.status}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                    {ticket.priority}
                  </span>
                </div>
                <h3 className="font-black truncate mb-1">{ticket.subject}</h3>
                <p className={`text-xs truncate ${selectedTicket?.id === ticket.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                  {ticket.userEmail}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Ticket Details / Chat */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-white border border-slate-100 rounded-3xl h-[80vh] flex flex-col shadow-sm">
              {/* Header */}
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{selectedTicket.subject}</h2>
                  <p className="text-slate-500 text-sm font-bold flex items-center gap-2 mt-1">
                    <User className="w-4 h-4" /> {selectedTicket.userEmail}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value)}
                    className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-grow overflow-y-auto p-8 space-y-6 bg-slate-50/50">
                {selectedTicket.messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-6 rounded-3xl shadow-sm ${
                      msg.senderRole === 'admin' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'
                    }`}>
                      <p className="font-bold leading-relaxed">{msg.text}</p>
                      <span className={`text-[10px] font-black uppercase tracking-widest block mt-3 opacity-60 ${
                        msg.senderRole === 'admin' ? 'text-indigo-100' : 'text-slate-400'
                      }`}>
                        {msg.senderRole === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Area */}
              <div className="p-8 border-t border-slate-50">
                <div className="flex gap-4">
                  <textarea 
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Type your response..."
                    className="flex-grow bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                  />
                  <button className="bg-indigo-600 text-white px-8 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200">
                    Send Reply
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
              <MessageSquare className="w-16 h-16 text-slate-300 mb-6" />
              <h2 className="text-2xl font-black text-slate-400">Select a ticket to view conversation</h2>
              <p className="text-slate-400 font-bold mt-2">Manage your users' inquiries with neural precision.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
