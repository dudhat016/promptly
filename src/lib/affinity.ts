import { Prompt, BlogPost } from '../types';
import { db, auth } from './firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

const AFFINITY_KEY = 'user_affinity_profile';
const LAST_VISITED_KEY = 'user_affinity_last_visited';

interface AffinityProfile {
  [key: string]: number;
}

// Get the current affinity profile from localStorage
export const getAffinityProfile = (): AffinityProfile => {
  try {
    const data = localStorage.getItem(AFFINITY_KEY);
    const profile = data ? JSON.parse(data) : {};

    // Real-world Time Decay Logic
    const lastVisitedStr = localStorage.getItem(LAST_VISITED_KEY);
    const now = Date.now();
    
    if (lastVisitedStr && Object.keys(profile).length > 0) {
      const lastVisited = parseInt(lastVisitedStr, 10);
      const daysElapsed = (now - lastVisited) / (1000 * 60 * 60 * 24);
      
      // Startup Friendly Decay: Because users might not visit daily, we DO NOT decay their score over a few days.
      // We freeze their profile completely unless they have been gone for over 30 days (a full month).
      if (daysElapsed >= 30) {
        const monthsElapsed = Math.floor(daysElapsed / 30);
        // Lose only 5% per month of absence, capped at 50% retention
        const decayFactor = Math.max(Math.pow(0.95, monthsElapsed), 0.5); 
        
        Object.keys(profile).forEach(key => {
          profile[key] = Number((profile[key] * decayFactor).toFixed(2));
          if (profile[key] < 0.1) delete profile[key];
        });

        localStorage.setItem(AFFINITY_KEY, JSON.stringify(profile));
      }
    }
    
    // Always update last visited to right now
    localStorage.setItem(LAST_VISITED_KEY, now.toString());

    return profile;
  } catch {
    return {};
  }
};

// Record an interaction with a prompt
export const recordPromptInteraction = (prompt: Partial<Prompt>, weight: number = 1, applyDecay: boolean = true) => {
  try {
    const profile = getAffinityProfile();
    
    // Add weight to category
    if (prompt.categoryId) {
      profile[prompt.categoryId.toLowerCase()] = (profile[prompt.categoryId.toLowerCase()] || 0) + weight;
    }
    
    // Add weight to tags
    if (prompt.tags && Array.isArray(prompt.tags)) {
      prompt.tags.forEach(tag => {
        const slug = tag.toLowerCase().replace(/\s+/g, '-');
        profile[slug] = (profile[slug] || 0) + weight;
      });
    }
    
    // Add weight to model
    if (prompt.model) {
      const modelSlug = prompt.model.toLowerCase().replace(/\s+/g, '-');
      profile[modelSlug] = (profile[modelSlug] || 0) + weight;
    }

    // Apply time decay (every time they interact, slightly decay older stuff to keep profile fresh)
    if (applyDecay) {
      Object.keys(profile).forEach(key => {
        profile[key] = Number((profile[key] * 0.95).toFixed(2));
        if (profile[key] < 0.1) delete profile[key];
      });
    }

    localStorage.setItem(AFFINITY_KEY, JSON.stringify(profile));

    // Auto sync to cloud if logged in
    if (auth.currentUser) {
      syncAffinityToCloud(auth.currentUser.uid);
    }
  } catch (err) {
    console.error("Error recording affinity:", err);
  }
};

// Calculate how much a user will like a specific prompt based on their profile
export const calculatePromptScore = (prompt: Prompt, profile: AffinityProfile): number => {
  let score = 0;
  
  if (prompt.categoryId && profile[prompt.categoryId.toLowerCase()]) {
    score += profile[prompt.categoryId.toLowerCase()];
  }
  
  if (prompt.tags && Array.isArray(prompt.tags)) {
    prompt.tags.forEach(tag => {
      const slug = tag.toLowerCase().replace(/\s+/g, '-');
      if (profile[slug]) score += profile[slug];
    });
  }
  
  if (prompt.model) {
    const modelSlug = prompt.model.toLowerCase().replace(/\s+/g, '-');
    if (profile[modelSlug]) score += profile[modelSlug];
  }
  
  // Add a tiny random factor or recency factor so the feed isn't perfectly static
  const recencyBonus = new Date(prompt.createdAt).getTime() / (1000 * 60 * 60 * 24 * 365); // Just a small float based on year
  
  return score + (recencyBonus * 0.0001); // Tie-breaker for prompts with same tags
};

