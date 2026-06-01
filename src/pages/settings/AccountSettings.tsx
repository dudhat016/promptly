import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db, auth } from '../../lib/firebase';
import {
  doc, updateDoc, serverTimestamp,
  getDoc, getDocs, collection, query, where, orderBy, limit, deleteDoc,
} from 'firebase/firestore';
import { updateProfile, deleteUser } from 'firebase/auth';
import {
  User, Lock, Coins, MapPin, Globe, Link2,
  Github, Instagram, Youtube, Twitter,
  Download, Trash2, AlertTriangle, ShieldCheck, ExternalLink,
} from 'lucide-react';
import Input from '../../components/primitives/Input';
import Textarea from '../../components/primitives/Textarea';
import TagInput from '../../components/primitives/TagInput';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import ImageUpload from '../../components/forms/ImageUpload';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';

export default function AccountSettings() {
  const { user, profile } = useAuth();
  const { prefix } = usePath();

  // Profile fields
  const [displayName, setDisplayName]     = useState(profile?.displayName || '');
  const [username,    setUsername]         = useState(profile?.username || '');
  const [bio,         setBio]              = useState(profile?.bio || '');
  const [website,     setWebsite]          = useState(profile?.website || '');
  const [location,    setLocation]         = useState(profile?.location || '');
  const [expertiseTags, setExpertiseTags]  = useState<string[]>(profile?.expertiseTags || []);
  const [socialLinks, setSocialLinks]      = useState({
    twitter:   profile?.socialLinks?.twitter   || '',
    instagram: profile?.socialLinks?.instagram || '',
    github:    profile?.socialLinks?.github    || '',
    youtube:   profile?.socialLinks?.youtube   || '',
    linkedin:  profile?.socialLinks?.linkedin  || '',
  });

  // Payout fields
  const [upiId,        setUpiId]        = useState(profile?.payoutMethods?.upiId || '');
  const [paypalEmail,  setPaypalEmail]  = useState(profile?.payoutMethods?.paypalEmail || '');
  const [bankDetails,  setBankDetails]  = useState(profile?.payoutMethods?.bankDetails || '');

  const [isSaving,          setIsSaving]          = useState(false);
  const [isSavingPayouts,   setIsSavingPayouts]   = useState(false);
  const [exportingData,     setExportingData]     = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting,          setDeleting]          = useState(false);
  const [usernameError,     setUsernameError]     = useState('');

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!displayName.trim()) { toast.error('Display name is required'); return; }
    setUsernameError('');

    const cleanUsername = username.trim().toLowerCase();

    // Uniqueness check
    if (cleanUsername) {
      if (!/^[a-z0-9_-]{3,30}$/.test(cleanUsername)) {
        setUsernameError('3–30 characters: letters, numbers, _ or - only.');
        return;
      }
      const taken = await getDocs(
        query(collection(db, 'users'), where('username', '==', cleanUsername))
      );
      const conflict = taken.docs.find(d => d.id !== user.uid);
      if (conflict) {
        setUsernameError('This handle is already taken. Please choose another.');
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        username:      cleanUsername || null,
        bio:           bio.trim() || null,
        website:       website.trim() || null,
        location:      location.trim() || null,
        expertiseTags: expertiseTags.length ? expertiseTags : [],
        socialLinks,
        updatedAt: serverTimestamp(),
      });
      await updateProfile(user, { displayName });
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePayouts = async () => {
    if (!user) return;
    setIsSavingPayouts(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        payoutMethods: { upiId, paypalEmail, bankDetails },
        updatedAt: serverTimestamp(),
      });
      toast.success('Payout methods saved!');
    } catch {
      toast.error('Failed to save payout methods');
    } finally {
      setIsSavingPayouts(false);
    }
  };

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
      a.href = url; a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Data exported');
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
      await updateDoc(doc(db, 'users', user.uid), {
        deletedAt: serverTimestamp(),
        email: `deleted_${user.uid}@deleted.invalid`,
        displayName: 'Deleted User',
        photoURL: null,
        subscriptionStatus: 'free',
        role: 'user',
      });
      await deleteUser(user);
      toast.success('Account deleted.');
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        toast.error('Sign out and sign back in, then try again.');
      } else {
        toast.error('Failed to delete account. Contact support.');
      }
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* ── Public Profile ───────────────────────────────────── */}
      <Card className="!rounded-lg">
        <Card.Header
          title={<div className="flex items-center gap-3"><div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0"><User className="w-4 h-4" /></div><div><h3 className="text-sm font-bold text-foreground">Public Profile</h3><p className="text-xs text-muted-foreground mt-0.5">Shown on your creator page and marketplace activity.</p></div></div>}
        />
        <Card.Body>
        <div className="flex flex-col sm:flex-row items-start gap-8 mb-8 pb-8 border-b border-border">
          <ImageUpload
            value={profile?.photoURL || undefined}
            onChange={async (url) => {
              if (!user) return;
              try {
                await updateDoc(doc(db, 'users', user.uid), { photoURL: url || null, updatedAt: serverTimestamp() });
                await updateProfile(user, { photoURL: url || null });
                toast.success(url ? 'Photo updated' : 'Photo removed');
              } catch { toast.error('Failed to update photo'); }
            }}
            variant="circle"
            label={profile?.displayName || 'Creator'}
            description="JPG, PNG or WebP. Shown on your public profile."
            folder="users"
          />
        </div>

        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <Input
              label="Display Name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              variant="filled"
              placeholder="e.g. Jane Doe"
              required
            />
            <Input
              label="Username / Handle"
              value={username}
              onChange={e => { setUsername(e.target.value.replace(/[^a-z0-9_-]/gi, '').toLowerCase()); setUsernameError(''); }}
              variant="filled"
              placeholder="e.g. janedoe"
              helperText={usernameError || 'Your public URL: /creator/handle'}
              error={usernameError || undefined}
            />
          </div>

          <Input
            label="Account Email"
            value={profile?.email || ''}
            readOnly
            variant="filled"
            rightAction={<Lock className="w-4 h-4 opacity-40" />}
          />

          <Textarea
            label="Bio"
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, 280))}
            variant="filled"
            rows={3}
            placeholder="Tell the community about your AI expertise and what you create…"
            helperText={`${bio.length}/280 characters`}
          />

          <div className="grid sm:grid-cols-2 gap-5">
            <Input
              label="Website"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              variant="filled"
              placeholder="https://yoursite.com"
              leftIcon={Globe}
            />
            <Input
              label="Location"
              value={location}
              onChange={e => setLocation(e.target.value)}
              variant="filled"
              placeholder="e.g. San Francisco, CA"
              leftIcon={MapPin}
            />
          </div>

          <TagInput
            label="Expertise Tags"
            tags={expertiseTags}
            onChange={setExpertiseTags}
            placeholder="Add a skill and press Enter…"
            helperText="e.g. Copywriting, Marketing, Code, Design — up to 10."
          />
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          {user && (
            <Link
              to={prefix(`/creator/${profile?.username || user.uid}`)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View public profile
            </Link>
          )}
          <Button onClick={handleSaveProfile} isLoading={isSaving} variant="primary" size="sm">
            Save Profile
          </Button>
        </div>
        </Card.Body>
      </Card>

      {/* ── Social Links ─────────────────────────────────────── */}
      <Card className="!rounded-lg">
        <Card.Header
          title={<div className="flex items-center gap-3"><div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0"><Link2 className="w-4 h-4" /></div><div><h3 className="text-sm font-bold text-foreground">Social Links</h3><p className="text-xs text-muted-foreground mt-0.5">Displayed on your public creator profile.</p></div></div>}
        />
        <Card.Body>
        <div className="grid sm:grid-cols-2 gap-5">
          <Input label="X / Twitter" value={socialLinks.twitter} onChange={e => setSocialLinks(p => ({ ...p, twitter: e.target.value }))} variant="filled" placeholder="https://x.com/handle" leftIcon={Twitter} />
          <Input label="Instagram"   value={socialLinks.instagram} onChange={e => setSocialLinks(p => ({ ...p, instagram: e.target.value }))} variant="filled" placeholder="https://instagram.com/handle" leftIcon={Instagram} />
          <Input label="GitHub"      value={socialLinks.github} onChange={e => setSocialLinks(p => ({ ...p, github: e.target.value }))} variant="filled" placeholder="https://github.com/handle" leftIcon={Github} />
          <Input label="YouTube"     value={socialLinks.youtube} onChange={e => setSocialLinks(p => ({ ...p, youtube: e.target.value }))} variant="filled" placeholder="https://youtube.com/@channel" leftIcon={Youtube} />
          <Input label="LinkedIn"    value={socialLinks.linkedin} onChange={e => setSocialLinks(p => ({ ...p, linkedin: e.target.value }))} variant="filled" placeholder="https://linkedin.com/in/handle" leftIcon={Link2} className="sm:col-span-1" />
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveProfile} isLoading={isSaving} variant="primary" size="sm">
            Save Links
          </Button>
        </div>
        </Card.Body>
      </Card>

      {/* ── Creator Payouts ──────────────────────────────────── */}
      <Card className="!rounded-lg">
        <Card.Header
          title={<div className="flex items-center gap-3"><div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0"><Coins className="w-4 h-4" /></div><div><h3 className="text-sm font-bold text-foreground">Creator Payouts</h3><p className="text-xs text-muted-foreground mt-0.5">How you receive earnings from the affiliate and creator programs.</p></div></div>}
        />
        <Card.Body>
        <div className="grid sm:grid-cols-2 gap-5">
          <Input
            label="UPI ID (India)"
            value={upiId}
            onChange={e => setUpiId(e.target.value)}
            variant="filled"
            placeholder="username@okaxis"
          />
          <Input
            label="PayPal Email (Global)"
            type="email"
            value={paypalEmail}
            onChange={e => setPaypalEmail(e.target.value)}
            variant="filled"
            placeholder="you@example.com"
          />
          <Textarea
            label="Bank / Wire Details"
            value={bankDetails}
            onChange={e => setBankDetails(e.target.value)}
            rows={3}
            variant="filled"
            placeholder="Bank name, account number, IFSC / SWIFT code…"
            className="sm:col-span-2"
          />
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSavePayouts} isLoading={isSavingPayouts} variant="primary" size="sm">
            Save Payout Methods
          </Button>
        </div>
        </Card.Body>
      </Card>

      {/* ── Data & Privacy ───────────────────────────────────── */}
      <Card className="!rounded-lg">
        <Card.Header
          title={<div className="flex items-center gap-3"><div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0"><ShieldCheck className="w-4 h-4" /></div><div><h3 className="text-sm font-bold text-foreground">Data &amp; Privacy</h3><p className="text-xs text-muted-foreground mt-0.5">GDPR controls — export or permanently remove your account.</p></div></div>}
        />
        <Card.Body>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">Download My Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">Export your profile, orders, and credit history as JSON.</p>
            </div>
            <Button onClick={handleExportData} isLoading={exportingData} variant="outline" size="sm" leftIcon={Download} className="shrink-0">
              Export Data
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-rose-500/5 border border-rose-500/15">
            <div>
              <p className="text-sm font-semibold text-rose-600">Delete Account</p>
              <p className="text-xs text-muted-foreground mt-0.5">Permanently removes your account and all associated data.</p>
            </div>
            <Button onClick={() => setShowDeleteConfirm(true)} variant="outline" size="sm" leftIcon={Trash2} className="shrink-0 border-rose-500/30 text-rose-600 hover:bg-rose-500/10">
              Delete Account
            </Button>
          </div>
        </div>
        </Card.Body>
      </Card>

      {/* ── Delete confirmation modal ─────────────────────────── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirm(false)} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 12 }} className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Delete Account</h3>
                  <p className="text-xs text-muted-foreground">Permanent and irreversible.</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                This will delete your profile, cancel active subscriptions, and remove all your data. You'll lose access immediately.
              </p>
              <p className="text-xs font-bold text-foreground mb-2">
                Type <span className="text-rose-500 font-mono">DELETE</span> to confirm:
              </p>
              <Input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                variant="outline"
                className="mb-4 font-mono"
              />
              <div className="flex gap-3">
                <Button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} variant="outline" size="sm" fullWidth>Cancel</Button>
                <Button onClick={handleDeleteAccount} isLoading={deleting} disabled={deleteConfirmText !== 'DELETE'} size="sm" fullWidth className="bg-rose-600 hover:bg-rose-700 text-white border-0 disabled:opacity-40">
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
