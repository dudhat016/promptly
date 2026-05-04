import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, MessageSquare, MapPin, Send, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc } from 'firebase/firestore';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await addDoc(collection(db, 'contact_messages'), {
        ...formData,
        status: 'unread',
        createdAt: serverTimestamp()
      });

      // Also add to marketing_contacts (sync to CRM)
      const [firstName, ...lastNames] = formData.name.split(' ');
      const contactRef = collection(db, 'marketing_contacts');
      const q = query(contactRef, where('email', '==', formData.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        await addDoc(contactRef, {
          email: formData.email,
          displayName: formData.name,
          firstName: firstName || '',
          lastName: lastNames.join(' ') || '',
          tags: ['contact_form', 'inquiry'],
          status: 'active',
          source: 'contact_page',
          createdAt: serverTimestamp(),
          lastActiveAt: serverTimestamp()
        });
      } else {
        const existingDoc = querySnapshot.docs[0];
        const existingTags = existingDoc.data().tags || [];
        const newTags = Array.from(new Set([...existingTags, 'contact_form', 'inquiry']));
        
        await updateDoc(existingDoc.ref, {
          displayName: formData.name,
          firstName: firstName || '',
          lastName: lastNames.join(' ') || '',
          tags: newTags,
          lastActiveAt: serverTimestamp()
        });
      }

      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pt-24 pb-16">
      {/* Header Section */}
      <div className="bg-indigo-600 absolute top-0 left-0 w-full h-[400px] overflow-hidden -z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50"></div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 pt-8"
        >
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight drop-shadow-md">
            Get in Touch
          </h1>
          <p className="text-xl text-indigo-100 max-w-2xl mx-auto drop-shadow-sm font-medium">
            Have questions about Promptly? We're here to help you supercharge your AI workflows.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Contact Info Cards */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex items-start gap-4 hover:-translate-y-1 transition-transform duration-300"
            >
              <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Email Us</h3>
                <p className="text-slate-500 text-sm mb-2">Our team usually responds within 2 hours.</p>
                <a href="mailto:support@promptly.com" className="text-indigo-600 font-bold hover:underline">support@promptly.com</a>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex items-start gap-4 hover:-translate-y-1 transition-transform duration-300"
            >
              <div className="bg-purple-50 p-3 rounded-2xl text-purple-600 shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Live Chat</h3>
                <p className="text-slate-500 text-sm mb-2">Available Mon-Fri, 9am - 5pm EST.</p>
                <button className="text-purple-600 font-bold hover:underline">Start a Conversation</button>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex items-start gap-4 hover:-translate-y-1 transition-transform duration-300"
            >
              <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Headquarters</h3>
                <p className="text-slate-500 text-sm">
                  123 AI Boulevard<br />
                  Tech District, CA 94103<br />
                  United States
                </p>
              </div>
            </motion.div>
          </div>

          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-white rounded-3xl p-8 md:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100"
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Send us a Message</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Your Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Subject</label>
                <select 
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none"
                >
                  <option value="" disabled>Select a topic...</option>
                  <option value="general">General Inquiry</option>
                  <option value="support">Technical Support</option>
                  <option value="billing">Billing Question</option>
                  <option value="partnership">Partnership</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Message</label>
                <textarea 
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  placeholder="How can we help you?"
                ></textarea>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
