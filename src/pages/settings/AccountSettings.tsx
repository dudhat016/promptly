import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { User, Lock, Coins, ShieldCheck, Zap } from 'lucide-react';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import ImageUpload from '../../components/ui/ImageUpload';
import Button from '../../components/ui/Button';

export default function AccountSettings() {
  const { user, profile, isPro } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [upiId, setUpiId] = useState(profile?.payoutMethods?.upiId || '');
  const [paypalEmail, setPaypalEmail] = useState(profile?.payoutMethods?.paypalEmail || '');
  const [bankDetails, setBankDetails] = useState(profile?.payoutMethods?.bankDetails || '');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
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
      toast.success('Settings updated successfully!');
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
            <Link to="/dashboard/credits" className="text-xs font-bold text-primary hover:underline mt-4 inline-block">View History →</Link>
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
            <Link to="/pricing" className="text-xs font-bold text-primary hover:underline mt-4 inline-block">Manage Subscription →</Link>
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
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. John Doe"
              variant="filled"
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
    </motion.div>
  );
}
