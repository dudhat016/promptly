import { useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useImageUpload } from '../../hooks/useImageUpload';
import { db } from '../../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { User, Camera, Lock, Loader2, Coins, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function AccountSettings() {
  const { user, profile, isPro } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { uploadImage, isUploading } = useImageUpload();
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const data = await uploadImage(file, 'users');
    
    if (data?.success) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          photoURL: data.url,
          updatedAt: serverTimestamp()
        });
        
        // Sync with Auth profile for instant header update
        await updateProfile(user, { photoURL: data.url });
        
        toast.success('Profile photo updated!');
      } catch (err) {
        console.error('Firestore Update Error:', err);
        toast.error('Failed to update profile record');
      }
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
            <Link to="/credits" className="text-xs font-bold text-primary hover:underline mt-4 inline-block">View History â†’</Link>
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
            <Link to="/pricing" className="text-xs font-bold text-primary hover:underline mt-4 inline-block">Manage Subscription â†’</Link>
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
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
          accept="image/*" 
          className="hidden" 
        />

        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-8 pb-12 border-b border-border">
          <div className="relative group">
            <div className="w-28 h-28 rounded-md bg-muted overflow-hidden shadow-xl relative">
              <img 
                src={profile?.photoURL || undefined} 
                className={`w-full h-full object-cover transition-opacity ${isUploading ? 'opacity-50' : 'opacity-100'}`} 
                alt="" 
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute -bottom-2 -right-2 p-3 bg-foreground text-background rounded-md shadow-xl border-4 border-card hover:scale-110 transition-transform disabled:opacity-50 disabled:scale-100"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">{profile?.displayName || 'Creator'}</h3>
            <p className="text-muted-foreground text-sm font-medium mb-4 max-w-md">Your avatar is displayed on your public profile and marketplace activities.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-xs font-bold uppercase tracking-widest text-primary px-4 py-2 bg-primary/10 rounded-md hover:bg-primary/20 transition-all disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Change Avatar'}
              </button>
              <button className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-4 py-2 hover:bg-muted rounded-md transition-all">Remove</button>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Display Name</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-muted border-2 border-transparent rounded-md p-5 focus:bg-card focus:border-primary focus:outline-none transition-all font-bold text-foreground"
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Account Email</label>
              <div className="w-full bg-muted border-2 border-transparent rounded-md p-5 text-muted-foreground/60 font-bold flex items-center justify-between group cursor-not-allowed">
                <span className="truncate">{profile?.email}</span>
                <Lock className="w-4 h-4 opacity-40" />
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-border mt-12">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-foreground">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-md flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              Payout Methods
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">UPI ID (India)</label>
                <input 
                  type="text" 
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full bg-muted border-2 border-transparent rounded-md p-5 focus:bg-card focus:border-primary focus:outline-none transition-all font-bold text-foreground"
                  placeholder="e.g. username@okaxis"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">PayPal Email (Global)</label>
                <input 
                  type="email" 
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  className="w-full bg-muted border-2 border-transparent rounded-md p-5 focus:bg-card focus:border-primary focus:outline-none transition-all font-bold text-foreground"
                  placeholder="e.g. user@example.com"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Bank Account Details (Swift/IFSC, A/C No)</label>
                <textarea 
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  className="w-full bg-muted border-2 border-transparent rounded-md p-5 focus:bg-card focus:border-primary focus:outline-none transition-all font-bold text-foreground min-h-[120px]"
                  placeholder="e.g. Account Number: 1234567890, IFSC: ABCD0123456, Bank Name: Example Bank"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 flex items-center gap-6">
            <button 
              disabled={isSaving || isUploading}
              className="btn-primary"
            >
              {isSaving ? 'Syncing...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
