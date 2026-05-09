import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { EmailTemplate } from '../../types';
import { Save, Edit2, Eye, X, Mail, Send, Settings } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { motion, AnimatePresence } from 'motion/react';
import { EmailService } from '../../services/emailService';
import Button from '../../components/ui/Button';

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
            <p>Â© 2026 Promptly AI. All rights reserved.</p>
            <p style="margin-top: 10px;">
              <a href="${unsubscribeUrl}" style="color: #4f46e5; font-weight: 700;">Unsubscribe</a>
            </p>
          </div>
        </div>
      </div>
    `;
  };

  return (
    <div className="max-w-4xl">
      <AdminPageHeader
        label="Content"
        labelIcon={Mail}
        title={id === 'new' ? 'Create Template' : 'Edit Template'}
        subtitle="Build and configure email template content and variables."
      />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-lg border border-border shadow-sm p-8">
            
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Template Name"
                  id="templateName"
                  name="templateName"
                  type="text"
                  required
                  value={template.name || ''}
                  onChange={e => setTemplate({...template, name: e.target.value})}
                  placeholder="e.g. Welcome Email"
                  variant="filled"
                />
                <Input 
                  label="Internal Type (ID)"
                  id="templateType"
                  name="templateType"
                  type="text"
                  required
                  disabled={id !== 'new'}
                  value={template.type || ''}
                  onChange={e => setTemplate({...template, type: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                  placeholder="e.g. welcome"
                  variant="filled"
                  className="font-mono"
                />
              </div>

              <Input 
                label="Subject Line"
                id="templateSubject"
                name="templateSubject"
                type="text"
                required
                value={template.subject || ''}
                onChange={e => setTemplate({...template, subject: e.target.value})}
                placeholder="e.g. Welcome to Promptly!"
                variant="filled"
              />

              <Textarea 
                label="Email Body (Markdown/Text)"
                id="templateBody"
                name="templateBody"
                required
                rows={12}
                value={template.body || ''}
                onChange={e => setTemplate({...template, body: e.target.value})}
                placeholder="Hi {{name}}, welcome to Promptly..."
                variant="filled"
                className="font-mono min-h-[300px]"
                helperText="Use {{variable_name}} syntax to insert dynamic variables."
              />

              <div className="pt-6 border-t border-border flex flex-wrap gap-4">
                 <Button 
                   type="submit" 
                   isLoading={saving}
                   variant="primary"
                   size="lg"
                   leftIcon={Save}
                   className="flex-grow min-w-[200px]"
                 >
                   Save Template
                 </Button>
                 <Button 
                   type="button"
                   onClick={() => setShowPreview(true)}
                   variant="secondary"
                   size="lg"
                   leftIcon={Eye}
                 >
                   Preview
                 </Button>
                 <Button 
                   type="button"
                   isLoading={isTesting}
                   onClick={handleSendTest}
                   variant="outline"
                   size="lg"
                   leftIcon={Send}
                   className="px-6 bg-card"
                 >
                   Send Test
                 </Button>
                 <Button 
                   as={Link}
                   to="/admin/emails/settings"
                   variant="ghost"
                   size="lg"
                   className="bg-muted text-muted-foreground"
                   title="Email Settings"
                 >
                   <Settings className="w-6 h-6" />
                 </Button>
                 <Button 
                   as={Link}
                   to="/admin/templates"
                   variant="ghost"
                   size="lg"
                   className="px-8 bg-muted text-muted-foreground"
                 >
                   Cancel
                 </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-primary text-primary-foreground rounded-md p-8 shadow-xl shadow-primary/20">
            <h3 className="font-bold text-xl mb-6">Template Tips</h3>
            <ul className="space-y-4 text-sm text-primary-foreground/80">
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/80 flex items-center justify-center text-xs shrink-0">1</div>
                Use double braces like <code className="bg-card/10 px-1 rounded">{'{{name}}'}</code> for dynamic content.
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/80 flex items-center justify-center text-xs shrink-0">2</div>
                Avoid using complex HTML unless you are comfortable with email client compatibility.
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/80 flex items-center justify-center text-xs shrink-0">3</div>
                The "Internal Type" must match the value used in the code (e.g., "welcome").
              </li>
            </ul>
          </div>

          <div className="bg-card rounded-md border border-border p-8">
            <h3 className="font-bold text-lg mb-4">Detected Variables</h3>
            <div className="flex flex-wrap gap-2">
              {(template.body?.match(/{{(.*?)}}/g)?.map(v => v.replace(/[{}]/g, '')) || []).map((v, i) => (
                <span key={i} className="px-3 py-1 bg-muted text-muted-foreground rounded-lg text-xs font-bold">
                  {v}
                </span>
              )) || <span className="text-muted-foreground text-sm italic">No variables detected yet</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-muted/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-card rounded-lg w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/8 rounded-md flex items-center justify-center text-primary">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Email Preview</h3>
                    <p className="text-xs text-muted-foreground font-medium">Testing with mock data</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowPreview(false)} 
                  variant="ghost" 
                  size="icon" 
                  className="p-3 hover:bg-muted rounded-md transition-colors"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
              
              <div className="p-8 overflow-y-auto bg-muted/50 flex-grow">
                <div className="max-w-xl mx-auto">
                  <div className="bg-card border border-border rounded-lg shadow-sm p-6 mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Subject</p>
                    <p className="font-bold text-foreground">{template.subject || 'No Subject'}</p>
                  </div>
                  <div 
                    className="prose prose-slate max-w-none shadow-xl rounded-md overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: renderPreview() }} 
                  />
                </div>
              </div>

              <div className="p-8 bg-card border-t border-border text-center shrink-0">
                <Button 
                  onClick={() => setShowPreview(false)}
                  variant="white"
                  size="lg"
                  className="px-12 font-bold"
                >
                  Got it, close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
