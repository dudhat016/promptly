import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ChevronRight, ClipboardCopy, Eye, EyeOff, Mail, Save, Send, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Badge from '../../components/primitives/Badge';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import Input from '../../components/primitives/Input';
import Select from '../../components/primitives/Select';
import Textarea from '../../components/primitives/Textarea';
import { usePath } from '../../hooks/usePath';
import { api } from '../../lib/api';
import { db } from '../../lib/firebase';
import { EmailService } from '../../services/emailService';
import { EmailTemplate } from '../../types';

interface VarInfo { name: string; description: string; example: string; }
interface EmailTypeInfo {
  type: string; name: string; group: string;
  variables: VarInfo[];
  defaultSubject: string; defaultBody?: string;
}

const GROUP_LABELS: Record<string, string> = {
  auth: 'Auth', onboarding: 'Onboarding', nudge: 'Nudge', newsletter: 'Newsletter',
};
const GROUP_VARIANT: Record<string, 'soft' | 'success' | 'warning' | 'error' | 'info'> = {
  auth: 'soft', onboarding: 'success', nudge: 'soft', newsletter: 'info',
};

type ActiveField = 'body' | 'subject';

export default function AdminTemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prefix } = usePath();

  const [saving, setSaving]           = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [inlinePrev, setInlinePrev]   = useState(false);
  const [isTesting, setIsTesting]     = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [emailTypes, setEmailTypes]   = useState<EmailTypeInfo[]>([]);
  const [selectedTypeInfo, setSelectedTypeInfo] = useState<EmailTypeInfo | null>(null);
  const [activeField, setActiveField] = useState<ActiveField>('body');
  const [template, setTemplate]       = useState<Partial<EmailTemplate>>({
    name: '', subject: '', body: '', type: '', variables: []
  });

  const bodyRef    = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/email/types')
      .then(r => setEmailTypes((Array.isArray(r) ? r : (r as any).data ?? []) as EmailTypeInfo[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function loadData() {
      if (id && id !== 'new') {
        const docSnap = await getDoc(doc(db, 'templates', id));
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as EmailTemplate;
          setTemplate(data);
          const info = emailTypes.find(t => t.type === data.type);
          if (info) setSelectedTypeInfo(info);
        }
      }
    }
    loadData();
  }, [id, emailTypes]);

  const handleTypeChange = (val: string) => {
    const info = emailTypes.find(t => t.type === val) ?? null;
    setSelectedTypeInfo(info);
    setTemplate(prev => ({
      ...prev,
      type: val,
      name:    prev.name    || info?.name           || '',
      subject: prev.subject || info?.defaultSubject || '',
      body:    prev.body    || info?.defaultBody     || '',
    }));
    if (errors.type) setErrors(e => ({ ...e, type: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!template.name?.trim())    e.name    = 'Template name is required';
    if (!template.type?.trim())    e.type    = 'Email type is required';
    if (!template.subject?.trim()) e.subject = 'Subject line is required';
    if (!template.body?.trim())    e.body    = 'Email body is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const vars = template.body?.match(/\{\{(.*?)\}\}/g)?.map(v => v.replace(/[{}]/g, '')) || [];
      const docId = template.type || id!;
      await setDoc(doc(db, 'templates', docId), {
        ...template, id: docId, variables: [...new Set(vars)]
      });
      toast.success('Template saved!');
      navigate(prefix('/admin/emails/templates'));
    } catch {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const insertVar = useCallback((varName: string) => {
    const tag = `{{${varName}}}`;
    if (activeField === 'subject') {
      const el = subjectRef.current;
      if (!el) return;
      const start = el.selectionStart ?? el.value.length;
      const end   = el.selectionEnd   ?? start;
      const next  = el.value.slice(0, start) + tag + el.value.slice(end);
      setTemplate(p => ({ ...p, subject: next }));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + tag.length, start + tag.length);
      });
    } else {
      const el = bodyRef.current;
      if (!el) return;
      const start = el.selectionStart ?? el.value.length;
      const end   = el.selectionEnd   ?? start;
      const next  = el.value.slice(0, start) + tag + el.value.slice(end);
      setTemplate(p => ({ ...p, body: next }));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + tag.length, start + tag.length);
      });
    }
  }, [activeField]);

  const handleSendTest = async () => {
    const testEmail = prompt('Enter email address for test:', 'test@example.com');
    if (!testEmail) return;
    setIsTesting(true);
    const toastId = toast.loading(`Sending test to ${testEmail}…`);
    try {
      const mockVars: Record<string, string> = {};
      selectedTypeInfo?.variables.forEach(v => { mockVars[v.name] = v.example; });
      await EmailService.sendEmailWithTemplate('test-user', testEmail, template.type || '', {
        name: 'Test User', ...mockVars
      });
      toast.success('Test sent! Check your inbox.', { id: toastId });
    } catch {
      toast.error('Failed to send test email', { id: toastId });
    } finally {
      setIsTesting(false);
    }
  };

  const mockVars = (): Record<string, string> => {
    const base: Record<string, string> = { name: 'Sarah', email: 'sarah@example.com', app_url: window.location.origin };
    selectedTypeInfo?.variables.forEach(v => { base[v.name] = v.example; });
    return base;
  };

  const substitutePreview = (str: string): string => {
    let s = str;
    Object.entries(mockVars()).forEach(([k, v]) => {
      s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    });
    return s;
  };

  const renderBodyHtml = (): string => {
    const content = substitutePreview(template.body || '');
    const unsubUrl = `${window.location.origin}/unsubscribe?email=sarah@example.com`;
    const paragraphs = content
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p style="color:#475569;margin:0 0 16px;line-height:1.7;font-size:14px;">${
        p.replace(/→\s*/g, '<span style="color:#6366f1;font-weight:700;">→ </span>')
         .replace(/\n/g, '<br/>')
      }</p>`)
      .join('');

    return `<div style="background:#f8fafc;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;border-radius:12px;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,.06);">
        <div style="background:#4f46e5;padding:22px 28px;text-align:center;">
          <p style="color:#fff;margin:0;font-size:20px;font-weight:900;letter-spacing:-.02em;">PROMPTLY</p>
          <p style="color:#c7d2fe;margin:4px 0 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Premium AI Prompt Marketplace</p>
        </div>
        <div style="padding:32px 28px;">${paragraphs || '<p style="color:#94a3b8;font-size:14px;">Body will appear here…</p>'}</div>
        <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;">
          <p style="margin:0 0 6px;">© ${new Date().getFullYear()} Promptly AI. All rights reserved.</p>
          <a href="${unsubUrl}" style="color:#6366f1;font-weight:700;text-decoration:none;">Unsubscribe</a>
        </div>
      </div>
    </div>`;
  };

  const typeOptions = Object.entries(
    emailTypes.reduce<Record<string, EmailTypeInfo[]>>((acc, t) => {
      (acc[t.group] = acc[t.group] || []).push(t);
      return acc;
    }, {})
  ).flatMap(([group, types]) => [
    { label: `── ${GROUP_LABELS[group] || group} ──`, value: `__group_${group}`, disabled: true },
    ...types.map(t => ({ label: t.name, value: t.type, description: t.type })),
  ]);

  const detectedVars = [...new Set(
    template.body?.match(/\{\{(.*?)\}\}/g)?.map(v => v.replace(/[{}]/g, '')) || []
  )];
  const knownVarNames = new Set(selectedTypeInfo?.variables.map(v => v.name) || []);
  const unknownVars   = detectedVars.filter(v => knownVarNames.size > 0 && !knownVarNames.has(v));

  const previewSubject = substitutePreview(template.subject || '');

  return (
    <>
      {/* Page header */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
        <Link to={prefix('/admin/emails/templates')} className="hover:text-foreground transition-colors">Email Templates</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-semibold">{id === 'new' ? 'New Template' : (template.name || 'Edit Template')}</span>
        {selectedTypeInfo && (
          <Badge variant={GROUP_VARIANT[selectedTypeInfo.group] ?? 'soft'} size="sm" className="ml-1">
            {GROUP_LABELS[selectedTypeInfo.group] || selectedTypeInfo.group}
          </Badge>
        )}
      </div>

      <form onSubmit={handleSave}>
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">

          {/* ── Main panel ─────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Meta row */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Template Name"
                  id="tplName"
                  type="text"
                  error={errors.name}
                  value={template.name || ''}
                  onChange={e => { setTemplate(p => ({ ...p, name: e.target.value })); if (errors.name) setErrors(er => ({ ...er, name: '' })); }}
                  placeholder="e.g. Welcome Email"
                  variant="outline"
                />

                <div>
                  <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Email Type</label>
                  {id !== 'new' ? (
                    <div className="px-3 py-2.5 bg-muted rounded-lg text-sm font-mono text-muted-foreground border border-border">
                      {template.type}
                    </div>
                  ) : (
                    <Select
                      id="tplType"
                      value={template.type || ''}
                      error={errors.type}
                      onChange={handleTypeChange}
                      options={typeOptions}
                      placeholder="Select email type…"
                      isSearchable
                    />
                  )}
                  {errors.type && <p className="text-xs text-destructive mt-1">{errors.type}</p>}
                </div>
              </div>

              {/* Subject with live preview */}
              <div className="space-y-1.5">
                <Input
                  ref={subjectRef as any}
                  label="Subject Line"
                  id="tplSubject"
                  type="text"
                  error={errors.subject}
                  value={template.subject || ''}
                  onChange={e => { setTemplate(p => ({ ...p, subject: e.target.value })); if (errors.subject) setErrors(er => ({ ...er, subject: '' })); }}
                  onFocus={() => setActiveField('subject')}
                  placeholder="e.g. Welcome to Promptly, {{name}}!"
                  variant="outline"
                />
                {template.subject && (
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preview:</span>
                    <span className="text-xs text-foreground font-medium truncate">{previewSubject}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Body editor */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email Body</span>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {inlinePrev ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {inlinePrev ? 'Hide preview' : 'Show preview'}
                </button>
              </div>

              <div className="p-4">
                <Textarea
                  ref={bodyRef}
                  id="tplBody"
                  error={errors.body}
                  value={template.body || ''}
                  onChange={e => { setTemplate(p => ({ ...p, body: e.target.value })); if (errors.body) setErrors(er => ({ ...er, body: '' })); }}
                  onFocus={() => setActiveField('body')}
                  placeholder={`Hi {{name}},\n\nWelcome to Promptly!\n\n→ Get started: {{app_url}}/explore\n\n— The Promptly Team`}
                  variant="ghost"
                  className="font-mono text-xs resize-none border-0 focus:border-0 focus:ring-0 min-h-[320px]"
                />
                {errors.body && <p className="text-xs text-destructive px-1 mt-1">{errors.body}</p>}
              </div>

              {unknownVars.length > 0 && (
                <div className="px-5 py-2.5 border-t border-amber-500/20 bg-amber-500/5 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Unrecognised vars:</span>
                  {unknownVars.map(v => (
                    <code key={v} className="text-xs font-mono text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">{`{{${v}}}`}</code>
                  ))}
                  <span className="text-[10px] text-amber-600/70 ml-auto">May not be substituted at send time</span>
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" isLoading={saving} variant="primary" size="lg" leftIcon={Save} className="min-w-[160px] shadow-sm shadow-primary/20">
                Save Template
              </Button>
              <Button type="button" isLoading={isTesting} onClick={handleSendTest} variant="outline" size="lg" leftIcon={Send} className="bg-card">
                Send Test
              </Button>
              <div className="flex-grow" />
              <Button as={Link} to={prefix('/admin/emails/templates')} variant="ghost" size="sm" className="text-muted-foreground">
                Cancel
              </Button>
            </div>
          </div>

          {/* ── Sidebar ────────────────────────────────────────── */}
          <div className="space-y-4">

            {selectedTypeInfo ? (
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground">Variables</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{selectedTypeInfo.type}</p>
                  </div>
                  <Badge variant={GROUP_VARIANT[selectedTypeInfo.group] ?? 'soft'} size="sm">
                    {GROUP_LABELS[selectedTypeInfo.group] || selectedTypeInfo.group}
                  </Badge>
                </div>

                {/* Active field indicator */}
                <div className="px-5 py-2 bg-primary/5 border-b border-primary/10 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-semibold text-primary">
                    Inserting into: <span className="font-black uppercase">{activeField}</span>
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground">click chip to insert</span>
                </div>

                {/* Variable chips */}
                <div className="p-4 space-y-2">
                  {selectedTypeInfo.variables.map(v => {
                    const used = detectedVars.includes(v.name);
                    return (
                      <button
                        key={v.name}
                        type="button"
                        onClick={() => insertVar(v.name)}
                        className={`w-full text-left group flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[.98] ${
                          used ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-transparent'
                        }`}
                        title={`Click to insert {{${v.name}}} at cursor`}
                      >
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <code className="text-[11px] font-black text-primary">{`{{${v.name}}}`}</code>
                            {used && <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">✓ used</span>}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{v.description}</p>
                          <p className="text-[10px] text-muted-foreground/50 font-mono mt-0.5 truncate">e.g. {v.example}</p>
                        </div>
                        <ClipboardCopy className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary shrink-0 mt-1 transition-colors" />
                      </button>
                    );
                  })}
                </div>

                <div className="px-5 py-3 border-t border-border bg-muted/20">
                  <p className="text-[10px] text-muted-foreground/60">
                    <code className="font-mono text-primary/70">{'{{app_url}}'}</code> is always available.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl p-5 shadow-lg shadow-primary/20">
                <p className="font-black text-sm mb-3">Getting Started</p>
                <ol className="space-y-2.5 text-sm text-primary-foreground/80">
                  {[
                    'Pick an email type from the dropdown.',
                    'Subject & body will auto-fill with defaults.',
                    'Click any variable chip to insert it at cursor.',
                    'Save — it overrides the system default.',
                  ].map((s, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-black shrink-0">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Detected vars panel */}
            {detectedVars.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-xs font-bold text-foreground mb-2.5">
                  Detected Variables <span className="text-muted-foreground font-normal">({detectedVars.length})</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {detectedVars.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVar(v)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors hover:opacity-80 ${
                        knownVarNames.size > 0 && !knownVarNames.has(v)
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      {v}{knownVarNames.size > 0 && !knownVarNames.has(v) ? ' ⚠' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Full preview modal */}
      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-card rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Email Preview</p>
                    <p className="text-xs text-muted-foreground">Rendered with example values</p>
                  </div>
                </div>
                <Button onClick={() => setShowPreview(false)} variant="ghost" size="icon" className="rounded-lg">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="overflow-y-auto bg-muted/50 flex-grow p-5">
                <div className="max-w-xl mx-auto space-y-3">
                  <Card padding="none" className="px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Subject</p>
                    <p className="font-bold text-foreground text-sm">{previewSubject || 'No Subject'}</p>
                  </Card>
                  <div dangerouslySetInnerHTML={{ __html: renderBodyHtml() }} />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end gap-3">
                <Button type="button" isLoading={isTesting} onClick={handleSendTest} variant="secondary" size="md" leftIcon={Send}>
                  Send Test
                </Button>
                <Button onClick={() => setShowPreview(false)} variant="primary" size="md" className="px-8">
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
