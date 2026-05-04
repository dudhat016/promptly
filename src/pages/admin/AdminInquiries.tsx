import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Mail, CheckCircle, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'resolved';
  createdAt: any;
}

export default function AdminInquiries() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMessages = async () => {
    try {
      const q = query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContactMessage)));
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: 'unread' | 'read' | 'resolved') => {
    try {
      await updateDoc(doc(db, 'contact_messages', id), { status: newStatus });
      setMessages(messages.map(m => m.id === id ? { ...m, status: newStatus } : m));
      toast.success(`Marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await deleteDoc(doc(db, 'contact_messages', id));
      setMessages(messages.filter(m => m.id !== id));
      toast.success("Message deleted");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    }
  };

  const toggleExpand = (id: string, currentStatus: string) => {
    setExpandedId(expandedId === id ? null : id);
    if (expandedId !== id && currentStatus === 'unread') {
      handleUpdateStatus(id, 'read');
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500">Loading inquiries...</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Contact Inquiries</h1>
          <p className="text-slate-500">Manage and respond to messages from your contact page.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p>No messages found. You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`transition-colors ${message.status === 'unread' ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}
              >
                <div 
                  className="p-6 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpand(message.id, message.status)}
                >
                  <div className="flex items-center gap-4 flex-grow">
                    <div className={`p-2 rounded-full ${
                      message.status === 'unread' ? 'bg-indigo-100 text-indigo-600' :
                      message.status === 'resolved' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${message.status === 'unread' ? 'text-slate-900' : 'text-slate-700'}`}>
                          {message.subject || 'No Subject'}
                        </h3>
                        {message.status === 'unread' && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                            New
                          </span>
                        )}
                        {message.status === 'resolved' && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                            Resolved
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        From <span className="font-medium text-slate-700">{message.name}</span> ({message.email}) • {message.createdAt ? new Date(message.createdAt.toMillis?.() || Date.now()).toLocaleDateString() : 'Unknown Date'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedId === message.id ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {expandedId === message.id && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                    <div className="bg-slate-50 rounded-xl p-6 mb-6">
                      <p className="text-slate-700 whitespace-pre-wrap">{message.message}</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {message.status !== 'resolved' && (
                          <button 
                            onClick={() => handleUpdateStatus(message.id, 'resolved')}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 font-semibold rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Mark Resolved
                          </button>
                        )}
                        {message.status !== 'unread' && (
                          <button 
                            onClick={() => handleUpdateStatus(message.id, 'unread')}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            <Clock className="w-4 h-4" />
                            Mark Unread
                          </button>
                        )}
                        <a 
                          href={`mailto:${message.email}?subject=Re: ${encodeURIComponent(message.subject)}`}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Reply via Email
                        </a>
                      </div>
                      <button 
                        onClick={() => handleDelete(message.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
