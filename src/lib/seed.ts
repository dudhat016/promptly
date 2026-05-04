import { collection, getDocs, setDoc, doc, getDoc, serverTimestamp, query, limit, addDoc, where } from 'firebase/firestore';
import { db, auth } from './firebase';

const SEED_PROMPTS = [
  {
    id: 'seo-1',
    title: 'Advanced SEO Content Strategist',
    description: 'Create a full SEO content strategy including keywords, word counts, and search intent mapping.',
    content: `Act as an SEO Specialist. Create a 4-week content calendar for a blog about [TOPIC].
    For each week:
    - Target Keyword
    - Search Intent (Informational, Transactional, etc.)
    - Proposed Title
    - Outline (H1, H2, H3)
    - Target Word Count`,
    isPaid: true,
    creatorId: 'system',
    model: 'GPT-4',
    tags: ['SEO', 'Marketing'],
    likesCount: 156,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    id: 'code-1',
    title: 'React Performance Optimizer',
    description: 'Analyze React components for re-render issues and provide optimized versions with memoization.',
    content: 'Review the following React component for performance bottlenecks: [CODE_BLOCK]',
    isPaid: false,
    creatorId: 'system',
    model: 'Claude-3',
    tags: ['React', 'Performance'],
    likesCount: 89,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    id: 'wedding-1',
    title: 'Royal Cinematic Wedding Portrait',
    description: 'Breathtaking 8k cinematic wedding portrait with natural lighting and elegant attire.',
    content: 'Cinematic wedding portrait, royal aesthetic, bride and groom in vintage lace and black tuxedo, golden hour lighting, soft bokeh, 8k resolution, highly detailed, shot on Phase One XF.',
    isPaid: true,
    creatorId: 'system',
    model: 'Midjourney v6',
    categoryId: 'wedding',
    tags: ['Wedding', 'Portrait', 'Cinematic'],
    likesCount: 420,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    id: 'baby-1',
    title: 'Whimsical Baby Shower Invitation Art',
    description: 'Soft pastel watercolor illustration for a baby shower theme.',
    content: 'Whimsical watercolor illustration, baby animals (elephant, giraffe), soft pastel colors, blue and silver accents, white background, high quality, nursery art style.',
    isPaid: true,
    creatorId: 'system',
    model: 'DALL-E 3',
    categoryId: 'baby-shower',
    tags: ['Baby', 'Illustration', 'Watercolor'],
    likesCount: 215,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    id: 'insta-1',
    title: 'Minimalist Lifestyle Product Shot',
    description: 'Clean, minimalist product photography for Instagram branding.',
    content: 'Minimalist product photography, skincare bottle on marble surface, soft morning light, eucalyptus leaf shadow, neutral colors, aesthetic, high-end branding style.',
    isPaid: false,
    creatorId: 'system',
    model: 'Midjourney v6',
    categoryId: 'instagram',
    tags: ['Instagram', 'Product', 'Minimalist'],
    likesCount: 850,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  { id: 'p-1', title: 'Test Prompt 1', description: 'Test', content: 'Test prompt', isPaid: true, creatorId: 'system', model: 'GPT-4', categoryId: 'seo', tags: ['Test'], createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
  { id: 'p-2', title: 'Test Prompt 2', description: 'Test', content: 'Test prompt', isPaid: true, creatorId: 'system', model: 'GPT-4', categoryId: 'seo', tags: ['Test'], createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
  { id: 'p-3', title: 'Test Prompt 3', description: 'Test', content: 'Test prompt', isPaid: true, creatorId: 'system', model: 'GPT-4', categoryId: 'seo', tags: ['Test'], createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
  { id: 'p-4', title: 'Test Prompt 4', description: 'Test', content: 'Test prompt', isPaid: true, creatorId: 'system', model: 'GPT-4', categoryId: 'seo', tags: ['Test'], createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
  { id: 'p-5', title: 'Test Prompt 5', description: 'Test', content: 'Test prompt', isPaid: true, creatorId: 'system', model: 'GPT-4', categoryId: 'seo', tags: ['Test'], createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
  { id: 'p-6', title: 'Test Prompt 6', description: 'Test', content: 'Test prompt', isPaid: true, creatorId: 'system', model: 'GPT-4', categoryId: 'seo', tags: ['Test'], createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
  { id: 'p-7', title: 'Test Prompt 7', description: 'Test', content: 'Test prompt', isPaid: true, creatorId: 'system', model: 'GPT-4', categoryId: 'seo', tags: ['Test'], createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
  { id: 'p-8', title: 'Test Prompt 8', description: 'Test', content: 'Test prompt', isPaid: true, creatorId: 'system', model: 'GPT-4', categoryId: 'seo', tags: ['Test'], createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
  { id: 'p-9', title: 'Test Prompt 9', description: 'Test', content: 'Test prompt', isPaid: true, creatorId: 'system', model: 'GPT-4', categoryId: 'seo', tags: ['Test'], createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
  { id: 'p-10', title: 'Test Prompt 10', description: 'Test', content: 'Test prompt', isPaid: true, creatorId: 'system', model: 'GPT-4', categoryId: 'seo', tags: ['Test'], createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
];

const SEED_CATEGORIES = [
  { id: 'seo', name: 'SEO & Marketing', slug: 'seo' },
  { id: 'coding', name: 'Coding & Dev', slug: 'coding' },
  { id: 'creative', name: 'Creative Writing', slug: 'creative' },
  { id: 'business', name: 'Business & Productivity', slug: 'business' },
  { id: 'wedding', name: 'Wedding (Premium)', slug: 'wedding', isPremium: true },
  { id: 'baby-shower', name: 'Baby Shower (Premium)', slug: 'baby-shower', isPremium: true },
  { id: 'portrait', name: 'Portrait Photography', slug: 'portrait', isPremium: true },
  { id: 'instagram', name: 'Instagram Content', slug: 'instagram' }
];

const SEED_BLOGS = [
  {
    id: 'future-of-prompt-engineering',
    title: 'The Future of Prompt Engineering in 2026',
    slug: 'future-of-prompt-engineering',
    excerpt: `As AI models become more sophisticated, the way we talk to them is changing. Here is what you need to know to stay ahead.`,
    content: `## The Evolution of Prompting\n\nPrompt engineering has evolved significantly from the early days of appending "think step by step" to everything. Modern LLMs are capable of zero-shot reasoning on complex tasks, provided the context window is utilized correctly.\n\n### 1. Context Over Directives\nInstead of telling the AI *how* to act, provide it with the *context* of the problem. \n\n### 2. Multi-Agent Systems\nThe future isn't one mega-prompt; it's chaining smaller, highly specific prompts across multiple agents. We are seeing a massive shift towards workflows where an AI researcher gathers data, an AI writer drafts, and an AI editor reviews.`,
    coverImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1000',
    authorId: 'system',
    status: 'published',
    tags: ['AI Trends', 'Prompt Engineering'],
    publishedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    id: 'how-to-write-better-prompts',
    title: '5 Techniques to Write Better Code Prompts',
    slug: 'how-to-write-better-prompts',
    excerpt: `Struggling to get usable code from ChatGPT or Claude? Follow these 5 proven techniques to get production-ready code.`,
    content: `## Stop Getting Generic Code\n\nIf you ask an AI to "write a login component", you will get generic, insecure code. \n\n### 1. Specify the Stack Completely\nAlways mention versions: "Write a React 18 component using Tailwind CSS v3 and Lucide React icons."\n\n### 2. Define the Edge Cases upfront\n"Handle the loading state, the error state if the API returns 401, and the success redirect."\n\nBy giving the AI constraints, you reduce hallucinations and increase code quality.`,
    coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=1000',
    authorId: 'system',
    status: 'published',
    tags: ['Coding', 'Tutorial'],
    publishedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

export async function seedDatabase() {
  try {
    const qP = await getDocs(collection(db, 'prompts'));
    const qC = await getDocs(collection(db, 'categories'));

    if (auth.currentUser) {
      // Final safety check: Verify user is actually an admin in Firestore
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDoc.data();
      
      if (userData?.role !== 'admin') {
        console.log("Seeding skipped: User is not an admin.");
        return;
      }

      console.log("Checking categories...");
      for (const cat of SEED_CATEGORIES) {
        const { id, ...data } = cat;
        await setDoc(doc(db, 'categories', id), data, { merge: true });
      }
      console.log("Categories synchronized.");

      console.log("Seeding prompts with enhanced security...");
      for (const p of SEED_PROMPTS) {
        const { id, content, ...metadata } = p;
        // 1. Save Public Metadata
        await setDoc(doc(db, 'prompts', id), {
          ...metadata,
          hasPrivateContent: true, // Flag for UI to know there is a secret to fetch
          categoryId: metadata.categoryId || SEED_CATEGORIES[0].id,
          updatedAt: serverTimestamp()
        });
        
        // 2. Save Secret Formula in Protected Subcollection
        await setDoc(doc(db, 'prompts', id, 'private', 'content'), {
          formula: content,
          updatedAt: serverTimestamp()
        });
      }
      console.log("Prompts synchronized.");
    }

    // Seed Blog Posts
    const blogsQuery = query(collection(db, 'blog_posts'), limit(1));
    const blogsSnapshot = await getDocs(blogsQuery);
    
    if (blogsSnapshot.empty) {
      console.log("Seeding blog posts...");
      let addedBlogs = 0;
      
      for (const post of SEED_BLOGS) {
        try {
          await addDoc(collection(db, 'blog_posts'), post);
          addedBlogs++;
        } catch (error) {
          console.error("Error adding blog post:", error);
        }
      }
      console.log(`Successfully seeded ${addedBlogs} blog posts.`);
    }

    // Seed Marketing Tags
    const marketingTagsQuery = query(collection(db, 'marketing_tags'), where('source', '==', 'seed'), limit(1));
    const marketingTagsSnapshot = await getDocs(marketingTagsQuery);
    const tagMap: Record<string, string> = {};

    if (marketingTagsSnapshot.empty) {
      console.log("Seeding marketing tags...");
      const tagNames = ['newsletter', 'contact_form', 'customer', 'lead'];
      for (const name of tagNames) {
        const docRef = await addDoc(collection(db, 'marketing_tags'), {
          name,
          color: name === 'lead' ? '#f59e0b' : '#4f46e5',
          contactCount: 0,
          source: 'seed',
          createdAt: serverTimestamp()
        });
        tagMap[name] = docRef.id;
      }
      console.log("Marketing tags seeded successfully.");
    } else {
      // If tags exist, we need to map them for the contact seeding below
      const allTags = await getDocs(collection(db, 'marketing_tags'));
      allTags.forEach(doc => {
        tagMap[doc.data().name] = doc.id;
      });
    }

    // Seed Marketing Segments
    const marketingSegmentsQuery = query(collection(db, 'marketing_segments'), where('source', '==', 'seed'), limit(1));
    const marketingSegmentsSnapshot = await getDocs(marketingSegmentsQuery);

    if (marketingSegmentsSnapshot.empty) {
      console.log("Seeding marketing segments...");
      await addDoc(collection(db, 'marketing_segments'), {
        name: 'All Newsletter Subscribers',
        description: 'Users who signed up via the blog sidebar',
        matchType: 'and',
        filters: [{ field: 'tags', operator: 'contains', value: tagMap['newsletter'] || 'newsletter' }],
        contactCount: 0,
        source: 'seed',
        createdAt: serverTimestamp()
      });
      await addDoc(collection(db, 'marketing_segments'), {
        name: 'High-Intent: Marketing Enthusiasts',
        description: 'Users automatically tagged by the Affinity Engine due to high engagement with marketing content.',
        matchType: 'and',
        filters: [{ field: 'tags', operator: 'contains', value: 'High-Intent: MARKETING' }],
        contactCount: 0,
        source: 'seed',
        createdAt: serverTimestamp()
      });
      console.log("Marketing segments seeded successfully.");
    }

    // Force seed High-Intent Segment if missing
    const highIntentSegQ = query(collection(db, 'marketing_segments'), where('name', '==', 'High-Intent: Marketing Enthusiasts'), limit(1));
    const highIntentSegSnap = await getDocs(highIntentSegQ);
    if (highIntentSegSnap.empty) {
      await addDoc(collection(db, 'marketing_segments'), {
        name: 'High-Intent: Marketing Enthusiasts',
        description: 'Users automatically tagged by the Affinity Engine due to high engagement with marketing content.',
        matchType: 'and',
        filters: [{ field: 'tags', operator: 'contains', value: 'High-Intent: MARKETING' }],
        contactCount: 0,
        source: 'seed',
        createdAt: serverTimestamp()
      });
    }

    // Seed Marketing Contacts
    const marketingContactsQuery = query(collection(db, 'marketing_contacts'), where('source', '==', 'seed'), limit(1));
    const marketingContactsSnapshot = await getDocs(marketingContactsQuery);

    if (marketingContactsSnapshot.empty) {
      console.log("Seeding marketing contacts...");
      const contacts = [
        { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', tagName: 'newsletter' },
        { firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com', tagName: 'contact_form' },
        { firstName: 'Charlie', lastName: 'Brown', email: 'charlie@example.com', tagName: 'customer' },
        { firstName: 'Dave', lastName: 'Marketer', email: 'dave@example.com', tagName: 'customer', customTag: 'High-Intent: MARKETING' }
      ];

      for (const c of contacts) {
        await addDoc(collection(db, 'marketing_contacts'), {
          firstName: c.firstName,
          lastName: c.lastName,
          displayName: `${c.firstName} ${c.lastName}`,
          email: c.email,
          tags: c.customTag ? [c.customTag, tagMap[c.tagName]].filter(Boolean) : (tagMap[c.tagName] ? [tagMap[c.tagName]] : []),
          status: 'active',
          source: 'seed',
          createdAt: serverTimestamp(),
          lastActiveAt: serverTimestamp()
        });
      }
      console.log("Marketing contacts seeded successfully.");
    }

    // Force seed Dave Marketer if missing
    const daveQ = query(collection(db, 'marketing_contacts'), where('email', '==', 'dave@example.com'), limit(1));
    const daveSnap = await getDocs(daveQ);
    if (daveSnap.empty) {
      await addDoc(collection(db, 'marketing_contacts'), {
        firstName: 'Dave',
        lastName: 'Marketer',
        displayName: 'Dave Marketer',
        email: 'dave@example.com',
        tags: ['High-Intent: MARKETING', tagMap['customer']].filter(Boolean),
        status: 'active',
        source: 'seed',
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      });
    }

    // Seed Global Config
    const configRef = doc(db, 'configs', 'global');
    const configSnap = await getDoc(configRef);
    if (!configSnap.exists()) {
      console.log("Seeding global config...");
      await setDoc(configRef, {
        activePromotion: 'trial',
        freeTrialEnabled: true,
        freeTrialDays: 7,
        yearlyIncentiveType: 'percent',
        yearlyIncentiveValue: 20,
        vaultLimit: 10,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
      console.log("Global config seeded.");
    }

    // Seed Site Pages SEO
    const sitePagesSnapshot = await getDocs(collection(db, 'site_pages'));
    if (sitePagesSnapshot.empty) {
      console.log("Seeding site pages SEO...");
      const sitePages = [
        { 
          id: 'home', 
          path: '/', 
          title: 'Promptly - Master the Art of AI Prompting | Expert Prompt Marketplace',
          description: 'Discover, build, and monetize expert-level AI prompts. The leading marketplace for GPT, Claude, and Gemini high-performance prompts.',
          keywords: 'ai prompts, gpt prompts, claude prompts, prompt marketplace',
          canonical: window.location.origin + '/'
        },
        { 
          id: 'explore', 
          path: '/explore', 
          title: 'Explore AI Prompts - Promptly Marketplace',
          description: 'Browse thousands of high-quality, verified prompts for any AI model including GPT-4, Claude 3, and Gemini Pro.',
          keywords: 'browse prompts, ai library, prompt engineering',
          canonical: window.location.origin + '/explore'
        },
        { 
          id: 'pricing', 
          path: '/pricing', 
          title: 'Pricing Plans - Promptly Premium',
          description: 'Choose the perfect plan to supercharge your AI workflow. Get unlimited access to premium expert prompts.',
          keywords: 'promptly pricing, pro prompts, subscription',
          canonical: window.location.origin + '/pricing'
        },
        { 
          id: 'blog', 
          path: '/blog', 
          title: 'Promptly Blog - AI Prompting Tips & Trends',
          description: 'Stay ahead of the curve with the latest trends in AI, prompt engineering tutorials, and industry insights.',
          keywords: 'ai blog, prompt engineering news, tech trends',
          canonical: window.location.origin + '/blog'
        },
        { 
          id: 'contact', 
          path: '/contact', 
          title: 'Contact Us - Promptly Support',
          description: 'Have questions or need help? Reach out to our team for support, partnerships, or feedback.',
          keywords: 'contact promptly, support, help desk',
          canonical: window.location.origin + '/contact'
        }
      ];

      for (const page of sitePages) {
        const { id, ...data } = page;
        await setDoc(doc(db, 'site_pages', id), data);
      }
      console.log("Site pages SEO seeded successfully.");
    }

    // Seed Access Levels
    const accessLevelsRef = doc(db, 'configs', 'access_levels');
    const accessLevelsSnap = await getDoc(accessLevelsRef);
    if (!accessLevelsSnap.exists()) {
      console.log("Seeding default access levels...");
      await setDoc(accessLevelsRef, {
        groups: [
          { id: 'basic', name: 'Basic', description: 'Limited access to prompts', color: '#64748b' },
          { id: 'pro', name: 'Pro', description: 'Access to most premium prompts', color: '#4f46e5' },
          { id: 'enterprise', name: 'Enterprise', description: 'Unlimited access to everything', color: '#0f172a' }
        ],
        lastUpdated: serverTimestamp()
      });
      console.log("Default access levels seeded.");
    }

    console.log("Database seed check completed.");
  } catch (err) {
    console.warn("Seeding skipped or failed:", err);
  }
}
