import { useState, useEffect } from 'react';
import { MessageSquare, Clock, CheckCircle, AlertCircle, Search, User, Send } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import Select from '../../components/primitives/Select';
import Input from '../../components/primitives/Input';
import Textarea from '../../components/primitives/Textarea';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import Badge from '../../components/primitives/Badge';
import { cn } from '../../lib/utils';

interface Ticket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  lastMessageAt: any;
  messages: {
    senderId: string;
    senderRole: 'user' | 'admin';
    text: string;
    createdAt: any;
  }[];
}

export default function AdminTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const ticketsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
      setTickets(ticketsData);
      setLoading(false);
      
      // Update selected ticket data if it's currently open
      if (selectedTicket) {
        const updated = ticketsData.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    }, (err) => {
      console.error(err);
      toast.error("Failed to load tickets");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedTicket?.id]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'tickets', id), {
        status,
        updatedAt: serverTimestamp()
      });
      toast.success(`Status updated to ${status}`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleSendReply = async () => {
    if (!reply.trim() || !selectedTicket || !user) return;
    try {
      const newMessage = {
        senderId: user.uid,
        senderRole: 'admin',
        text: reply,
        createdAt: new Date() // Use local date for immediate UI feel, Firestore will handle serverTimestamp if we used it in messages array
      };

      await updateDoc(doc(db, 'tickets', selectedTicket.id), {
        messages: arrayUnion({
          ...newMessage,
          createdAt: serverTimestamp()
        }),
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'pending' // Automatically mark as pending when admin replies
      });
      
      toast.success("Reply sent");
      setReply('');
    } catch (err) {
      console.error(err);
      toast.error("Failed to send reply");
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <AdminPageHeader
        label="Support"
        labelIcon={MessageSquare}
        title="Support Tickets"
        subtitle="Manage user inquiries and resolve issues across the platform."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1 space-y-3">
          <Input
            id="ticketSearch"
            name="ticketSearch"
            type="text"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            leftIcon={Search}
            variant="outline"
          />

          <div className="space-y-2 overflow-y-auto max-h-[70vh]">
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No tickets found.</div>
            ) : filteredTickets.map(ticket => (
              <Button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                variant={selectedTicket?.id === ticket.id ? 'primary' : 'outline'}
                size="lg"
                fullWidth
                className={cn(
                  "text-left h-auto p-4 flex-col items-start gap-0",
                  selectedTicket?.id === ticket.id
                    ? "border-primary text-primary-foreground shadow-sm"
                    : "bg-card border-border text-foreground hover:border-primary/30"
                )}
              >
                <div className="flex items-center justify-between mb-2 w-full">
                  <Badge 
                    variant={
                      ticket.status === 'open' ? 'error' :
                      ticket.status === 'pending' ? 'warning' : 'success'
                    }
                    size="sm"
                    dot
                    className={selectedTicket?.id === ticket.id ? 'bg-primary-foreground/20 text-primary-foreground border-transparent' : ''}
                  >
                    {ticket.status}
                  </Badge>
                  <Badge 
                    variant={
                      ticket.priority === 'high' ? 'error' :
                      ticket.priority === 'medium' ? 'warning' : 'info'
                    }
                    size="sm"
                    className={cn(
                      "lowercase",
                      selectedTicket?.id === ticket.id ? 'bg-primary-foreground/10 text-primary-foreground' : ''
                    )}
                  >
                    {ticket.priority}
                  </Badge>
                </div>
                <h3 className="text-sm font-bold truncate mb-0.5 w-full">{ticket.subject}</h3>
                <p className={`text-[11px] truncate w-full ${selectedTicket?.id === ticket.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {ticket.userEmail}
                </p>
              </Button>
            ))}
          </div>
        </div>

        {/* Ticket Details / Chat */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <Card padding="none" className="h-[80vh]">
              <Card.Header
                title={
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{selectedTicket.subject}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <User className="w-3 h-3" /> {selectedTicket.userEmail}
                    </p>
                  </div>
                }
                action={
                  <div className="w-40">
                    <Select
                      value={selectedTicket.status}
                      onChange={(val) => handleUpdateStatus(selectedTicket.id, val)}
                      options={[
                        { label: 'Open', value: 'open', description: 'User needs attention' },
                        { label: 'Pending', value: 'pending', description: 'Waiting for user response' },
                        { label: 'Resolved', value: 'resolved', description: 'Issue has been closed' }
                      ]}
                      isSearchable={false}
                    />
                  </div>
                }
              />

              {/* Messages */}
              <Card.Body className="overflow-y-auto p-5 space-y-4 bg-muted/30">
                {selectedTicket.messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-lg text-sm ${
                      msg.senderRole === 'admin'
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-card text-foreground rounded-tl-none border border-border'
                    }`}>
                      <p className="leading-relaxed">{msg.text}</p>
                      <span className={`text-xs font-medium block mt-2 opacity-70 ${
                        msg.senderRole === 'admin' ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`}>
                        {msg.senderRole === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </div>
                  </div>
                ))}
              </Card.Body>

              {/* Reply Area */}
              <Card.Footer>
                <div className="flex gap-3">
                  <Textarea
                    id="ticketReply"
                    name="ticketReply"
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Type your response..."
                    className="flex-grow min-h-[60px]"
                    rows={2}
                    variant="outline"
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={!reply.trim()}
                    variant="primary"
                    size="md"
                    leftIcon={Send}
                    className="self-end px-6 font-bold"
                  >
                    Send
                  </Button>
                </div>
              </Card.Footer>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-muted/50 rounded-lg border-2 border-dashed border-border p-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <h2 className="text-sm font-semibold text-muted-foreground">Select a ticket to view conversation</h2>
              <p className="text-xs text-muted-foreground mt-1">Manage your users' inquiries from here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
