import { Prompt, BlogPost } from '../types';

/**
 * Generates a high-converting meta description if one isn't provided.
 * Expert Marketing Strategy: Focus on Benefits, Model, and Category.
 */
export function generateSmartDescription(data: Prompt | BlogPost, type: 'prompt' | 'blog'): string {
  if (type === 'prompt') {
    const p = data as Prompt;
    if (p.metaDescription) return p.metaDescription;

    const modelName = p.model || 'AI';
    const categoryName = p.categoryId || 'creative';
    
    return `Unlock this professional ${p.title} prompt for ${modelName}. Optimized for ${categoryName} tasks to save you hours of work. Expert-engineered for high-quality results on Promptly.`;
  } else {
    const b = data as BlogPost;
    if (b.metaDescription) return b.metaDescription;
    if (b.excerpt) return b.excerpt;

    return `Read ${b.title} on the Promptly Blog. Expert insights into AI engineering, prompt optimization, and the future of generative models.`;
  }
}

/**
 * Generates SEO-optimized meta keywords if missing.
 */
export function generateSmartKeywords(data: Prompt | BlogPost): string {
  if (data.metaKeywords) return data.metaKeywords;
  
  const tags = data.tags || [];
  const baseKeywords = ['ai prompt', 'prompt engineering', 'expert prompt'];
  
  return [...new Set([...baseKeywords, ...tags])].join(', ');
}
