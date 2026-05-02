import { Prompt } from '../types';

export const MOCK_PROMPTS: Prompt[] = [
  {
    id: '1',
    title: 'Advanced SEO Blog Writer',
    description: 'A comprehensive prompt to generate high-ranking SEO blog posts with structured headings and meta data.',
    content: '# Advanced SEO Blog Writer Prompt\n\nYou are an expert SEO content strategist. Your task is to write a blog post that ranks on Page 1 of Google.\n\n## Instructions:\n1. Use the primary keyword in the first paragraph.\n2. Include at least 3 LSI keywords.\n3. Write in an engaging, authoritative tone.\n4. Ensure the content length is at least 1500 words.',
    isPaid: true,
    categoryId: 'seo',
    creatorId: 'user-1',
    model: 'GPT-4',
    tags: ['SEO', 'Marketing'],
    likesCount: 120,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Python Scripting Assistant',
    description: 'Expert assistant for writing clean, optimized, and commented Python code for data processing.',
    content: '# Python Scripting Specialist\n\nYou are a Senior Python Developer. Your goal is to write clean, efficient, and well-documented Python scripts.\n\n## Guidelines:\n- Follow PEP 8 style guide.\n- Use type hinting for all function parameters and return types.\n- Include docstrings for every class and function.\n- Prefer built-in libraries over third-party ones where possible.',
    isPaid: false,
    categoryId: 'coding',
    creatorId: 'user-2',
    model: 'Gemini Pro',
    tags: ['Python', 'Coding'],
    likesCount: 85,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Viral Thread Generator',
    description: 'Create engaging Twitter threads that hook readers and drive massive engagement.',
    content: '# Twitter Thread Architect\n\nYou are a viral social media strategist. You specialize in creating high-engagement Twitter threads.\n\n## Strategy:\n- **Hook:** Start with a bold claim or a question.\n- **Body:** Use bullet points and lists to make it skimmable.\n- **Conclusion:** End with a strong CTA or a summary tweet.',
    isPaid: true,
    categoryId: 'marketing',
    creatorId: 'user-3',
    model: 'Claude-3',
    tags: ['Marketing', 'Social Media'],
    likesCount: 240,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
