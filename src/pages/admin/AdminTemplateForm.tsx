import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { EmailTemplate } from '../../types';
import { Save, ChevronRight, Edit2, Eye, X, Mail, Send, Settings } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { EmailService } from '../../services/emailService';

export default function AdminTemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [template, setTemplate] = useState<Partial<EmailTemplate>>({
    name: '', subject: '', body: '', type: '', variables: []
  });

  useEffect(() => {
    async function loadData() {
      if (id && id !== 'new') {
        const docSnap = await getDoc(doc(db, 'templates', id));
        if (docSnap.exists()) {
          setTemplate({ id: docSnap.id, ...docSnap.data() } as EmailTemplate);
        }
      }
    }
    loadData();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const vars = template.body?.match(/{{(.*?)}}/g)?.map(v => v.replace(/[{}]/g, '')) || [];
      const templateData = { ...template, variables: [...new Set(vars)] };
      
      // Use the type as the document ID for EmailService lookup
      const docId = template.type || id;

      if (id && id !== 'new') {
        await setDoc(doc(db, 'templates', id), templateData);
      } else {
        await setDoc(doc(db, 'templates', docId!), { ...templateData, id: docId });
      }
      toast.success("Template saved successfully!");
      navigate('/admin/templates');
    } catch (err) {
      console.error(err);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    const testEmail = prompt("Enter email address for test:", "test@example.com");
    if (!testEmail) return;

    setIsTesting(true);
    const toastId = toast.loading(`Sending test to ${testEmail}...`);
    try {
      await EmailService.sendEmailWithTemplate(
        'test-user',
        testEmail,
        template.id || template.type || '',
        { name: 'Test User' }
      );
      toast.success(`Test email sent! Check your inbox.`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to send test email", { id: toastId });
    } finally {
      setIsTesting(false);
    }
  };

  const renderPreview = () => {
    let content = template.body || '';
    const mockVars: Record<string, string> = {
      name: 'John Doe',
      email: 'john@example.com',
      code: 'PROMPLY20',
      amount: '$19.00',
      query: 'AI Marketing'
    };

    Object.entries(mockVars).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    const unsubscribeUrl = `${window.location.origin}/unsubscribe?email=john@example.com`;
    
    return `
      <div style="background: #f8fafc; padding: 20px; font-family: sans-serif; border-radius: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background: #4f46e5; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 900;">PROMPTLY</h1>
          </div>
          <div style="padding: 30px; color: #1e293b; line-height: 1.6; font-size: 14px;">
            ${content.replace(/\n/g, '<br />')}
          </div>
          <div style="background: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
            <p>© 2026 Promptly AI. All rights reserved.</p>
            <p style="margin-top: 10px;">
              <a href="${unsubscribeUrl}" style="color: #4f46e5; font-weight: 700;">Unsubscribe</a>
            </p>
          </div>
        </div>
      </div>
    `;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-8 font-medium">
        <Link to="/admin" className="hover:text-indigo-600 flex items-center gap-2"><Edit2 className="w-4 h-4" /> Admin</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/admin/templates" className="hover:text-indigo-600">Templates</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">{id === 'new' ? 'Create Template' : 'Edit Template'}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
            <h2 className="text-3xl font-black mb-8">{id === 'new' ? 'Create Template' : 'Edit Template'}</h2>
            
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Template Name</label>
                  <input 
                    type="text" required
                    value={template.name || ''}
                    onChange={e => setTemplate({...template, name: e.target.value})}
                    placeholder="e.g. Welcome Email"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Internal Type (ID)</label>
                  <input 
                    type="text" required
                    disabled={id !== 'new'}
                    value={template.type || ''}
                    onChange={e => setTemplate({...template, type: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                    placeholder="e.g. welcome"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Subject Line</label>
                <input 
                  type="text" required
                  value={template.subject || ''}
                  onChange={e => setTemplate({...template, subject: e.target.value})}
                  placeholder="e.g. Welcome to Promptly!"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Email Body (Markdown/Text)</label>
                <textarea 
                  required rows={12}
                  value={template.body || ''}
                  onChange={e => setTemplate({...template, body: e.target.value})}
                  placeholder="Hi {{name}}, welcome to Promptly..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">Use {'{{variable_name}}'} syntax to insert dynamic variables.</p>
              </div>

              <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-4">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-grow bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-w-[200px]"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="px-6 bg-white border border-slate-200 text-slate-900 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  Preview
                </button>
                <button 
                  type="button"
                  disabled={isTesting}
                  onClick={handleSendTest}
                  className="px-6 bg-white border border-slate-200 text-indigo-600 font-bold py-4 rounded-2xl hover:bg-indigo-50 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                  {isTesting ? 'Sending...' : 'Send Test'}
                </button>
                <Link 
                  to="/admin/emails/settings"
                  className="p-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                  title="Email Settings"
                >
                  <Settings className="w-6 h-6" />
                </Link>
                <Link 
                  to="/admin/templates"
                  className="px-8 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all text-center"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-900 text-white rounded-[2rem] p-8 shadow-xl shadow-indigo-200">
            <h3 className="font-black text-xl mb-6">Template Tips</h3>
            <ul className="space-y-4 text-sm text-indigo-100">
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] shrink-0">1</div>
                Use double braces like <code className="bg-white/10 px-1 rounded">{'{{name}}'}</code> for dynamic content.
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] shrink-0">2</div>
                Avoid using complex HTML unless you are comfortable with email client compatibility.
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] shrink-0">3</div>
                The "Internal Type" must match the value used in the code (e.g., "welcome").
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 p-8">
            <h3 className="font-black text-lg mb-4">Detected Variables</h3>
            <div className="flex flex-wrap gap-2">
              {(template.body?.match(/{{(.*?)}}/g)?.map(v => v.replace(/[{}]/g, '')) || []).map((v, i) => (
                <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                  {v}
                </span>
              )) || <span className="text-slate-400 text-sm italic">No variables detected yet</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Email Preview</h3>
                    <p className="text-xs text-slate-500 font-medium">Testing with mock data</p>
                  </div>
                </div>
                <button onClick={() => setShowPreview(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto bg-slate-50 flex-grow">
                <div className="max-w-xl mx-auto">
                  <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Subject</p>
                    <p className="font-bold text-slate-900">{template.subject || 'No Subject'}</p>
                  </div>
                  <div 
                    className="prose prose-slate max-w-none shadow-xl rounded-[1.5rem] overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: renderPreview() }} 
                  />
                </div>
              </div>

              <div className="p-8 bg-white border-t border-slate-100 text-center shrink-0">
                <button 
                  onClick={() => setShowPreview(false)}
                  className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all"
                >
                  Got it, close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
