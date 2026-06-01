import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePath } from '../hooks/usePath';
import { db } from '../lib/firebase';
import {
  doc, getDoc, collection, query, where, getDocs, orderBy,
  updateDoc, arrayUnion, arrayRemove, increment, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { Prompt, UserProfile } from '../types';
import {
  User, LayoutGrid, Calendar, ArrowRight, ShieldCheck, Zap,
  Heart, Eye, Users, UserCheck, UserPlus,
  MapPin, Globe, Link2, Twitter, Instagram, Github, Youtube,
} from 'lucide-react';
import { BADGE_DEFS } from '../lib/badges';
import { AFFILIATE_MILESTONES } from '../lib/milestones';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import Button from '../components/primitives/Button';
import Spinner from '../components/feedback/Spinner';
import PageContainer from '../components/layout/PageContainer';
import { useAuth } from '../hooks/useAuth';
import { useSEO } from '../hooks/useSEO';
import { recordFollowAffinity, recordUnfollowAffinity } from '../lib/affinity';

export default function PublicProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const { prefix } = usePath();
  const { user, profile: currentProfile } = useAuth();
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = !!user && !!targetProfile && user.uid === targetProfile.uid;

  useSEO(targetProfile ? {
    title: targetProfile.displayName || 'Creator Profile',
    description: targetProfile.bio || `Explore prompts by ${targetProfile.displayName} on Promptly.`,
    image: targetProfile.photoURL || undefined,
  } : { title: 'Creator Profile' });

  useEffect(() => {
    if (uid) fetchUserData();
  }, [uid]);

  // Sync follow state from current user's profile (use resolved UID, not param)
  useEffect(() => {
    if (!targetProfile || !currentProfile) return;
    setFollowing((currentProfile.following || []).includes(targetProfile.uid));
  }, [targetProfile, currentProfile]);

  async function fetchUserData() {
    try {
      let resolvedUid = uid!;

      // Try direct UID lookup first
      let profDoc = await getDoc(doc(db, 'users', uid!));

      // If not found, treat the param as a username and resolve it
      if (!profDoc.exists()) {
        const byUsername = await getDocs(
          query(collection(db, 'users'), where('username', '==', uid!.toLowerCase()))
        );
        if (!byUsername.empty) {
          profDoc = byUsername.docs[0] as any;
          resolvedUid = byUsername.docs[0].id;
        }
      }

      if (profDoc.exists()) {
        const data = { uid: profDoc.id, ...profDoc.data() } as UserProfile;
        setTargetProfile(data);
        setFollowerCount(data.followerCount ?? 0);
      }

      const snap = await getDocs(
        query(collection(db, 'prompts'), where('creatorId', '==', resolvedUid), where('status', '==', 'approved'), orderBy('createdAt', 'desc'))
      );
      setPrompts(snap.docs.map(d => ({ ...d.data(), id: d.id } as Prompt)));
    } catch (err) {
      console.error('Error fetching public profile:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFollow() {
    if (!user || !targetProfile) {
      toast.error('Sign in to follow creators');
      return;
    }
    if (isOwnProfile) return;

    const creatorUid = targetProfile.uid;
    setFollowLoading(true);
    const optimisticFollow = !following;
    setFollowing(optimisticFollow);
    setFollowerCount(c => optimisticFollow ? c + 1 : Math.max(0, c - 1));

    try {
      // Update follower's following array
      await updateDoc(doc(db, 'users', user.uid), {
        following: optimisticFollow ? arrayUnion(creatorUid) : arrayRemove(creatorUid),
      });
      // Update creator's follower count
      await updateDoc(doc(db, 'users', creatorUid), {
        followerCount: increment(optimisticFollow ? 1 : -1),
      });
      // Notify creator on new follow (only when following, not unfollowing)
      if (optimisticFollow) {
        await addDoc(collection(db, 'users', creatorUid, 'notifications'), {
          userId:    creatorUid,
          title:     'New follower',
          body:      `${currentProfile?.displayName || 'Someone'} started following you.`,
          type:      'success',
          link:      `/creator/${currentProfile?.username || user.uid}`,
          readAt:    null,
          createdAt: serverTimestamp(),
        });
        // Boost follower's affinity from this creator's top topics (non-blocking)
        recordFollowAffinity(creatorUid);
      } else {
        // Reverse the affinity boost that was applied when they followed
        recordUnfollowAffinity(creatorUid);
      }
    } catch {
      // Rollback optimistic update
      setFollowing(!optimisticFollow);
      setFollowerCount(c => optimisticFollow ? Math.max(0, c - 1) : c + 1);
      toast.error('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  }

  const totalLikes  = prompts.reduce((s, p) => s + (p.likesCount  || 0), 0);
  const totalViews  = prompts.reduce((s, p) => s + (p.viewsCount  || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!targetProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <User className="w-16 h-16 text-muted-foreground/20 mb-6" />
        <h2 className="text-3xl font-bold text-foreground mb-3 tracking-tight">Creator Not Found</h2>
        <p className="text-muted-foreground mb-10 max-w-sm">This profile may have been removed or set to private.</p>
        <Button as={Link} to={prefix('/explore')} variant="primary" size="lg">
          Explore Prompts
        </Button>
      </div>
    );
  }

  const isOfficial = targetProfile.role === 'admin' || targetProfile.role === 'staff';

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <PageContainer className="px-4 md:px-6" ignoreCustomizer>

        {/* ── Profile header ── */}
        <div className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-sm mb-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-center md:items-end gap-8 md:gap-12">

            {/* Avatar */}
            <div className="relative shrink-0">
              {targetProfile.photoURL ? (
                <img
                  src={targetProfile.photoURL}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover border-4 border-card shadow-2xl"
                  alt=""
                />
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-primary/15 border-4 border-card shadow-2xl flex items-center justify-center text-5xl font-bold text-primary">
                  {targetProfile.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              {targetProfile.subscriptionStatus === 'pro' && (
                <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground p-2.5 rounded-xl shadow-xl border-4 border-card">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter leading-none">
                  {targetProfile.displayName || 'Anonymous Creator'}
                </h1>
                {isOfficial && (
                  <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-primary/20">
                    <ShieldCheck className="w-3.5 h-3.5" /> Official
                  </span>
                )}
              </div>

              {targetProfile.username && (
                <p className="text-sm font-semibold text-muted-foreground">@{targetProfile.username}</p>
              )}

              {targetProfile.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">{targetProfile.bio}</p>
              )}

              {/* Meta: location + website */}
              {(targetProfile.location || targetProfile.website) && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-muted-foreground">
                  {targetProfile.location && (
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{targetProfile.location}</span>
                  )}
                  {targetProfile.website && (
                    <a href={targetProfile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                      <Globe className="w-3.5 h-3.5" />{targetProfile.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              )}

              {/* Expertise tags */}
              {(targetProfile.expertiseTags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-1.5">
                  {targetProfile.expertiseTags!.slice(0, 8).map(tag => (
                    <span key={tag} className="px-2.5 py-0.5 bg-primary/8 text-primary text-[11px] font-semibold rounded-full border border-primary/15">{tag}</span>
                  ))}
                </div>
              )}

              {/* Social links */}
              {targetProfile.socialLinks && Object.values(targetProfile.socialLinks).some(Boolean) && (
                <div className="flex items-center justify-center md:justify-start gap-3">
                  {targetProfile.socialLinks.twitter && (
                    <a href={targetProfile.socialLinks.twitter} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors">
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {targetProfile.socialLinks.instagram && (
                    <a href={targetProfile.socialLinks.instagram} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors">
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {targetProfile.socialLinks.github && (
                    <a href={targetProfile.socialLinks.github} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors">
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                  {targetProfile.socialLinks.youtube && (
                    <a href={targetProfile.socialLinks.youtube} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors">
                      <Youtube className="w-4 h-4" />
                    </a>
                  )}
                  {targetProfile.socialLinks.linkedin && (
                    <a href={targetProfile.socialLinks.linkedin} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors">
                      <Link2 className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}

              {/* Earned badges */}
              {(targetProfile.badges?.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  {BADGE_DEFS.filter(b => targetProfile.badges!.includes(b.id)).map(badge => {
                    const Icon = badge.icon;
                    return (
                      <span
                        key={badge.id}
                        title={badge.description}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}
                      >
                        <Icon className="w-3 h-3" />
                        {badge.label}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Affiliate milestone badges */}
              {(targetProfile.milestones?.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  {AFFILIATE_MILESTONES.filter(m => targetProfile.milestones!.includes(m.label)).map(m => (
                    <span
                      key={m.label}
                      title={m.desc}
                      className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20"
                    >
                      <span>{m.icon}</span>
                      {m.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats row */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm font-semibold text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5"><LayoutGrid className="w-4 h-4 opacity-50" />{prompts.length} prompts</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 opacity-50" />{followerCount} followers</span>
                <span className="flex items-center gap-1.5"><Heart className="w-4 h-4 opacity-50" />{totalLikes} likes</span>
                <span className="flex items-center gap-1.5"><Eye className="w-4 h-4 opacity-50" />{totalViews} views</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 opacity-50" />Joined {((ca: any) => ca?.toDate ? ca.toDate() : new Date(ca))(targetProfile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Actions */}
            {!isOwnProfile && !isOfficial && (
              <div className="flex gap-3">
                <Button
                  onClick={handleFollow}
                  isLoading={followLoading}
                  variant={following ? 'outline' : 'primary'}
                  size="md"
                  leftIcon={following ? UserCheck : UserPlus}
                >
                  {following ? 'Following' : 'Follow'}
                </Button>
              </div>
            )}
            {isOwnProfile && (
              <Link
                to={prefix('/settings/profile')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                <User className="w-4 h-4" /> Edit Profile
              </Link>
            )}
          </div>
        </div>

        {/* ── Prompts grid ── */}
        <h2 className="text-lg font-black text-foreground mb-6 tracking-tight">
          Public Prompts
          {prompts.length > 0 && (
            <span className="ml-2 text-sm font-bold text-muted-foreground">({prompts.length})</span>
          )}
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts.map((prompt, i) => (
            <motion.div
              key={prompt.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                  {prompt.model}
                </span>
                <div className="flex items-center gap-3 text-muted-foreground text-xs font-semibold">
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{prompt.likesCount || 0}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{prompt.viewsCount || 0}</span>
                </div>
              </div>
              <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2 tracking-tight leading-tight">
                {prompt.title}
              </h3>
              <p className="text-muted-foreground text-sm mb-6 line-clamp-2 leading-relaxed flex-1">
                {prompt.description}
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
                  {new Date(prompt.createdAt).toLocaleDateString()}
                </span>
                <Button
                  as={Link}
                  to={prefix(`/prompt/${prompt.slug || prompt.id}`)}
                  variant="secondary"
                  size="icon"
                  className="w-9 h-9 hover:bg-primary hover:text-primary-foreground"
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
          {prompts.length === 0 && (
            <div className="col-span-full py-24 text-center bg-muted/20 rounded-xl border-2 border-dashed border-border">
              <LayoutGrid className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-1">No public prompts yet</h3>
              <p className="text-sm text-muted-foreground">This creator hasn't published any prompts.</p>
            </div>
          )}
        </div>

      </PageContainer>
    </div>
  );
}
