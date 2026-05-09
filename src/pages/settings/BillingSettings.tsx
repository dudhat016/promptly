import { collection, getDocs, orderBy, query, where, updateDoc, doc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { CreditCard, Zap, Shield, ChevronRight, Check, Clock, FileText, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Button from '../../components/ui/Button';

export default function BillingSettings() {
  const { isPro, profile, user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      fetchOrders();
    }
  }, [user]);

  async function fetchOrders() {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err: any) {
      console.error("Error fetching orders:", err);
      if (err.message?.includes('index')) {
        console.warn("Firestore Index Required: Please click the link in the console error above to create the composite index for 'orders'.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="bg-card rounded-lg p-6 border border-border shadow-sm space-y-10 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold flex items-center gap-3 text-foreground">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-md flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              Plan & Billing
            </h2>
            <div className="flex items-center gap-2">
              <span className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-[0.2em] ${isPro ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-muted text-muted-foreground'}`}>
                {profile?.subscriptionStatus?.toUpperCase() || 'FREE'} STATUS
              </span>
            </div>
        </div>

        {!isPro ? (
          <div className="bg-foreground text-background rounded-lg p-6 relative overflow-hidden group shadow-2xl">
              <Zap className="w-48 h-48 absolute -right-12 -bottom-12 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
              <div className="relative z-10 max-w-md">
                <div className="bg-background/10 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-md border border-background/20">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Most Popular Upgrade
                </div>
                <h3 className="text-4xl font-bold mb-4 tracking-tighter">Go Pro. Be Expert.</h3>
                <p className="opacity-60 text-sm mb-10 leading-relaxed font-medium">Unlock priority AI model access, unlimited library storage, and advanced prompt engineering tools.</p>
                <Button as={Link} to="/pricing" variant="primary" size="lg">
                  View Pricing Plans
                </Button>
              </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary to-primary-foreground/10 rounded-lg p-6 text-primary-foreground relative overflow-hidden shadow-md shadow-primary/20">
              <Shield className="w-48 h-48 absolute -right-12 -bottom-12 opacity-5 -rotate-12" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Check className="w-6 h-6 p-1 bg-card text-primary rounded-full" />
                  <h3 className="text-3xl font-bold text-white">PRO Member</h3>
                </div>
                <p className="text-white/60 text-sm mb-10 leading-relaxed max-w-md font-medium">Your subscription is active. You have full access to all professional prompt engineering tools.</p>
                
                <div className="flex flex-wrap gap-4">
                  <Button 
                    as={Link} 
                    to="/pricing" 
                    variant="secondary" 
                    size="lg" 
                    className="bg-card/10 text-white hover:bg-card/20 border-white/5 backdrop-blur-sm"
                  >
                    Upgrade/Downgrade
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-white/40 hover:text-white/80 uppercase tracking-widest font-bold"
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to cancel? You will lose Pro access immediately.")) {
                        try {
                          await updateDoc(doc(db, 'users', user!.uid), {
                            subscriptionStatus: 'free',
                            activePlanId: 'free',
                            credits: 5,
                            updatedAt: new Date()
                          });
                          toast.success("Subscription cancelled.");
                          window.location.reload();
                        } catch (e) {
                          toast.error("Cancellation failed.");
                        }
                      }
                    }}
                  >
                    Cancel Subscription
                  </Button>
                </div>
              </div>
          </div>
        )}

        <div className="pt-8 border-t border-border">
          <div className="flex items-center justify-between mb-8">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Order History</h4>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Syncing Records...</p>
              </div>
            ) : orders.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-left">
                  <thead className="bg-muted/50">
                    <tr className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Plan</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map(order => (
                      <tr key={order.id} className="group hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-5 text-sm font-bold text-muted-foreground">
                          {order.createdAt?.toDate().toLocaleDateString()}
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-bold text-foreground">{order.planName}</p>
                          <p className="text-xs font-bold text-muted-foreground uppercase">{order.billingCycle}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                            {order.currency === 'INR' ? 'â‚¹' : '$'}{order.amount}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-2 py-1 rounded-lg text-[8px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-md border border-dashed border-border">
                <FileText className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm font-bold text-muted-foreground">No orders found yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Sparkles(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
