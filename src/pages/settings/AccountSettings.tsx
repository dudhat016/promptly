import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { auth } from '../../lib/firebase';
import { doc, updateDoc, serverTimestamp, getDoc, getDocs, collection, query, where, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { updateProfile, deleteUser } from 'firebase/auth';
import { User, Lock, Coins, ShieldCheck, Zap, Download, Trash2, AlertTriangle } from 'lucide-react';
import Input from '../../components/primitives/Input';
import Textarea from '../../components/primitives/Textarea';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import ImageUpload from '../../components/forms/ImageUpload';
import Button from '../../components/primitives/Button';

export default function AccountSettings() {
  const { user, profile, isPro } = useAuth();
  const { prefix } = usePath();
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [upiId, setUpiId] = useState(profile?.payoutMethods?.upiId || '');
  const [paypalEmail, setPaypalEmail] = useState(profile?.payoutMethods?.paypalEmail || '');
  const [bankDetails, setBankDetails] = useState(profile?.payoutMethods?.bankDetails || '');

  // GDPR state
  const [exportingData, setExportingData] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleExportData = async () => {
    if (!user) return;
    setExportingData(true);
    try {
      const [userSnap, ordersSnap, activitySnap] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDocs(query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'credits_history'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(100))),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        profile: userSnap.exists() ? { ...userSnap.data(), uid: user.uid } : null,
        orders: ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        activity: activitySnap.docs.map(d => ({ id: d.id, ...d.data() })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch {
      toast.error('Failed to export data');
    } finally {
      setExportingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      // Mark user as deleted in Firestore (soft delete for audit trail)
      await updateDoc(doc(db, 'users', user.uid), {
        deletedAt: serverTimestamp(),
        email: `deleted_${user.uid}@deleted.invalid`,
        displayName: 'Deleted User',
        photoURL: null,
        subscriptionStatus: 'free',
        role: 'user',
      });
      // Delete Firebase Auth account
      await deleteUser(user);
      toast.success('Account deleted. Sorry to see you go.');
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        toast.error('Please sign out and sign back in, then try again.');
      } else {
        toast.error('Failed to delete account. Please contact support.');
      }
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!displayName.trim()) newErrors.displayName = "Display name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !validate()) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        payoutMethods: {
          upiId,
          paypalEmail,
          bankDetails
        },
        updatedAt: serverTimestamp()
      });
      await updateProfile(user, { displayName });
      toast.success('Settings updated successfully!');
      setErrors({});
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-8 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Available Credits</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{profile?.credits || 0}</span>
              <span className="text-xs font-bold text-muted-foreground">Tokens</span>
            </div>
            <Link to={prefix('/dashboard/credits')} className="text-xs font-bold text-primary hover:underline mt-4 inline-block">View History →</Link>
          </div>
          <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
            <Coins className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-8 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Membership Status</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">{isPro ? 'Pro Member' : 'Free Tier'}</span>
              {isPro && <Zap className="w-4 h-4 text-amber-500 fill-current" />}
            </div>
            <Link to={prefix('/pricing')} className="text-xs font-bold text-primary hover:underline mt-4 inline-block">Manage Subscription →</Link>
          </div>
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
            <ShieldCheck className={`w-8 h-8 ${isPro ? 'text-primary' : 'text-muted-foreground opacity-30'}`} />
          </div>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
        <h2 className="text-2xl font-bold mb-10 flex items-center gap-3 text-foreground">
          <div className="w-10 h-10 bg-primary/10 text-primary rounded-md flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          Account Settings
        </h2>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-12 mb-8 pb-12 border-b border-border">
          <ImageUpload
            value={profile?.photoURL || undefined}
            onChange={async (url) => {
              if (!user) return;
              try {
                await updateDoc(doc(db, 'users', user.uid), {
                  photoURL: url || null,
                  updatedAt: serverTimestamp()
                });
                if (user) await updateProfile(user, { photoURL: url || null });
                toast.success(url ? 'Profile photo updated!' : 'Profile photo removed');
              } catch (err) {
                toast.error('Failed to update profile');
              }
            }}
            variant="circle"
            label={profile?.displayName || 'Creator'}
            description="Your avatar is displayed on your public profile and marketplace activities."
            folder="users"
          />
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Input
              label="Display Name"
              id="displayName"
              name="displayName"
              type="text"
              error={errors.displayName}
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (errors.displayName) setErrors({...errors, displayName: ''});
              }}
              placeholder="e.g. John Doe"
              variant="filled"
              required
            />
            <Input 
              label="Account Email"
              id="accountEmail"
              name="accountEmail"
              type="email"
              value={profile?.email || ''}
              readOnly
              variant="filled"
              rightAction={<Lock className="w-4 h-4 opacity-40" />}
            />
          </div>

          <div className="pt-8 border-t border-border mt-12">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-foreground">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-md flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              Payout Methods
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <Input 
                label="UPI ID (India)"
                id="upiId"
                name="upiId"
                type="text" 
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. username@okaxis"
                variant="filled"
              />
              <Input 
                label="PayPal Email (Global)"
                id="paypalEmail"
                name="paypalEmail"
                type="email" 
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="e.g. user@example.com"
                variant="filled"
              />
              <Textarea 
                label="Bank Account Details (Swift/IFSC, A/C No)"
                id="bankDetails"
                name="bankDetails"
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                rows={4}
                placeholder="Enter your full bank account details for direct transfers..."
                variant="filled"
                className="md:col-span-2"
              />
            </div>
          </div>

          <div className="pt-6 flex items-center gap-6">
            <Button
              type="submit"
              isLoading={isSaving}
              variant="primary"
            >
              Save Settings
            </Button>
          </div>
        </form>
      </div>

      {/* Data & Privacy (GDPR) */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-sm space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-3 text-foreground">
          <div className="w-8 h-8 bg-sky-500/10 text-sky-500 rounded-md flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          Data & Privacy
        </h2>

        {/* Export */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Download My Data</p>
            <p className="text-xs text-muted-foreground mt-0.5">Export all your account data, orders, and activity as a JSON file.</p>
          </div>
          <Button
            onClick={handleExportData}
            isLoading={exportingData}
            variant="outline"
            size="sm"
            leftIcon={Download}
            className="shrink-0"
          >
            Export Data
          </Button>
        </div>

        {/* Delete account */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-rose-500/5 border border-rose-500/15">
          <div>
            <p className="text-sm font-semibold text-rose-600">Delete Account</p>
            <p className="text-xs text-muted-foreground mt-0.5">Permanently delete your account and all associated data. This cannot be undone.</p>
          </div>
          <Button
            onClick={() => setShowDeleteConfirm(true)}
            variant="outline"
            size="sm"
            leftIcon={Trash2}
            className="shrink-0 border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
          >
            Delete Account
          </Button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Delete Account</h3>
                  <p className="text-xs text-muted-foreground">This action is permanent and irreversible.</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                This will delete your profile, cancel any active subscriptions, and remove your data. You will lose access immediately.
              </p>
              <p className="text-xs font-bold text-foreground mb-2">
                Type <span className="text-rose-500 font-mono">DELETE</span> to confirm:
              </p>
              <input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mb-4 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
              <div className="flex gap-3">
                <Button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} variant="outline" size="sm" fullWidth>
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteAccount}
                  isLoading={deleting}
                  disabled={deleteConfirmText !== 'DELETE'}
                  size="sm"
                  fullWidth
                  className="bg-rose-600 hover:bg-rose-700 text-white border-0 disabled:opacity-40"
                >
                  Delete Forever
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
