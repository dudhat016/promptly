import { collection, getDocs, orderBy, query, where, doc, updateDoc, serverTimestamp, addDoc, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { AlertTriangle, Clock, CreditCard, FileText, RefreshCw, Shield, X, Zap, PauseCircle, ArrowDownCircle, Frown, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { toast } from 'react-hot-toast';
import Button from '../../components/primitives/Button';
import { PaymentService } from '../../services/paymentService';

export default function BillingSettings() {
  const { isPro, profile, user } = useAuth();
  const { prefix } = usePath();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showAutoRenewConfirm, setShowAutoRenewConfirm] = useState(false);
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);
  // Multi-step cancel save flow
  const [cancelStep, setCancelStep] = useState<'reason' | 'offer' | 'confirm'>('reason');
  const [cancelReason, setCancelReason] = useState('');
  const [pauseApplying, setPauseApplying] = useState(false);

  const CANCEL_REASONS = [
    { id: 'too_expensive', label: 'Too expensive', offer: 'pause' },
    { id: 'not_using', label: "Not using it enough", offer: 'pause' },
    { id: 'missing_feature', label: 'Missing a feature I need', offer: 'feedback' },
    { id: 'switching', label: 'Switching to another tool', offer: null },
    { id: 'other', label: 'Other reason', offer: null },
  ];

  useEffect(() => {
    if (user?.uid) fetchOrders();
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
    } finally {
      setLoading(false);
    }
  }

  function openCancelFlow() {
    setCancelStep('reason');
    setCancelReason('');
    setShowCancelConfirm(true);
  }

  async function handlePauseSubscription() {
    if (!user?.uid) return;
    setPauseApplying(true);
    try {
      // Pause = extend currentPeriodEnd by 30 days without charging
      const pauseUntil = new Date();
      pauseUntil.setDate(pauseUntil.getDate() + 30);
      await updateDoc(doc(db, 'users', user.uid), {
        pausedUntil: pauseUntil,
        subscriptionStatus: 'pro', // Keep pro during pause
        autoPayEnabled: false,     // Stop auto-billing during pause
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'dunning_events'), {
        userId: user.uid,
        userEmail: user.email,
        event: 'subscription_paused',
        pauseUntil,
        cancelReason,
        createdAt: serverTimestamp(),
      });
      toast.success('Subscription paused for 30 days. We\'ll see you back!');
      setShowCancelConfirm(false);
    } catch {
      toast.error('Failed to pause subscription.');
    } finally {
      setPauseApplying(false);
    }
  }

  async function handleDisableAutoRenew() {
    if (!user?.uid) return;
    setTogglingAutoRenew(true);
    try {
      // Cancel recurring schedule on gateway — access stays until currentPeriodEnd
      await PaymentService.cancelSubscription({
        customerId: user.uid,
        subscriptionGateway: profile?.subscriptionGateway,
        subscriptionId: profile?.subscriptionId,
        paypalSubscriptionId: profile?.paypalSubscriptionId,
      });
      setShowAutoRenewConfirm(false);
      toast.success('Auto-renew turned off. Your access continues until the end of your billing period.');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to turn off auto-renew. Please contact support.');
    } finally {
      setTogglingAutoRenew(false);
    }
  }

  async function handleCancelSubscription() {
    if (!user?.uid) return;
    setCancelling(true);
    try {
      // Save cancellation reason for product analytics
      if (cancelReason) {
        await addDoc(collection(db, 'cancellation_feedback'), {
          userId: user.uid,
          userEmail: user.email,
          reason: cancelReason,
          plan: profile?.activePlanId,
          createdAt: serverTimestamp(),
        });
      }
      await PaymentService.cancelSubscription({
        customerId: user.uid,
        subscriptionGateway: profile?.subscriptionGateway,
        subscriptionId: profile?.subscriptionId,
        paypalSubscriptionId: profile?.paypalSubscriptionId
      });
      toast.success("Subscription cancelled. Access continues until the end of your billing period.");
      setShowCancelConfirm(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Cancellation failed. Please contact support.");
    } finally {
      setCancelling(false);
    }
  }

  const nextBillingDate = profile?.currentPeriodEnd?.toDate
    ? profile.currentPeriodEnd.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const trialEndsDate: Date | null = (() => {
    const t = profile?.trialEndsAt;
    if (!t) return null;
    if (t instanceof Timestamp) return t.toDate();
    if (typeof t === 'object' && t.seconds) return new Date(t.seconds * 1000);
    return null;
  })();
  const trialDaysLeft = trialEndsDate
    ? Math.max(0, Math.ceil((trialEndsDate.getTime() - Date.now()) / 86400000))
    : null;
  const isOnTrial = trialDaysLeft !== null && trialDaysLeft >= 0 && isPro;

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

        {/* Trial countdown banner */}
        {isOnTrial && (
          <div className="rounded-xl p-4 flex items-start justify-between gap-4 bg-amber-500/8 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-600">
                  {trialDaysLeft === 0 ? 'Trial ends today!' : `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left in your trial`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Trial ends {trialEndsDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. Activate Pro to keep your access.
                </p>
              </div>
            </div>
            <Button as={Link} to={prefix('/pricing')} variant="primary" size="sm" className="shrink-0">
              Activate Pro
            </Button>
          </div>
        )}

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
              <Button as={Link} to={prefix('/pricing')} variant="primary" size="lg">
                View Pricing Plans
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-primary to-primary-foreground/10 rounded-lg p-6 text-primary-foreground relative overflow-hidden shadow-md shadow-primary/20">
              <Shield className="w-48 h-48 absolute -right-12 -bottom-12 opacity-5 -rotate-12" />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-6 h-6 text-white" />
                    <h3 className="text-3xl font-bold text-white">
                      {profile?.subscriptionStatus?.toUpperCase()} Member
                    </h3>
                  </div>
                  {profile?.cancelAtPeriodEnd && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                      Cancels {nextBillingDate || 'soon'}
                    </span>
                  )}
                </div>

                {/* Subscription metadata */}
                <div className="flex flex-wrap gap-4 mb-6 text-sm">
                  {profile?.autoPayEnabled && !profile?.cancelAtPeriodEnd && (
                    <div className="flex items-center gap-1.5 text-white/70">
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Auto-renews {nextBillingDate ? `on ${nextBillingDate}` : 'monthly'}</span>
                    </div>
                  )}
                  {!profile?.autoPayEnabled && nextBillingDate && (
                    <div className="flex items-center gap-1.5 text-white/70">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Active until {nextBillingDate}</span>
                    </div>
                  )}
                  {profile?.subscriptionGateway && (
                    <div className="flex items-center gap-1.5 text-white/50 text-xs uppercase tracking-widest">
                      via {profile.subscriptionGateway}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4">
                  <Button
                    as={Link}
                    to={prefix('/pricing')}
                    variant="secondary"
                    size="lg"
                    className="bg-card/10 text-white hover:bg-card/20 border-white/5 backdrop-blur-sm"
                  >
                    Change Plan
                  </Button>

                  {/* Auto-renew toggle */}
                  {profile?.autoPayEnabled && !profile?.cancelAtPeriodEnd ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={ToggleRight}
                      className="text-white/60 hover:text-amber-300 font-semibold"
                      onClick={() => setShowAutoRenewConfirm(true)}
                    >
                      Turn off Auto-renew
                    </Button>
                  ) : !profile?.cancelAtPeriodEnd && (
                    <Button
                      as={Link}
                      to={prefix('/pricing')}
                      variant="ghost"
                      size="sm"
                      leftIcon={ToggleLeft}
                      className="text-white/40 hover:text-emerald-300 font-semibold"
                    >
                      Re-enable Auto-renew
                    </Button>
                  )}

                  {!profile?.cancelAtPeriodEnd && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/40 hover:text-rose-300 uppercase tracking-widest font-bold"
                      onClick={openCancelFlow}
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Auto-renew disable confirm */}
            <AnimatePresence>
              {showAutoRenewConfirm && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-4"
                >
                  <div className="flex items-start gap-3">
                    <ToggleRight className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">Turn off auto-renew?</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your subscription won't renew automatically. You'll keep Pro access until{' '}
                        <span className="font-semibold text-foreground">{nextBillingDate || 'the end of your billing period'}</span>,
                        after which your plan will revert to Free.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleDisableAutoRenew}
                      isLoading={togglingAutoRenew}
                      variant="secondary"
                      size="sm"
                      leftIcon={ToggleLeft}
                      className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                    >
                      Yes, Turn off Auto-renew
                    </Button>
                    <Button onClick={() => setShowAutoRenewConfirm(false)} variant="ghost" size="sm">
                      Keep Auto-renew On
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Multi-step cancellation save flow */}
            <AnimatePresence>
            {showCancelConfirm && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl border border-rose-500/20 bg-rose-500/5 overflow-hidden"
              >
                {/* Step 1: Reason */}
                {cancelStep === 'reason' && (
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Frown className="w-5 h-5 text-rose-500 shrink-0" />
                      <p className="font-semibold text-foreground">Before you go — what's the reason?</p>
                    </div>
                    <div className="space-y-2">
                      {CANCEL_REASONS.map(r => (
                        <button
                          key={r.id}
                          onClick={() => setCancelReason(r.id)}
                          className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-between ${
                            cancelReason === r.id
                              ? 'border-rose-500/50 bg-rose-500/10 text-foreground'
                              : 'border-border bg-background/50 text-muted-foreground hover:border-rose-500/30'
                          }`}
                        >
                          {r.label}
                          {cancelReason === r.id && <ChevronRight className="w-4 h-4 text-rose-500" />}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={() => {
                          const reason = CANCEL_REASONS.find(r => r.id === cancelReason);
                          setCancelStep(reason?.offer ? 'offer' : 'confirm');
                        }}
                        disabled={!cancelReason}
                        variant="secondary"
                        size="sm"
                        className="border-rose-500/30 text-rose-500"
                        rightIcon={ChevronRight}
                      >
                        Continue
                      </Button>
                      <Button onClick={() => setShowCancelConfirm(false)} variant="ghost" size="sm">
                        Keep Subscription
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Offer (pause or feedback) */}
                {cancelStep === 'offer' && (
                  <div className="p-6 space-y-4">
                    {CANCEL_REASONS.find(r => r.id === cancelReason)?.offer === 'pause' ? (
                      <>
                        <div className="flex items-center gap-3">
                          <PauseCircle className="w-5 h-5 text-amber-500 shrink-0" />
                          <p className="font-semibold text-foreground">How about a 30-day pause instead?</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          We'll pause your billing for 30 days. Your Pro access stays active, and you won't be charged during the pause.
                        </p>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-700 font-medium">
                          No charge for 30 days · Pro access continues · Resume anytime
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button
                            onClick={handlePauseSubscription}
                            isLoading={pauseApplying}
                            variant="secondary"
                            size="sm"
                            leftIcon={PauseCircle}
                            className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                          >
                            Pause for 30 Days
                          </Button>
                          <Button onClick={() => setCancelStep('confirm')} variant="ghost" size="sm" className="text-muted-foreground text-xs">
                            No thanks, still cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <ArrowDownCircle className="w-5 h-5 text-primary shrink-0" />
                          <p className="font-semibold text-foreground">Tell us what's missing</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          We ship new features every week. What would make Promptly worth keeping?
                        </p>
                        <textarea
                          placeholder="e.g. I need better export options, or API access..."
                          className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/30"
                          onChange={e => setCancelReason(`missing_feature:${e.target.value}`)}
                        />
                        <div className="flex gap-3 pt-1">
                          <Button onClick={() => setCancelStep('confirm')} variant="ghost" size="sm" className="text-rose-500 text-xs">
                            Still cancel
                          </Button>
                          <Button onClick={() => setShowCancelConfirm(false)} variant="secondary" size="sm">
                            Keep Subscription
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Step 3: Final confirm */}
                {cancelStep === 'confirm' && (
                  <div className="p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground">Cancel your subscription?</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {profile?.autoPayEnabled
                            ? `Auto-renewal stops. You keep Pro access until ${nextBillingDate || 'end of billing period'}.`
                            : `Your subscription ends on ${nextBillingDate || 'the billing period end'}.`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleCancelSubscription}
                        isLoading={cancelling}
                        variant="secondary"
                        size="sm"
                        leftIcon={X}
                        className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                      >
                        Yes, Cancel
                      </Button>
                      <Button onClick={() => setShowCancelConfirm(false)} variant="ghost" size="sm">
                        Keep Subscription
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            </AnimatePresence>
          </>
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
