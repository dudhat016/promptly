import { onAuthStateChanged, User } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getAffinityProfile, mergeCloudAffinity, seedAffinityFromInterests, syncAffinityToCloud } from '../lib/affinity';
import { auth, db } from '../lib/firebase';
import { seedDatabase } from '../lib/seed';
import { api } from '../lib/api';
import { EmailService } from '../services/emailService';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isPro: boolean;
  toggleFavorite: (promptId: string) => Promise<boolean>;
  isFavorited: (promptId: string) => boolean;
  syncMarketingTags: (tags: string[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isStaff: false,
  isPro: false,
  toggleFavorite: async () => false,
  isFavorited: () => false,
  syncMarketingTags: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const syncMarketingTags = async (tags: string[]) => {
    try {
      for (const tag of tags) {
        const tagRef = doc(db, 'marketing_tags', tag);
        const tagSnap = await getDoc(tagRef);

        if (!tagSnap.exists()) {
          await setDoc(tagRef, {
            id: tag,
            name: tag.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            contactsCount: 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            color: 'indigo'
          });
        } else {
          await updateDoc(tagRef, {
            contactsCount: increment(1),
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (err) {
      console.error("Failed to sync marketing tags:", err);
    }
  };

  useEffect(() => {
    // 1. GUEST MODE FOR LOCAL TESTING
    if (window.location.hostname === 'localhost' && localStorage.getItem('GUEST_MODE') === 'true') {
      setUser({ uid: 'guest-123', email: 'guest@testing.com', displayName: 'Guest Tester' } as User);
      setProfile({
        uid: 'guest-123',
        email: 'guest@testing.com',
        displayName: 'Guest Tester',
        photoURL: null,
        role: 'admin',
        subscriptionStatus: 'pro',
        createdAt: new Date().toISOString()
      });
      setLoading(false);
      return;
    }

    let unsubscribeProfile: () => void;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (unsubscribeProfile) unsubscribeProfile();

      if (user) {
        const docRef = doc(db, 'users', user.uid);

        // REAL-TIME LISTENER
        unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
          try {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              
              // Prevent recursive loops by batching updates
              let needsUpdate = false;
              const updates: any = {};

              // 1. Referral Code Check
              const isOldFormat = data.referralCode && data.referralCode.length === 6 && !/[0-9]{3}$/.test(data.referralCode);
              if (!data.referralCode || isOldFormat) {
                const baseName = (user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'USER')
                  .replace(/[^a-zA-Z0-9]/g, '')
                  .toUpperCase()
                  .slice(0, 10);
                updates.referralCode = `${baseName}${Math.floor(100 + Math.random() * 900)}`;
                needsUpdate = true;
              }

              // 2. Admin/Demotion Logic (Only if status actually changed)
              const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((e: string) => e.trim()).filter(Boolean);
              const isAdminEmail = adminEmails.length > 0 ? adminEmails.includes(user.email || '') : false;
              const isToDemote = user.email === 'learnwithdudhat016@gmail.com';

              if (isAdminEmail && data.role !== 'admin') {
                updates.role = 'admin';
                updates.subscriptionStatus = 'pro';
                updates.credits = 10000;
                updates.hasCompletedOnboarding = true;
                needsUpdate = true;
              } else if (isToDemote && data.role === 'admin') {
                updates.role = 'user';
                updates.subscriptionStatus = 'free';
                updates.credits = 5;
                needsUpdate = true;
              }

              // 3. Daily Reward (Guarded by session flag)
              const lastReward = data.lastCreditsRewardAt?.toDate ? data.lastCreditsRewardAt.toDate() : (data.lastCreditsRewardAt ? new Date(data.lastCreditsRewardAt) : null);
              const today = new Date();
              today.setHours(0,0,0,0);
              const rewardKey = `reward_claimed_${today.getTime()}`;

              if ((!lastReward || lastReward < today) && !sessionStorage.getItem(rewardKey)) {
                const globalSnap = await getDoc(doc(db, 'configs', 'global'));
                const dailyBonus = globalSnap.exists() ? (globalSnap.data().aiDefaults?.freeCreditsDaily ?? 5) : 5;
                updates.credits = increment(dailyBonus);
                updates.lastCreditsRewardAt = serverTimestamp();
                updates.lastActiveAt = serverTimestamp();
                sessionStorage.setItem(rewardKey, 'true');
                needsUpdate = true;
                toast.success("Daily Reward: +5 Credits added! 🎉", { icon: '🎁' });
              }

              // Apply all updates in one shot to avoid triggering multiple snapshots
              if (needsUpdate) {
                await updateDoc(docRef, updates);
                return;
              }

              setProfile(data);

              // Login alert — fires once per browser session for existing users only.
              // New registrations are excluded (they receive a welcome email instead).
              // Server dedup (atomic Firestore transaction) handles cross-device dedup.
              const loginAlertKey = `login_alert_${user.uid}`;
              if (!sessionStorage.getItem(loginAlertKey)) {
                sessionStorage.setItem(loginAlertKey, '1');
                api.post('/auth/login-alert', {
                  name: user.displayName || user.email?.split('@')[0] || '',
                  time: new Date().toLocaleString(),
                }).catch(() => {});
              }

              if (data.role === 'admin' && !sessionStorage.getItem('DB_SEEDED')) {
                seedDatabase();
                sessionStorage.setItem('DB_SEEDED', 'true');
              }

              // Merge cloud affinity into local profile
              if (data.affinityProfile) mergeCloudAffinity(data.affinityProfile);

              // Cold-start fix: if local affinity is empty (new device / cleared storage),
              // seed from stored interests so "For You" works immediately
              const localAffinity = getAffinityProfile();
              if (Object.keys(localAffinity).length === 0 && (data.interests?.length ?? 0) > 0) {
                seedAffinityFromInterests(data.interests ?? []);
              } else {
                syncAffinityToCloud(user.uid);
              }

            } else {
              // Create new profile
              const baseName = (user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'USER')
                .replace(/[^a-zA-Z0-9]/g, '')
                .toUpperCase()
                .slice(0, 10);
              const referralCode = `${baseName}${Math.floor(100 + Math.random() * 900)}`;
              const referredBy = localStorage.getItem('referralCode') || undefined;

              const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((e: string) => e.trim()).filter(Boolean);
              const isAdminEmail = adminEmails.length > 0 ? adminEmails.includes(user.email || '') : false;

              const newProfile: UserProfile = {
                uid: user.uid,
                hasCompletedOnboarding: isAdminEmail ? true : false,
                email: user.email || '',
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: isAdminEmail ? 'admin' : 'user',
                subscriptionStatus: isAdminEmail ? 'pro' : 'free',
                createdAt: new Date().toISOString(),
                referralCode,
                referredBy,
                affiliateEarnings: 0,
                credits: isAdminEmail ? 10000 : 50,
                totalUsedCredits: 0,
                monthlyLimit: isAdminEmail ? 10000 : 50
              };

              await setDoc(docRef, { ...newProfile, createdAt: serverTimestamp() });
              setProfile(newProfile);

              // Suppress login alert for new registrations — welcome email serves this purpose
              sessionStorage.setItem(`login_alert_${user.uid}`, '1');

              if (isAdminEmail) {
                await setDoc(doc(db, 'admins', user.uid), { email: user.email, createdAt: serverTimestamp() });
              }

              // New registration emails (welcome also fires user_signup automation trigger server-side)
              await EmailService.sendWelcomeEmail(user.uid, user.email || '', user.displayName || 'Creator');
              // Only send affiliate welcome to users who came via a referral link — everyone else
              // gets their referral code surfaced in-product, not as a cold email on signup.
              if (referredBy) {
                await EmailService.sendAffiliateJoinEmail(user.uid, user.email || '', referralCode);
              }

              // Fire affiliate_join automation trigger
              if (referralCode) {
                api.post('/automation/trigger', { triggerType: 'affiliate_join', userId: user.uid, data: { referralCode } }).catch(() => {});
              }

              // Sync to Marketing CRM
              try {
                const contactRef = collection(db, 'marketing_contacts');
                const q = query(contactRef, where('email', '==', user.email));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                  await addDoc(contactRef, {
                    email: user.email,
                    displayName: user.displayName || 'New User',
                    firstName: user.displayName?.split(' ')[0] || '',
                    lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
                    status: 'active',
                    source: 'registration',
                    userId: user.uid,
                    tags: ['customer', 'user_account'],
                    createdAt: serverTimestamp(),
                    lastActiveAt: serverTimestamp()
                  });
                  await syncMarketingTags(['customer', 'user_account']);
                } else {
                  const existingDoc = querySnapshot.docs[0];
                  const existingData = existingDoc.data();
                  const updatedTags = Array.from(new Set([...(existingData.tags || []), 'customer', 'user_account']));
                  await updateDoc(existingDoc.ref, {
                    userId: user.uid,
                    tags: updatedTags,
                    lastActiveAt: serverTimestamp()
                  });
                  const newTags = ['customer', 'user_account'].filter(t => !(existingData.tags || []).includes(t));
                  if (newTags.length > 0) await syncMarketingTags(newTags);
                }
              } catch (crmErr) {
                console.error("Failed to sync user to Marketing CRM:", crmErr);
              }
            }
            setLoading(false); // Done loading profile
          } catch (err) {
            console.error("Error in profile listener:", err);
            setLoading(false);
          }
        });

        // Fetch Favorites
        const favRef = collection(db, 'users', user.uid, 'favorites');
        getDocs(favRef).then(snap => {
          setFavoriteIds(snap.docs.map(d => d.data().promptId));
        });

      } else {
        setProfile(null);
        setFavoriteIds([]);
        setLoading(false); // Only set loading false here if no user
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const toggleFavorite = async (promptId: string) => {
    if (!user) return false;
    if (user.uid === 'guest-123') {
      toast.error("Sign in to save favorite prompts!");
      return false;
    }
    try {
      const favRef = collection(db, 'users', user.uid, 'favorites');
      const q = query(favRef, where('promptId', '==', promptId));
      const snap = await getDocs(q);
      const promptDocRef = doc(db, 'prompts', promptId);

      if (!snap.empty) {
        // Unfavorite
        await deleteDoc(doc(db, 'users', user.uid, 'favorites', snap.docs[0].id));
        await updateDoc(promptDocRef, { likesCount: increment(-1) }).catch(e => console.warn("Prompt might not exist in secondary DB", e));
        setFavoriteIds(prev => prev.filter(id => id !== promptId));
        return false;
      } else {
        // Favorite
        await addDoc(favRef, { promptId, createdAt: serverTimestamp() });
        await updateDoc(promptDocRef, { likesCount: increment(1) }).catch(e => console.warn("Prompt might not exist in secondary DB", e));
        setFavoriteIds(prev => [...prev, promptId]);
        return true;
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
      return false;
    }
  };

  const isFavorited = (promptId: string) => favoriteIds.includes(promptId);

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isStaff: profile?.role === 'staff',
    isPro: profile?.subscriptionStatus === 'pro' || profile?.subscriptionStatus === 'enterprise' || profile?.role === 'admin',
    toggleFavorite,
    isFavorited,
    syncMarketingTags,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
