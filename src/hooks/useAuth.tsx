import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc, addDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { seedDatabase } from '../lib/seed';
import { EmailService } from '../services/emailService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isPro: boolean;
  toggleFavorite: (promptId: string) => Promise<boolean>;
  isFavorited: (promptId: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isPro: false,
  toggleFavorite: async () => false,
  isFavorited: () => false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            let data = docSnap.data() as UserProfile;
            
            // Auto-elevate specific user to admin if needed
            if (user.email === 'calmingsound016@gmail.com' && data.role !== 'admin') {
              data = { ...data, role: 'admin', subscriptionStatus: 'pro' };
              await updateDoc(docRef, { role: 'admin', subscriptionStatus: 'pro' });
              // Also add to admins collection for rules
              await setDoc(doc(db, 'admins', user.uid), { email: user.email, createdAt: serverTimestamp() });
            }
            
            setProfile(data);
            
            // Log successful login notification once per session
            const sessionKey = `login_email_${user.uid}`;
            if (!sessionStorage.getItem(sessionKey)) {
              EmailService.sendLoginEmail(user.uid, user.email || '');
              sessionStorage.setItem(sessionKey, 'true');
            }
          } else {
            // Create default profile if not exists
            const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const referredBy = sessionStorage.getItem('referralCode') || undefined;
            const isAdminEmail = user.email === 'calmingsound016@gmail.com';
            
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName,
              photoURL: user.photoURL,
              role: isAdminEmail ? 'admin' : 'user',
              subscriptionStatus: isAdminEmail ? 'pro' : 'free',
              createdAt: new Date().toISOString(),
              referralCode,
              referredBy,
              affiliateEarnings: 0
            };
            
            const dbProfile = {
              ...newProfile,
              createdAt: serverTimestamp()
            };
            
            await setDoc(docRef, dbProfile);
            setProfile(newProfile);

            if (isAdminEmail) {
              await setDoc(doc(db, 'admins', user.uid), { email: user.email, createdAt: serverTimestamp() });
            }

            // New registration emails
            await EmailService.sendWelcomeEmail(user.uid, user.email || '', user.displayName || 'Creator');
            await EmailService.sendAffiliateJoinEmail(user.uid, user.email || '', referralCode);
            
            // Mark login as handled for this session
            sessionStorage.setItem(`login_email_${user.uid}`, 'true');
          }
          
          // Fetch Favorites
          const favRef = collection(db, 'users', user.uid, 'favorites');
          const favSnap = await getDocs(favRef);
          setFavoriteIds(favSnap.docs.map(d => d.data().promptId));

          // Seed database if user is admin
          seedDatabase();
          
        } catch (err) {
          console.error("Error fetching/creating profile:", err);
        }
      } else {
        setProfile(null);
        setFavoriteIds([]);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const toggleFavorite = async (promptId: string) => {
    if (!user) return false;
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
    isAdmin: profile?.role === 'admin' || user?.email === 'calmingsound016@gmail.com',
    isPro: profile?.subscriptionStatus === 'pro' || profile?.role === 'admin' || user?.email === 'calmingsound016@gmail.com',
    toggleFavorite,
    isFavorited,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
