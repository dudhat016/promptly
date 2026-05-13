import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Mail, CheckCircle, Clock, Trash2, ChevronDown, ChevronUp, Search, Inbox } from 'lucide-react';
import { AdminPageHeader, useConfirm } from '../../components/admin';
import toast from 'react-hot-toast';
import Input from '../../components/primitives/Input';
import Button from '../../components/primitives/Button';
import Badge from '../../components/primitives/Badge';
import { cn } from '../../lib/utils';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'resolved';
  createdAt: any;
}

type FilterType = 'all' | 'unread' | 'read' | 'resolved';

export default function AdminInquiries() {
  const confirm = useConfirm();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const fetchMessages = async () => {
    try {
      const q = query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContactMessage)));
    } catch (error) {
      toast.error("Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMessages(); }, []);

  const handleUpdateStatus = async (id: string, newStatus: 'unread' | 'read' | 'resolved') => {
    try {
      await updateDoc(doc(db, 'contact_messages', id), { status: newStatus });
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
      toast.success(`Marked as ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Delete this message?', description: 'This action cannot be undone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'contact_messages', id));
      setMessages(prev => prev.filter(m => m.id !== id));
      toast.success("Message deleted");
    } catch (err) {
      toast.error("Failed to delete message");
    }
  };

  const toggleExpand = (id: string, currentStatus: string) => {
    setExpandedId(expandedId === id ? null : id);
    if (expandedId !== id && currentStatus === 'unread') {
      handleUpdateStatus(id, 'read');
    }
  };

  const formatDate = (createdAt: any) => {
    if (!createdAt) return 'Unknown';
    const date = new Date(createdAt.toMillis?.() || createdAt);
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getInitials = (name: string) =>
    (name || '?').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

  const unreadCount = messages.filter(m => m.status === 'unread').length;
  const resolvedCount = messages.filter(m => m.status === 'resolved').length;

  const filtered = messages.filter(m => {
    const matchesFilter = filter === 'all' || m.status === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const tabs: { id: FilterType; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: messages.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'read', label: 'Read' },
    { id: 'resolved', label: 'Resolved', count: resolvedCount },
  ];

  return (
    <div>
      <AdminPageHeader
        label="Support"
        labelIcon={Inbox}
        title="Contact Inquiries"
        subtitle="Manage and respond to messages from your contact page."
        actions={
          <div className="flex items-center gap-3">
            <Badge variant="error" size="sm" dot>
              {unreadCount} unread
            </Badge>
            <Badge variant="success" size="sm" dot>
              {resolvedCount} resolved
            </Badge>
            <Badge variant="soft" size="sm" className="bg-muted text-muted-foreground">
              {messages.length} total
            </Badge>
          </div>
        }
      />

      {/* Filter tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              variant={filter === tab.id ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                "px-3 py-1.5 h-auto font-medium gap-1.5",
                filter === tab.id ? 'bg-card text-foreground shadow-sm border-border' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                  filter === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  {tab.count}
                </span>
              )}
            </Button>
          ))}
        </div>

          <Input
            id="inquirySearch"
            name="inquirySearch"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, subject..."
            leftIcon={Search}
            className="w-72"
            variant="filled"
          />
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading inquiries...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Inbox className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">No messages found</h3>
            <p className="text-sm text-muted-foreground">
              {search ? 'Try a different search term.' : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((message) => (
              <div
                key={message.id}
                className={message.status === 'unread' ? 'bg-primary/5' : ''}
              >
                {/* Row header */}
                <div
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => toggleExpand(message.id, message.status)}
                >
                  <div className="flex items-center gap-4 flex-grow min-w-0">
                    {/* Sender initials avatar */}
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                      message.status === 'unread' ? 'bg-primary/10 text-primary' :
                      message.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {getInitials(message.name)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {message.subject || 'No Subject'}
                        </h3>
                        {message.status === 'unread' && (
                          <Badge variant="error" size="sm">New</Badge>
                        )}
                        {message.status === 'resolved' && (
                          <Badge variant="success" size="sm">Resolved</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        <span className="font-medium text-foreground">{message.name}</span>
                        {' '}·{' '}{message.email}
                        {' '}·{' '}{formatDate(message.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 ml-3">
                    {expandedId === message.id
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                </div>

                {/* Expanded content */}
                {expandedId === message.id && (
                  <div className="px-5 pb-5 pt-0 border-t border-border bg-muted/20">
                    <div className="border-l-2 border-primary/20 pl-4 py-3 my-4 bg-card rounded-r-md">
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {message.message}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {message.status !== 'resolved' && (
                          <Button
                            onClick={() => handleUpdateStatus(message.id, 'resolved')}
                            variant="secondary"
                            size="sm"
                            leftIcon={CheckCircle}
                            className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                          >
                            Mark Resolved
                          </Button>
                        )}
                        {message.status !== 'unread' && (
                          <Button
                            onClick={() => handleUpdateStatus(message.id, 'unread')}
                            variant="secondary"
                            size="sm"
                            leftIcon={Clock}
                          >
                            Mark Unread
                          </Button>
                        )}
                        <Button
                          as="a"
                          href={`mailto:${message.email}?subject=Re: ${encodeURIComponent(message.subject)}`}
                          variant="primary"
                          size="sm"
                          leftIcon={Mail}
                        >
                          Reply via Email
                        </Button>
                      </div>

                      <Button
                        onClick={() => handleDelete(message.id)}
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                        title="Delete message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
