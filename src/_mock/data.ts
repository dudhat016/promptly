import { fakeId, recentDate, randomBetween, randomFrom } from './utils';

// ─── Users ──────────────────────────────────────────────────
export const mockUsers = [
  { id: fakeId(), displayName: 'Sarah Chen', email: 'sarah@example.com', photoURL: null, role: 'pro', createdAt: recentDate(90) },
  { id: fakeId(), displayName: 'James Wilson', email: 'james@example.com', photoURL: null, role: 'free', createdAt: recentDate(60) },
  { id: fakeId(), displayName: 'Priya Patel', email: 'priya@example.com', photoURL: null, role: 'admin', createdAt: recentDate(180) },
  { id: fakeId(), displayName: 'Liam O\'Brien', email: 'liam@example.com', photoURL: null, role: 'pro', createdAt: recentDate(45) },
  { id: fakeId(), displayName: 'Mei Zhang', email: 'mei@example.com', photoURL: null, role: 'free', createdAt: recentDate(30) },
];

// ─── Prompts ────────────────────────────────────────────────
const categories = ['Marketing', 'Development', 'Design', 'Writing', 'Education', 'Business'];
const models = ['GPT-4', 'Claude 3', 'Gemini Pro', 'Midjourney', 'DALL-E 3'];

export const mockPrompts = Array.from({ length: 12 }, (_, i) => ({
  id: fakeId(),
  title: `${randomFrom(['Ultimate', 'Advanced', 'Pro', 'Expert'])} ${randomFrom(categories)} ${randomFrom(['Prompt', 'Template', 'Framework'])}`,
  description: 'A carefully crafted prompt template for professional use.',
  category: randomFrom(categories),
  model: randomFrom(models),
  price: randomFrom([0, 4.99, 9.99, 14.99, 19.99]),
  rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
  reviewCount: randomBetween(5, 200),
  downloadCount: randomBetween(50, 5000),
  authorId: randomFrom(mockUsers).id,
  authorName: randomFrom(mockUsers).displayName,
  isFeatured: i < 3,
  createdAt: recentDate(60),
}));

// ─── Dashboard Stats ────────────────────────────────────────
export const mockDashboardStats = {
  totalUsers: randomBetween(1200, 2500),
  totalRevenue: randomBetween(15000, 45000),
  activeSubscriptions: randomBetween(300, 800),
  totalPrompts: randomBetween(500, 1500),
  newUsersThisWeek: randomBetween(20, 80),
  revenueChange: parseFloat((Math.random() * 30 - 5).toFixed(1)),
  userChange: parseFloat((Math.random() * 20 + 2).toFixed(1)),
  promptChange: parseFloat((Math.random() * 15 + 1).toFixed(1)),
};

// ─── Support Tickets ────────────────────────────────────────
const ticketStatuses = ['open', 'in_progress', 'resolved', 'closed'] as const;
const ticketPriorities = ['low', 'medium', 'high', 'critical'] as const;

export const mockTickets = Array.from({ length: 8 }, () => ({
  id: fakeId(),
  subject: randomFrom(['Login issue', 'Payment failed', 'Feature request', 'Bug report', 'Account upgrade', 'API access']),
  status: randomFrom([...ticketStatuses]),
  priority: randomFrom([...ticketPriorities]),
  userId: randomFrom(mockUsers).id,
  userName: randomFrom(mockUsers).displayName,
  createdAt: recentDate(14),
}));

// ─── Blog Posts ─────────────────────────────────────────────
export const mockBlogPosts = Array.from({ length: 6 }, () => ({
  id: fakeId(),
  title: `${randomFrom(['How to', 'Guide:', 'Top 10', 'Why'])} ${randomFrom(['AI Prompts', 'Prompt Engineering', 'ChatGPT Tips', 'Content Creation'])}`,
  slug: fakeId(),
  excerpt: 'Discover the latest techniques and best practices for creating effective AI prompts.',
  author: randomFrom(mockUsers).displayName,
  category: randomFrom(['Tutorial', 'News', 'Guide', 'Case Study']),
  readTime: `${randomBetween(3, 12)} min`,
  publishedAt: recentDate(30),
}));
