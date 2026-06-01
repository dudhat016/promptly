import { collection, getDocs, orderBy, query, where, doc, updateDoc, serverTimestamp, addDoc, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import {
  AlertTriangle, Clock, CreditCard, FileText, RefreshCw, Shield, Sparkles, X,
  Zap, PauseCircle, ArrowDownCircle, Frown, ChevronRight, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { toast } from 'react-hot-toast';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import Textarea from '../../components/primitives/Textarea';
import Spinner from '../../components/feedback/Spinner';
import { PaymentService } from '../../services/paymentService';

const CANCEL_REASONS = [
  { id: 'too_expensive',    label: 'Too expensive',             offer: 'pause'    },
  { id: 'not_using',        label: "Not using it enough",       offer: 'pause'    },
  { id: 'missing_feature',  label: 'Missing a feature I need',  offer: 'feedback' },
  { id: 'switching',        label: 'Switching to another tool', offer: null       },
  { id: 'other',            label: 'Other reason',              offer: null       },
];

export default function BillingSettings() {
  const { isPro, profile, user } = useAuth();
  const { prefix } = usePath();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showAutoRenewConfirm, setShowAutoRenewConfirm] = useState(false);
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);
  const [cancelStep, setCancelStep] = useState<'reason' | 'offer' | 'confirm'>('reason');
  const [cancelReason, setCancelReason] = useState('');
  const [pauseApplying, setPauseApplying] = useState(false);

  useEffect(() => {
    if (user?.uid) fetchOrders();
  }, [user]);

  async function fetchOrders() {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
      );
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err: any) {
      console.error('Error fetching orders:', err);
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
      const pauseUntil = new Date();
      pauseUntil.setDate(pauseUntil.getDate() + 30);
      await updateDoc(doc(db, 'users', user.uid), {
        pausedUntil: pauseUntil,
        subscriptionStatus: 'pro',
        autoPayEnabled: false,
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
      toast.success("Subscription paused for 30 days. We'll see you back!");
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
        paypalSubscriptionId: profile?.paypalSubscriptionId,
      });
      toast.success('Subscription cancelled. Access continues until the end of your billing period.');
      setShowCancelConfirm(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Cancellation failed. Please contact support.');
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

  const currentOffer = CANCEL_REASONS.find(r => r.id === cancelReason)?.offer;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* ── Subscription ─────────────────────────────────────── */}
      <Card className="!rounded-lg">
        <Card.Header
          title={<div className="flex items-center gap-3"><div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0"><CreditCard className="w-4 h-4" /></div><div><h3 className="text-sm font-bold text-foreground">Subscription</h3><p className="text-xs text-muted-foreground mt-0.5">Your current plan, billing cycle, and renewal settings.</p></div></div>}
        />
        <Card.Body>
        <div className="space-y-6">

          {/* Trial countdown */}
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

          {/* Free plan upgrade CTA */}
          {!isPro ? (
            <div className="bg-foreground text-background rounded-xl p-6 relative overflow-hidden group shadow-xl">
              <Zap className="w-40 h-40 absolute -right-10 -bottom-10 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
              <div className="relative z-10 max-w-md">
                <div className="bg-background/10 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 backdrop-blur-md border border-background/20">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Most Popular Upgrade
                </div>
                <h3 className="text-3xl font-bold mb-3 tracking-tighter">Go Pro. Be Expert.</h3>
                <p className="opacity-60 text-sm mb-6 leading-relaxed">
                  Unlock priority AI model access, unlimited library storage, and advanced prompt engineering tools.
                </p>
                <Button as={Link} to={prefix('/pricing')} variant="primary" size="md">
                  View Pricing Plans
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Active Pro card */}
              <div className="bg-gradient-to-br from-primary to-primary/60 rounded-xl p-6 text-primary-foreground relative overflow-hidden shadow-md shadow-primary/20">
                <Shield className="w-40 h-40 absolute -right-10 -bottom-10 opacity-5 -rotate-12" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-white/80" />
                      <h3 className="text-2xl font-bold text-white tracking-tight">
                        {profile?.subscriptionStatus?.toUpperCase()} Member
                      </h3>
                    </div>
                    {profile?.cancelAtPeriodEnd && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                        Cancels {nextBillingDate || 'soon'}
                      </span>
                    )}
                  </div>

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
                      <div className="flex items-center gap-1.5 text-white/40 text-xs uppercase tracking-widest">
                        via {profile.subscriptionGateway}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      as={Link}
                      to={prefix('/pricing')}
                      variant="secondary"
                      size="sm"
                      className="bg-white/10 text-white hover:bg-white/20 border-white/10 backdrop-blur-sm"
                    >
                      Change Plan
                    </Button>

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
                        className="text-white/30 hover:text-rose-300 text-xs uppercase tracking-widest font-bold"
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
                    className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <ToggleRight className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground text-sm">Turn off auto-renew?</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your subscription won't renew automatically. You'll keep Pro access until{' '}
                          <span className="font-semibold text-foreground">{nextBillingDate || 'the end of your billing period'}</span>,
                          then revert to Free.
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

              {/* Multi-step cancellation flow */}
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
                      <div className="p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <Frown className="w-5 h-5 text-rose-500 shrink-0" />
                          <p className="font-semibold text-foreground text-sm">Before you go — what's the reason?</p>
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
                        <div className="flex gap-3">
                          <Button
                            onClick={() => setCancelStep(currentOffer ? 'offer' : 'confirm')}
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

                    {/* Step 2: Offer */}
                    {cancelStep === 'offer' && (
                      <div className="p-5 space-y-4">
                        {currentOffer === 'pause' ? (
                          <>
                            <div className="flex items-center gap-3">
                              <PauseCircle className="w-5 h-5 text-amber-500 shrink-0" />
                              <p className="font-semibold text-foreground text-sm">How about a 30-day pause instead?</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              We'll pause your billing for 30 days. Pro access stays active and you won't be charged during the pause.
                            </p>
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-700 font-medium">
                              No charge for 30 days · Pro access continues · Resume anytime
                            </div>
                            <div className="flex gap-3">
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
                              <Button onClick={() => setCancelStep('confirm')} variant="ghost" size="sm" className="text-xs text-muted-foreground">
                                No thanks, still cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <ArrowDownCircle className="w-5 h-5 text-primary shrink-0" />
                              <p className="font-semibold text-foreground text-sm">Tell us what's missing</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              We ship new features every week. What would make Promptly worth keeping?
                            </p>
                            <Textarea
                              placeholder="e.g. I need better export options, or API access..."
                              rows={3}
                              onChange={e => setCancelReason(`missing_feature:${e.target.value}`)}
                              variant="outline"
                            />
                            <div className="flex gap-3">
                              <Button onClick={() => setShowCancelConfirm(false)} variant="secondary" size="sm">
                                Keep Subscription
                              </Button>
                              <Button onClick={() => setCancelStep('confirm')} variant="ghost" size="sm" className="text-rose-500 text-xs">
                                Still cancel
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Step 3: Final confirm */}
                    {cancelStep === 'confirm' && (
                      <div className="p-5 space-y-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-foreground text-sm">Cancel your subscription?</p>
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
        </div>
        </Card.Body>
      </Card>

      {/* ── Order History ─────────────────────────────────────── */}
      <Card className="!rounded-lg">
        <Card.Header
          title={<div className="flex items-center gap-3"><div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></div><div><h3 className="text-sm font-bold text-foreground">Order History</h3><p className="text-xs text-muted-foreground mt-0.5">All past purchases and subscription payments.</p></div></div>}
        />
        <Card.Body>
        {loading ? (
          <div className="py-12 text-center">
            <Spinner size="lg" className="mx-auto mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Syncing records…</p>
          </div>
        ) : orders.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left">
              <thead className="bg-muted/50">
                <tr className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Plan</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-muted-foreground">
                      {order.createdAt?.toDate().toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-foreground">{order.planName}</p>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{order.billingCycle}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-foreground">
                      ${order.amount}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/20 rounded-xl border-2 border-dashed border-border">
            <FileText className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-bold text-muted-foreground">No orders yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your purchase history will appear here.</p>
          </div>
        )}
        </Card.Body>
      </Card>

    </motion.div>
  );
}
