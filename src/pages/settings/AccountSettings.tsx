import { useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User, Camera, Lock, Loader2, Coins, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function AccountSettings() {
  const { user, profile, isPro } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
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

    setIsUploading(true);
    const toastId = toast.loading('Uploading your new avatar...');
    try {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      const base64Image = await base64Promise;

      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, userId: user.uid })
      });

      if (!response.ok) throw new Error('Upload failed');
      const { url } = await response.json();

      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: url,
        updatedAt: serverTimestamp()
      });

      toast.success('Avatar updated!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-[2.5rem] p-8 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Available Credits</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground">{profile?.credits || 0}</span>
              <span className="text-xs font-bold text-muted-foreground">Tokens</span>
            </div>
            <Link to="/credits" className="text-xs font-bold text-primary hover:underline mt-4 inline-block">View History →</Link>
          </div>
          <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center">
            <Coins className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-[2.5rem] p-8 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Membership Status</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-foreground">{isPro ? 'Pro Member' : 'Free Tier'}</span>
              {isPro && <Zap className="w-4 h-4 text-amber-500 fill-current" />}
            </div>
            <Link to="/pricing" className="text-xs font-bold text-primary hover:underline mt-4 inline-block">Manage Subscription →</Link>
          </div>
          <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center">
            <ShieldCheck className={`w-8 h-8 ${isPro ? 'text-primary' : 'text-muted-foreground opacity-30'}`} />
          </div>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-card rounded-[3rem] p-8 md:p-12 border border-border shadow-sm">
        <h2 className="text-2xl font-black mb-10 flex items-center gap-3 text-foreground">
          <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
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

        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-12 pb-12 border-b border-border">
          <div className="relative group">
            <div className="w-28 h-28 rounded-[2rem] bg-muted overflow-hidden shadow-xl relative">
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
              className="absolute -bottom-2 -right-2 p-3 bg-foreground text-background rounded-2xl shadow-xl border-4 border-card hover:scale-110 transition-transform disabled:opacity-50 disabled:scale-100"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h3 className="text-xl font-black text-foreground mb-1">{profile?.displayName || 'Creator'}</h3>
            <p className="text-muted-foreground text-sm font-medium mb-4 max-w-md">Your avatar is displayed on your public profile and marketplace activities.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-[10px] font-black uppercase tracking-widest text-primary px-4 py-2 bg-primary/10 rounded-xl hover:bg-primary/20 transition-all disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Change Avatar'}
              </button>
              <button className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4 py-2 hover:bg-muted rounded-xl transition-all">Remove</button>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Display Name</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-muted border-2 border-transparent rounded-2xl p-5 focus:bg-card focus:border-primary focus:outline-none transition-all font-bold text-foreground"
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Account Email</label>
              <div className="w-full bg-muted border-2 border-transparent rounded-2xl p-5 text-muted-foreground/60 font-bold flex items-center justify-between group cursor-not-allowed">
                <span className="truncate">{profile?.email}</span>
                <Lock className="w-4 h-4 opacity-40" />
              </div>
            </div>
          </div>

          <div className="pt-6 flex items-center gap-6">
            <button 
              disabled={isSaving || isUploading}
              className="bg-primary text-primary-foreground font-black px-10 py-5 rounded-[2rem] hover:opacity-90 transition-all flex items-center gap-2 shadow-xl shadow-primary/20 disabled:opacity-50"
            >
              {isSaving ? 'Syncing...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