// Record an interaction with a blog post
export const recordBlogInteraction = (post: Partial<BlogPost>, weight: number = 1, applyDecay: boolean = true) => {
  try {
    const profile = getAffinityProfile();
    
    // Add weight to tags
    if (post.tags && Array.isArray(post.tags)) {
      post.tags.forEach(tag => {
        const slug = tag.toLowerCase().replace(/\s+/g, '-');
        profile[slug] = (profile[slug] || 0) + weight;
      });
    }

    // Apply time decay
    if (applyDecay) {
      Object.keys(profile).forEach(key => {
        profile[key] = Number((profile[key] * 0.95).toFixed(2));
        if (profile[key] < 0.1) delete profile[key];
      });
    }

    localStorage.setItem(AFFINITY_KEY, JSON.stringify(profile));

    // Auto sync to cloud if logged in
    if (auth.currentUser) {
      syncAffinityToCloud(auth.currentUser.uid);
    }
  } catch (err) {
    console.error("Error recording blog affinity:", err);
  }
};

// Calculate how much a user will like a specific blog post based on their profile
export const calculateBlogScore = (post: BlogPost, profile: AffinityProfile): number => {
  let score = 0;
  
  if (post.tags && Array.isArray(post.tags)) {
    post.tags.forEach(tag => {
      const slug = tag.toLowerCase().replace(/\s+/g, '-');
      if (profile[slug]) score += profile[slug];
    });
  }
  
  const recencyBonus = new Date(post.publishedAt || post.createdAt).getTime() / (1000 * 60 * 60 * 24 * 365);
  
  return score + (recencyBonus * 0.0001); 
};

// Merge cloud profile into local (highest scores win)
export const mergeCloudAffinity = (cloudProfile: AffinityProfile) => {
  if (!cloudProfile || Object.keys(cloudProfile).length === 0) return;
  const localProfile = getAffinityProfile();
  
  let changed = false;
  Object.keys(cloudProfile).forEach(key => {
    if (!localProfile[key] || cloudProfile[key] > localProfile[key]) {
      localProfile[key] = cloudProfile[key];
      changed = true;
    }
  });
  
  if (changed) {
    localStorage.setItem(AFFINITY_KEY, JSON.stringify(localProfile));
  }
};

// Sync local profile to the cloud and dynamically update CRM Tags
export const syncAffinityToCloud = async (uid: string) => {
  try {
    const profile = getAffinityProfile();
    if (Object.keys(profile).length > 0) {
      await updateDoc(doc(db, 'users', uid), {
        affinityProfile: profile
      });

      // DYNAMIC CRM TAGGING
      // Find the user's marketing contact record
      const contactRef = collection(db, 'marketing_contacts');
      const q = query(contactRef, where('userId', '==', uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const contactDoc = querySnapshot.docs[0];
        const contactData = contactDoc.data();
        let existingTags = contactData.tags || [];
        let tagsChanged = false;

        // Tag Thresholds
        Object.entries(profile).forEach(([key, score]) => {
          const formattedKey = key.toUpperCase(); 
          const highTag = `High-Intent: ${formattedKey}`;
          const lowTag = `Low-Intent: ${formattedKey}`;
          
          if (score >= 10) {
            // Upgrade to High Intent, remove Low Intent
            if (!existingTags.includes(highTag)) {
              existingTags.push(highTag);
              tagsChanged = true;
            }
            if (existingTags.includes(lowTag)) {
              existingTags = existingTags.filter(t => t !== lowTag);
              tagsChanged = true;
            }
          } else if (score >= 1 && score < 10) {
            // First time click or decaying interest: Low Intent
            if (!existingTags.includes(lowTag)) {
              existingTags.push(lowTag);
              tagsChanged = true;
            }
            if (existingTags.includes(highTag)) {
              existingTags = existingTags.filter(t => t !== highTag);
              tagsChanged = true;
            }
          }
        });

        if (tagsChanged) {
          await updateDoc(contactDoc.ref, {
            tags: existingTags
          });
        }
      }
    }
  } catch (err) {
    console.error("Failed to sync affinity to cloud", err);
  }
};
