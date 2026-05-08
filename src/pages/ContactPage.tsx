import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, MessageSquare, Send, Sparkles, Clock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useConfig } from '../hooks/useConfig';
import { Link } from 'react-router-dom';
import Select from '../components/ui/Select';

export default function ContactPage() {
  const { config } = useConfig();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'contact_messages'), {
        ...formData,
        status: 'unread',
        createdAt: serverTimestamp(),
      });

      const [firstName, ...lastNames] = formData.name.split(' ');
      const contactRef = collection(db, 'marketing_contacts');
      const q = query(contactRef, where('email', '==', formData.email));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(contactRef, {
          email: formData.email, displayName: formData.name,
          firstName: firstName || '', lastName: lastNames.join(' ') || '',
          tags: ['contact_form', 'inquiry'], status: 'active',
          source: 'contact_page', createdAt: serverTimestamp(), lastActiveAt: serverTimestamp(),
        });
      } else {
        const existing = snap.docs[0];
        const existingTags = existing.data().tags || [];
        await updateDoc(existing.ref, {
          displayName: formData.name, firstName: firstName || '', lastName: lastNames.join(' ') || '',
          tags: Array.from(new Set([...existingTags, 'contact_form', 'inquiry'])),
          lastActiveAt: serverTimestamp(),
        });
      }

      setSent(true);
      toast.success("Message sent! We'll get back to you soon.");
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ── */}
      <div className="relative pt-24 pb-20 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground)/0.15) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 bg-primary/10 border border-primary/25 text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              We typically respond within 2 hours
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-tight">
              Get in Touch
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Have a question, idea, or just want to say hi? We'd love to hear from you.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl pb-24">
        <div className="grid lg:grid-cols-5 gap-8">

          {/* ── Info sidebar ── */}
          <div className="lg:col-span-2 space-y-4">
            {[
              {
                icon: Mail,
                iconBg: 'rgba(139,92,246,0.15)',
                iconBorder: 'rgba(139,92,246,0.2)',
                iconColor: 'text-violet-500 dark:text-violet-400',
                title: 'Email Us',
                desc: 'Our team usually responds within 2 hours.',
                action: config.supportEmail ? (
                  <a href={`mailto:${config.supportEmail}`} className="text-primary hover:text-primary/80 text-sm font-semibold transition-colors">
                    {config.supportEmail}
                  </a>
                ) : null,
              },
              {
                icon: MessageSquare,
                iconBg: 'rgba(16,185,129,0.1)',
                iconBorder: 'rgba(16,185,129,0.2)',
                iconColor: 'text-emerald-600 dark:text-emerald-400',
                title: 'Help Center',
                desc: 'Browse our documentation and guides.',
                action: (
                  <Link to="/dashboard/support" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-opacity">
                    Open Help Center <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ),
              },
              {
                icon: Clock,
                iconBg: 'rgba(245,158,11,0.1)',
                iconBorder: 'rgba(245,158,11,0.2)',
                iconColor: 'text-amber-600 dark:text-amber-400',
                title: 'Response Time',
                desc: 'Mon–Fri, 9am–6pm. We aim for same-day replies.',
                action: null,
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl p-5 flex items-start gap-4 bg-card border border-border"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: card.iconBg, border: `1px solid ${card.iconBorder}` }}>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{card.title}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed mb-2">{card.desc}</p>
                  {card.action}
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Form ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-3 rounded-2xl p-8 bg-card border border-border"
          >
            {sent ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <Send className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Message Sent!</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Thanks for reaching out. We'll get back to you within a few hours.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-6 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Send another message →
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-foreground mb-6">Send a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    {[
                      { label: 'Your Name', key: 'name', type: 'text', placeholder: 'John Doe' },
                      { label: 'Email Address', key: 'email', type: 'email', placeholder: 'john@example.com' },
                    ].map(({ label, key, type, placeholder }) => (
                      <div key={key}>
                        <label htmlFor={key} className="block text-sm font-semibold text-muted-foreground mb-2">{label}</label>
                        <input
                          id={key}
                          type={type}
                          required
                          value={formData[key as keyof typeof formData]}
                          onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                          placeholder={placeholder}
                          className="w-full rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all bg-background border border-border focus:border-primary/50"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-semibold text-muted-foreground mb-2">Subject</label>
                    <Select
                      id="subject"
                      value={formData.subject}
                      onChange={val => setFormData({ ...formData, subject: val })}
                      options={[
                        { label: 'General Inquiry', value: 'general', description: 'General questions about our platform' },
                        { label: 'Technical Support', value: 'support', description: 'Help with technical issues' },
                        { label: 'Billing Question', value: 'billing', description: 'Help with payments and subscriptions' },
                        { label: 'Partnership', value: 'partnership', description: 'Collaborate with us' }
                      ]}
                      placeholder="Select a topic..."
                      isSearchable={false}
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-muted-foreground mb-2">Message</label>
                    <textarea
                      id="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                      placeholder="How can we help you?"
                      className="w-full rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all resize-none bg-background border border-border focus:border-primary/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))', boxShadow: '0 0 24px rgba(139,92,246,0.25)' }}
                  >
                    {isSubmitting
                      ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <><Send className="w-4 h-4" /> Send Message</>
                    }
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
