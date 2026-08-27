import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { BlogPost } from '../types';

const SLUG = 'raksha-bandhan-ai-photo-prompts-guide-2026';

const HTML_CONTENT = `
<h2>Top AI Prompts for Raksha Bandhan Photography</h2>
<p>Raksha Bandhan is a beautiful celebration of the eternal bond between brothers and sisters. With AI image generators like Midjourney, Midjourney v6, and Stable Diffusion, you can create stunning, ultra-realistic portrait photography capturing traditional warmth, intricate Rakhi thalis, marigold decor, and emotional festive moments.</p>
<p>Here are the top AI prompts for Raksha Bandhan photoshoot photography with instant copyable formula cards:</p>
<hr>
<h3>1. Traditional Mustard Yellow Outfit Photography</h3>
<p>Capture warm golden cinematic lighting with authentic marigold garlands, sweets, and glowing diyas.</p>
<img src="https://techworldproduct.com/promptly/public/raksha_bandhan_1.jpg" alt="Raksha Bandhan Traditional Portrait">
<pre><code class="language-prompt">Ultra realistic cute young Indian brother and sister celebrating Raksha Bandhan together, both wearing elegant matching mustard-yellow traditional outfits, smiling lovingly while the sister ties a beautiful rakhi on her brother's wrist, festive home decor with marigold garlands, glowing diyas, sweets, gift box and rakhi thali, warm golden cinematic lighting, premium festive photography, DSLR quality, soft bokeh, highly detailed, with elegant "Happy Raksha Bandhan" text clearly written at the top</code></pre>
<hr>
<h3>2. Vertical 9:16 Royal Blue &amp; Emerald Green Outfit Concept</h3>
<p>A cinematic vertical portrait ideal for mobile wallpapers, story posts, and high-definition prints.</p>
<img src="https://techworldproduct.com/promptly/public/raksha_bandhan_2.jpg" alt="Raksha Bandhan Vertical Concept">
<pre><code class="language-prompt">Create an ultra-realistic cinematic vertical 9:16 Raksha Bandhan photo using uploaded references. First image = sister, second image = brother. Strict identity lock: preserve both faces, facial features, skin tone, hair, age, and natural appearance exactly; change only pose, clothing, and environment. Show them standing together at home, with the sister tying a red-and-gold Rakhi on her brother's wrist as both look down with warm smiles. Brother: deep royal blue embroidered kurta, white pajama, curly black hair, groomed beard, red tilak. Sister: deep emerald green net dupatta with gold border, dark hair styled softly. Background: festive home setup, marigold flowers, glowing diyas, elegant background decoration, soft warm bokeh, highly detailed 8k portrait photography.</code></pre>
<hr>
<h3>3. Cozy Home Festive Moments with Rakhi Thali</h3>
<p>A close-up aesthetic shot focusing on the intricate details of the Rakhi thali, sweets (Kaju Katli), and golden embroidery.</p>
<pre><code class="language-prompt">Close-up ultra-realistic portrait of an Indian brother and sister during Raksha Bandhan ceremony, sister applying kumkum tilak on brother's forehead, detailed brass thali filled with sweets, grains, and beautiful silk threads, ambient festival indoor lighting, shallow depth of field, 85mm lens, photorealistic 8k</code></pre>
<hr>
<h3>Pro Tips for Generating Raksha Bandhan AI Images</h3>
<ol>
<li><strong>Identity Consistency</strong>: Use reference images when generating portraits of specific individuals.</li>
<li><strong>Aspect Ratio</strong>: Use <code>--ar 9:16</code> for mobile stories/reels and <code>--ar 4:3</code> or <code>--ar 16:9</code> for landscape wallpapers.</li>
<li><strong>Lighting keywords</strong>: Include terms like <code>warm golden hour lighting</code>, <code>soft ambient bokeh</code>, <code>festive indoor glow</code> for rich cinematic depth.</li>
</ol>
`;

export const RAKSHA_BANDHAN_BLOG: BlogPost = {
  id: SLUG,
  title: 'Top Ultra-Realistic AI Prompts for Raksha Bandhan Photography',
  slug: SLUG,
  excerpt: 'Explore best Midjourney & AI prompts for Raksha Bandhan photoshoots with copyable formula cards, traditional outfits, and lighting tips.',
  authorId: 'system',
  content: HTML_CONTENT,
  coverImage: 'https://techworldproduct.com/promptly/public/raksha_bandhan_1.jpg',
  authorName: 'Chintan Dudhat',
  authorRole: 'admin',
  tags: ['Prompt Engineering', 'AI Trends', 'Midjourney', 'Photography'],
  status: 'published',
  metaTitle: 'Raksha Bandhan AI Photo Prompts & Photography Guide',
  metaDescription: 'Discover copyable AI prompts for Raksha Bandhan photoshoots with ultra-realistic Midjourney formulas and lighting tips.',
  viewsCount: 142,
  createdAt: { toMillis: () => Date.now() } as any,
  publishedAt: { toMillis: () => Date.now() } as any,
  updatedAt: { toMillis: () => Date.now() } as any,
};

export async function seedRakhiBlog(): Promise<string | null> {
  try {
    const { id: _id, createdAt: _c, publishedAt: _p, updatedAt: _u, ...data } = RAKSHA_BANDHAN_BLOG;
    await setDoc(doc(db, 'blog_posts', SLUG), {
      ...data,
      createdAt: serverTimestamp(),
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log('Raksha Bandhan blog post seeded with ID:', SLUG);
    return SLUG;
  } catch (err) {
    console.error('Error seeding blog to Firestore:', err);
    return null;
  }
}
