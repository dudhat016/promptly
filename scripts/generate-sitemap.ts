import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const BASE_URL = (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://aipromptcopypaste.in').replace(/\/$/, '');

async function generateSitemap() {
  console.log('Generating dynamic sitemap...');

  const staticUrls = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/explore', priority: '0.9', changefreq: 'daily' },
    { loc: '/pricing', priority: '0.9', changefreq: 'weekly' },
    { loc: '/blog', priority: '0.85', changefreq: 'daily' },
    { loc: '/blog/raksha-bandhan-ai-photo-prompts-guide-2026', priority: '0.85', changefreq: 'weekly' },
    { loc: '/blog/the-future-of-prompt-engineering-in-2026', priority: '0.8', changefreq: 'monthly' },
    { loc: '/blog/5-techniques-to-write-better-code-prompts', priority: '0.8', changefreq: 'monthly' },
    { loc: '/about', priority: '0.7', changefreq: 'monthly' },
    { loc: '/contact', priority: '0.6', changefreq: 'monthly' },
    { loc: '/faq', priority: '0.6', changefreq: 'monthly' },
    { loc: '/login', priority: '0.5', changefreq: 'yearly' },
    { loc: '/register', priority: '0.5', changefreq: 'yearly' },
    { loc: '/privacy', priority: '0.4', changefreq: 'monthly' },
    { loc: '/terms', priority: '0.4', changefreq: 'monthly' },
  ];

  let blogUrls: { loc: string; priority: string; changefreq: string }[] = [];
  let promptUrls: { loc: string; priority: string; changefreq: string }[] = [];

  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // 1. Fetch Blog Posts
    const blogSnap = await getDocs(query(collection(db, 'blog_posts'), where('status', '==', 'published')));
    blogUrls = blogSnap.docs.map(doc => ({
      loc: `/blog/${doc.data().slug || doc.id}`,
      priority: '0.85',
      changefreq: 'weekly',
    }));

    // 2. Fetch Prompts
    const promptSnap = await getDocs(query(collection(db, 'prompts'), where('status', '==', 'approved')));
    promptUrls = promptSnap.docs.map(doc => ({
      loc: `/prompts/${doc.data().slug || doc.id}`,
      priority: '0.8',
      changefreq: 'weekly',
    }));
  } catch (err) {
    console.warn('Could not fetch Firestore routes, using fallback entries:', (err as Error).message);
    blogUrls = [
      { loc: '/blog/raksha-bandhan-ai-photo-prompts-guide-2026', priority: '0.85', changefreq: 'weekly' },
      { loc: '/blog/the-future-of-prompt-engineering-in-2026', priority: '0.8', changefreq: 'monthly' },
      { loc: '/blog/5-techniques-to-write-better-code-prompts', priority: '0.8', changefreq: 'monthly' },
    ];
  }

  const allUrls = [...staticUrls, ...blogUrls, ...promptUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${BASE_URL}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`✅ Sitemap successfully written to ${sitemapPath} (${allUrls.length} URLs)`);
}

generateSitemap().catch(console.error);
