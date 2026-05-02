import { collection, getDocs, setDoc, doc, serverTimestamp } from 'firebase/firestore';
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
    content: `Review the following React component for performance bottlenecks:
    [CODE_BLOCK]
    
    Tasks:
    1. Identify unnecessary re-renders.
    2. Implement React.memo, useMemo, or useCallback where appropriate.
    3. Suggest layout shifting improvements.
    4. Provide the final optimized code.`,
    isPaid: false,
    creatorId: 'system',
    model: 'Claude-3',
    tags: ['React', 'Performance'],
    likesCount: 89,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

const SEED_CATEGORIES = [
  { id: 'seo', name: 'SEO & Marketing', slug: 'seo' },
  { id: 'coding', name: 'Coding & Dev', slug: 'coding' },
  { id: 'creative', name: 'Creative Writing', slug: 'creative' },
  { id: 'business', name: 'Business & Productivity', slug: 'business' }
];

export async function seedDatabase() {
  try {
    const qP = await getDocs(collection(db, 'prompts'));
    const qC = await getDocs(collection(db, 'categories'));

    if (qC.empty && auth.currentUser) {
      for (const cat of SEED_CATEGORIES) {
        const { id, ...data } = cat;
        await setDoc(doc(db, 'categories', id), data);
      }
      console.log("Categories seeded.");
    }

    if (qP.empty && auth.currentUser) {
      console.log("Seeding prompts...");
      for (const prompt of SEED_PROMPTS) {
        const { id, ...data } = prompt;
        // Assign a default category if none
        const promptData = { ...data, categoryId: SEED_CATEGORIES[0].id };
        await setDoc(doc(db, 'prompts', id), promptData);
      }
      console.log("Prompts seeded.");
    }
  } catch (err) {
    console.warn("Seeding skipped or failed:", err);
  }
}
