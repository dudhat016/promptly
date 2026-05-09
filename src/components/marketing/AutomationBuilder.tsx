import { cn } from '@/src/lib/utils';
import {
  Activity,
  AlertCircle, Award,
  Bell,
  Clock,
  Filter,
  GitBranch,
  Globe,
  Info,
  Layers,
  Mail,
  MousePointer2,
  Play,
  Plus,
  Save,
  Settings,
  Sparkles,
  Split,
  Tag as TagIcon,
  Trash2,
  Users,
  X,
  Zap
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { AutomationFlow, EmailTemplate, Tag as TagType } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';

interface Props {
  flow: Partial<AutomationFlow> | null;
  tags: TagType[];
  templates: EmailTemplate[];
  onSave: (flow: any) => void;
  onCancel: () => void;
}

export default function AutomationBuilder({ flow, tags, templates, onSave, onCancel }: Props) {
  const [activeFlow, setActiveFlow] = useState<Partial<AutomationFlow>>(flow || {
    name: 'New Automation Flow',
    trigger: { type: 'user_signup' },
    steps: [],
    active: false
  });

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(Math.max(0.5, prev + delta), 2));
  };

  const addStep = (type: 'send_email' | 'wait' | 'add_tag' | 'remove_tag' | 'notify_user' | 'condition' | 'webhook' | 'ab_test' | 'recommend_prompt') => {
    const newStep = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      params: type === 'wait' ? { duration: 1, unit: 'days' } :
               type === 'recommend_prompt' ? { category: 'all' } :
               type === 'ab_test' ? { variants: ['A', 'B'], weight: 50 } :
               type === 'condition' ? { field: 'subscriptionStatus', operator: 'equals', value: '' } :
               type === 'send_email' ? { templateId: '', customSubject: '', customContent: '' } :
               type === 'notify_user' ? { message: 'New activity detected' } : {}
    };
    setActiveFlow({
      ...activeFlow,
      steps: [...(activeFlow.steps || []), newStep]
    });
  };

  const removeStep = (id: string) => {
    setActiveFlow({
      ...activeFlow,
      steps: activeFlow.steps?.filter(s => s.id !== id)
    });
  };

  const updateStep = (id: string, params: any) => {
    setActiveFlow({
      ...activeFlow,
      steps: activeFlow.steps?.map(s => s.id === id ? { ...s, params } : s)
    });
  };

  const [sidebarTab, setSidebarTab] = useState<'nodes' | 'settings'>(selectedStepId ? 'settings' : 'nodes');
  const [viewMode, setViewMode] = useState<'editor' | 'stats'>('editor');

  // Sync sidebar tab when a step is selected
  useEffect(() => {
    if (selectedStepId) setSidebarTab('settings');
  }, [selectedStepId]);

  return (
    <div className="flex flex-col h-[85vh] bg-muted/50 rounded-lg overflow-hidden border border-border shadow-2xl">
      <div className="bg-card px-8 py-6 border-b border-border flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center text-white shadow-lg shadow-primary/10">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <Input
              type="text"
              value={activeFlow.name}
              onChange={e => setActiveFlow({...activeFlow, name: e.target.value})}
              variant="ghost"
              placeholder="Automation Name"
              className="text-xl font-bold p-0 focus:ring-0"
            />
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
              <Play className="w-3 h-3 fill-current" />
              Trigger: {activeFlow.trigger?.type.replace('_', ' ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-muted p-1 rounded-md mr-4">
            <Button
              onClick={() => setViewMode('editor')}
              variant={viewMode === 'editor' ? 'white' : 'ghost'}
              size="sm"
              className={cn(
                "px-4 font-bold uppercase",
                viewMode === 'editor' ? "text-foreground shadow-sm border border-border" : "text-muted-foreground"
              )}
            >
              Editor
            </Button>
            <Button
              onClick={() => setViewMode('stats')}
              variant={viewMode === 'stats' ? 'white' : 'ghost'}
              size="sm"
              className={cn(
                "px-4 font-bold uppercase",
                viewMode === 'stats' ? "text-foreground shadow-sm border border-border" : "text-muted-foreground"
              )}
            >
              Stats
            </Button>
          </div>
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
          >
            Back
          </Button>
          <Button
            onClick={() => onSave(activeFlow)}
            variant="primary"
            leftIcon={Save}
            size="sm"
          >
            Save
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'editor' ? (
          <>
        <div className="flex-1 overflow-auto p-12 relative bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] cursor-grab active:cursor-grabbing">
           {/* Navigation Controls */}
           <div className="absolute left-8 bottom-8 flex flex-col items-center gap-4 bg-card border border-border p-2 rounded-xl shadow-xl z-20">
              <Button
                onClick={() => handleZoom(0.1)}
                variant="ghost"
                size="icon"
                title="Zoom In"
              >
                <Plus className="w-5 h-5" />
              </Button>
              <Button
                onClick={() => setZoomLevel(1)}
                variant="ghost"
                size="icon"
                title="Reset Zoom"
              >
                <X className="w-5 h-5 rotate-45" />
              </Button>
              <Button
                onClick={() => handleZoom(-0.1)}
                variant="ghost"
                size="icon"
                title="Zoom Out"
              >
                <div className="w-5 h-px bg-current" />
              </Button>
              <div className="h-px w-6 bg-muted" />
              <div className="text-[8px] font-bold text-muted-foreground p-1">{Math.round(zoomLevel * 100)}%</div>
           </div>

          <motion.div
            style={{ scale: zoomLevel, transformOrigin: 'top center' }}
            className="max-w-2xl mx-auto flex flex-col items-center min-h-full pb-32 transition-transform duration-200"
          >
            {/* Trigger Node */}
            {/* ... trigger code ... */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 w-full max-w-sm"
            >
              <div
                className={`bg-card border-2 rounded-lg p-6 shadow-sm group cursor-pointer hover:shadow-xl transition-all ${selectedStepId === 'trigger' ? 'border-primary ring-4 ring-indigo-50' : 'border-border'}`}
                onClick={() => setSelectedStepId('trigger')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-md flex items-center justify-center">
                    <Play className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-tight">Flow Trigger</h4>
                    <p className="text-xs text-muted-foreground font-medium">
                      {activeFlow.trigger?.type === 'user_signup' ? 'When a user signs up' :
                       activeFlow.trigger?.type === 'user_login' ? 'When a user logs in' :
                       activeFlow.trigger?.type === 'tag_added' ? `When tag ${activeFlow.trigger?.value ? `"${tags.find(t => t.id === activeFlow.trigger?.value)?.name || activeFlow.trigger.value}"` : ''} is applied` :
                       activeFlow.trigger?.type === 'tag_remove' ? `When tag ${activeFlow.trigger?.value ? `"${tags.find(t => t.id === activeFlow.trigger?.value)?.name || activeFlow.trigger.value}"` : ''} is removed` :
                       activeFlow.trigger?.type === 'list_applied' ? `When added to list ${activeFlow.trigger?.value ? `"${activeFlow.trigger.value}"` : ''}` :
                       activeFlow.trigger?.type === 'list_removed' ? `When removed from list ${activeFlow.trigger?.value ? `"${activeFlow.trigger.value}"` : ''}` :
                       activeFlow.trigger?.type === 'form_submited' ? `When form ${activeFlow.trigger?.value ? `"${activeFlow.trigger.value}"` : ''} submitted` :
                       activeFlow.trigger?.type === 'contact_created' ? 'When a contact is created' :
                       activeFlow.trigger?.type === 'subscription_changed' ? 'When subscription changes' :
                       activeFlow.trigger?.type === 'subscription_payment_recived' ? 'When payment is received' :
                       activeFlow.trigger?.type === 'subscription_cancled' ? 'When subscription is canceled' :
                       activeFlow.trigger?.type === 'prompt_favorite' ? 'When a prompt is favorited' :
                       activeFlow.trigger?.type === 'limit_reached' ? 'When usage limit is reached' :
                       activeFlow.trigger?.type === 'affiliate_commison' ? 'When affiliate commission earned' :
                       activeFlow.trigger?.type === 'new_register' ? 'When a new registration occurs' :
                       `When ${activeFlow.trigger?.type?.replace('_', ' ')}`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="h-12 w-0.5 bg-muted mx-auto relative">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-muted rounded-full" />
              </div>
            </motion.div>

            {/* Steps List */}
            <div className="w-full flex flex-col items-center gap-0">
              <AnimatePresence mode="popLayout">
                {activeFlow.steps?.map((step, idx) => (
                  <motion.div
                    key={step.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="flex flex-col items-center w-full max-w-sm"
                  >
                    <div className="relative group w-full">
                      <div
                        onClick={() => setSelectedStepId(step.id)}
                        className={`bg-card border-2 rounded-lg p-6 shadow-md transition-all cursor-pointer hover:shadow-xl ${selectedStepId === step.id ? 'border-primary ring-4 ring-primary/10' : 'border-border'}`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
                              step.type === 'send_email' ? 'bg-blue-500/10 text-blue-600' :
                              step.type === 'wait' ? 'bg-muted text-muted-foreground' :
                              step.type === 'condition' ? 'bg-emerald-500/10 text-emerald-600' :
                              step.type === 'notify_user' ? 'bg-primary/8 text-primary' :
                              'bg-purple-500/10 text-purple-600'
                            }`}>
                              {step.type === 'send_email' && <Mail className="w-5 h-5" />}
                              {step.type === 'wait' && <Clock className="w-5 h-5" />}
                              {step.type === 'add_tag' && <TagIcon className="w-5 h-5" />}
                              {step.type === 'remove_tag' && <X className="w-5 h-5" />}
                              {step.type === 'notify_user' && <Bell className="w-5 h-5" />}
                              {step.type === 'condition' && <GitBranch className="w-5 h-5" />}
                              {step.type === 'recommend_prompt' && <Sparkles className="w-5 h-5" />}
                              {step.type === 'ab_test' && <Split className="w-5 h-5" />}
                              {step.type === 'webhook' && <Globe className="w-5 h-5" />}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-foreground uppercase tracking-tight">{step.type.replace('_', ' ')}</h4>
                              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest italic">{
                                step.type === 'recommend_prompt' ? 'AI Recommendation' :
                                step.type === 'ab_test' ? 'Optimization' :
                                step.type === 'condition' ? 'Decision point' :
                                'Marketing Action'
                              }</p>
                            </div>
                          </div>
                          <Button
                            onClick={(e) => { e.stopPropagation(); removeStep(step.id); }}
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {step.type === 'condition' && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                               <Filter className="w-3 h-3 text-emerald-500" />
                               <span>If {step.params.field} {step.params.operator} "{step.params.value}"</span>
                            </div>
                            <div className="flex gap-2">
                               <div className="flex-1 bg-muted/50 rounded-lg p-2 text-center">
                                 <span className="text-[9px] font-bold uppercase text-emerald-600">Yes path</span>
                               </div>
                               <div className="flex-1 bg-muted/50 rounded-lg p-2 text-center">
                                 <span className="text-[9px] font-bold uppercase text-rose-600">No path</span>
                               </div>
                            </div>
                          </div>
                        )}
                        {step.type === 'wait' && (
                          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/50 p-2 rounded-lg">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span>Wait for {step.params.duration} {step.params.unit || 'days'}</span>
                          </div>
                        )}
                        {step.type === 'notify_user' && (
                          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-primary/8/50 p-2 rounded-lg border border-indigo-100">
                             <Bell className="w-3 h-3 text-primary" />
                             <span className="truncate">{step.params.message || 'Notification alert'}</span>
                          </div>
                        )}
                        {step.type === 'send_email' && (
                          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/50 p-3 rounded-md border border-border shadow-sm">
                            <Mail className="w-4 h-4 text-blue-500" />
                            <span>Send "{step.params.templateName || 'Welcome Series'}"</span>
                          </div>
                        )}
                        {step.type === 'recommend_prompt' && (
                          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-primary/8/50 p-3 rounded-md border border-indigo-100 shadow-sm">
                             <Sparkles className="w-4 h-4 text-primary" />
                             <span>Send {step.params.category || 'Recommended'} Prompts</span>
                          </div>
                        )}
                        {step.type === 'ab_test' && (
                          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                             <Split className="w-3 h-3 text-amber-500" />
                             <span>Split Traffic: {step.params.weight || 50}/{100 - (step.params.weight || 50)}</span>
                          </div>
                        )}
                        <div className="flex gap-1 mt-4">
                          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                             <div className="h-full bg-primary w-1/4 rounded-full" />
                          </div>
                        </div>
                      </div>
                      <div className="h-12 w-0.5 bg-muted mx-auto relative">
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-muted rounded-full" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add Step Button */}
              <div className="relative pt-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-12 h-12 rounded-full text-muted-foreground hover:border-primary hover:text-primary hover:shadow-xl"
                >
                  <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                </Button>

                {/* Floating Action Menu */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-card border border-border p-2 rounded-md shadow-2xl flex gap-1 z-50 whitespace-nowrap">
                  <ActionButton icon={Mail} label="Email" onClick={() => addStep('send_email')} color="text-blue-600" />
                  <ActionButton icon={Clock} label="Delay" onClick={() => addStep('wait')} color="text-muted-foreground" />
                  <ActionButton icon={TagIcon} label="Tag" onClick={() => addStep('add_tag')} color="text-purple-600" />
                  <ActionButton icon={GitBranch} label="Split" onClick={() => addStep('condition')} color="text-emerald-600" />
                  <ActionButton icon={Bell} label="Notify" onClick={() => addStep('notify_user')} color="text-primary" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-card border-l border-border overflow-hidden flex flex-col shadow-2xl">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <Button
              onClick={() => setSidebarTab('nodes')}
              variant={sidebarTab === 'nodes' ? 'ghost' : 'ghost'}
              size="lg"
              fullWidth
              className={cn(
                "py-4 font-bold uppercase tracking-widest rounded-none border-b-2",
                sidebarTab === 'nodes' ? "border-primary text-foreground bg-muted/20" : "border-transparent text-muted-foreground"
              )}
            >
              Nodes
            </Button>
            <Button
              onClick={() => setSidebarTab('settings')}
              variant={sidebarTab === 'settings' ? 'ghost' : 'ghost'}
              size="lg"
              fullWidth
              className={cn(
                "py-4 font-bold uppercase tracking-widest rounded-none border-b-2",
                sidebarTab === 'settings' ? "border-primary text-foreground bg-muted/20" : "border-transparent text-muted-foreground"
              )}
            >
              Settings
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-8">
            <AnimatePresence mode="wait">
              {sidebarTab === 'nodes' ? (
                <motion.div
                  key="nodes"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-xs font-bold uppercase text-muted-foreground mb-6 flex items-center gap-2">
                    <Layers className="w-3 h-3" />
                    Available Steps
                  </h3>

                  <div className="space-y-6">
                    <section>
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-4 tracking-widest pl-2">Logic</h4>
                      <div className="space-y-3">
                        <NodeCard icon={GitBranch} label="Condition" sub="Basic Branching" onClick={() => addStep('condition')} color="text-emerald-600" bg="bg-emerald-500/10" />
                        <NodeCard icon={Split} label="A/B Split" sub="Traffic Optimization" onClick={() => addStep('ab_test')} color="text-amber-600" bg="bg-amber-500/10" />
                        <NodeCard icon={Clock} label="Delay" sub="Wait Duration" onClick={() => addStep('wait')} color="text-muted-foreground" bg="bg-muted/50" />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-4 tracking-widest pl-2">Messaging</h4>
                      <div className="space-y-3">
                        <NodeCard icon={Mail} label="Send Email" sub="Campaign/Template" onClick={() => addStep('send_email')} color="text-blue-600" bg="bg-blue-500/10" />
                        <NodeCard icon={Bell} label="Notify User" sub="App Notification" onClick={() => addStep('notify_user')} color="text-primary" bg="bg-primary/8" />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-4 tracking-widest pl-2">AI & Advanced</h4>
                      <div className="space-y-3">
                        <NodeCard icon={Sparkles} label="Recommend" sub="AI Prompt Sharing" onClick={() => addStep('recommend_prompt')} color="text-primary" bg="bg-primary/8" />
                        <NodeCard icon={TagIcon} label="Add Tag" sub="Segmentation" onClick={() => addStep('add_tag')} color="text-purple-600" bg="bg-purple-500/10" />
                        <NodeCard icon={X} label="Remove Tag" sub="Clean up tags" onClick={() => addStep('remove_tag')} color="text-rose-600" bg="bg-rose-500/10" />
                        <NodeCard icon={Globe} label="Webhook" sub="External API" onClick={() => addStep('webhook')} color="text-muted-foreground" bg="bg-muted/50" />
                      </div>
                    </section>
                  </div>

                  <div className="pt-8 text-center">
                    <p className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">More steps coming soon</p>
                  </div>
                </motion.div>
              ) : selectedStepId ? (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-bold text-foreground uppercase">Step Details</h3>
                    <Button
                      onClick={() => setSelectedStepId(null)}
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {selectedStepId === 'trigger' && (
                     <div className="space-y-6">
                      <div className="bg-muted/50 p-6 rounded-lg border border-border">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-4 tracking-widest">Trigger Event</label>
                        <Select
                          value={activeFlow.trigger?.type || 'user_signup'}
                          onChange={val => setActiveFlow({ ...activeFlow, trigger: { ...activeFlow.trigger, type: val as any } })}
                          options={[
                            { label: 'New Register', value: 'user_signup', description: 'Triggered on new user registration' },
                            { label: 'User Login', value: 'user_login', description: 'Triggered on user sign in' },
                            { label: 'Contact Created', value: 'contact_created', description: 'Triggered when a contact is manually or automatically added' },
                            { label: 'Tag Apply', value: 'tag_added', description: 'Triggered when a specific tag is applied' },
                            { label: 'Tag Remove', value: 'tag_remove', description: 'Triggered when a tag is removed' },
                            { label: 'List Applied', value: 'list_applied', description: 'Triggered when a user is added to a list' },
                            { label: 'List Removed', value: 'list_removed', description: 'Triggered when a user is removed from a list' },
                            { label: 'Form Submitted', value: 'form_submited', description: 'Triggered when a specific form is submitted' },
                            { label: 'Subscription Changed', value: 'subscription_changed', description: 'Triggered on plan upgrades or downgrades' },
                            { label: 'Payment Received', value: 'subscription_payment_recived', description: 'Triggered when a payment is successful' },
                            { label: 'Subscription Canceled', value: 'subscription_cancled', description: 'Triggered when a plan is canceled' },
                            { label: 'Prompt Favorite', value: 'prompt_favorite', description: 'Triggered when a user favorites a prompt' },
                            { label: 'Limit Reached', value: 'limit_reached', description: 'Triggered when usage quotas are met' },
                            { label: 'Affiliate Commission', value: 'affiliate_commison', description: 'Triggered when a commission is earned' }
                          ]}
                        />
                      </div>

                      {['tag_added', 'tag_remove'].includes(activeFlow.trigger?.type || '') && (
                        <div className="bg-muted/50 p-6 rounded-lg border border-border">
                          <label className="block text-xs font-bold uppercase text-muted-foreground mb-4 tracking-widest">Select Tag</label>
                          <Select
                            value={activeFlow.trigger?.value || ''}
                            onChange={val => setActiveFlow({ ...activeFlow, trigger: { ...activeFlow.trigger!, value: val } })}
                            options={[
                              { label: 'Any Tag', value: '' },
                              ...tags.map(t => ({ label: t.name, value: t.id }))
                            ]}
                          />
                        </div>
                      )}

                      {['list_applied', 'list_removed', 'form_submited'].includes(activeFlow.trigger?.type || '') && (
                        <div className="bg-muted/50 p-6 rounded-lg border border-border">
                          <Input
                            label={activeFlow.trigger?.type === 'form_submited' ? 'Form Name' : 'List Name'}
                            type="text"
                            placeholder={activeFlow.trigger?.type === 'form_submited' ? 'e.g. Lead Gen Form' : 'e.g. Newsletter Subscribers'}
                            value={activeFlow.trigger?.value || ''}
                            onChange={e => setActiveFlow({ ...activeFlow, trigger: { ...activeFlow.trigger!, value: e.target.value } })}
                            variant="filled"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'wait' && (
                      <div className="space-y-6">
                        <div className="bg-muted/50 p-6 rounded-lg border border-border">
                          <div className="flex items-end gap-2">
                            <Input
                            label="Wait Duration"
                            type="number"
                            value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.duration || 1}
                            onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, duration: parseInt(e.target.value) })}
                            variant="filled"
                            className="w-24"
                          />
                          <Select
                              value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.unit || 'days'}
                              onChange={val => updateStep(selectedStepId as string, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, unit: val })}
                              options={[
                                { label: 'Minutes', value: 'minutes' },
                                { label: 'Hours', value: 'hours' },
                                { label: 'Days', value: 'days' },
                                { label: 'Weeks', value: 'weeks' }
                              ]}
                              isSearchable={false}
                            />
                          </div>
                        </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground px-2 italic">
                        <Info className="w-3 h-3" />
                        <span>Flow will pause for this duration before continuing.</span>
                      </div>
                    </div>
                  )}

                  {activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'send_email' && (
                     <div className="space-y-6">
                      <div className="bg-muted/50 p-6 rounded-lg border border-border">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-4">Email Template</label>
                        <Select
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.templateId || ''}
                          onChange={val => {
                            const template = templates.find(t => t.id === val);
                            updateStep(selectedStepId as string, {
                              ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params,
                              templateId: val,
                              templateName: template?.type || 'Custom Email'
                            });
                          }}
                          options={[
                            { label: 'Select a template...', value: '' },
                            { label: '-- Custom Email --', value: 'custom', description: 'Write your own HTML email' },
                            ...templates.map(t => ({ label: `${t.type} - ${t.subject}`, value: t.id }))
                          ]}
                        />
                      </div>

                      {activeFlow.steps?.find(s => s.id === selectedStepId)?.params.templateId === 'custom' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-4"
                        >
                          <div className="bg-muted/50 p-6 rounded-lg border border-border">
                          <Input
                            label="Subject Line"
                            type="text"
                            placeholder="Email subject..."
                            value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.customSubject || ''}
                            onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, customSubject: e.target.value })}
                            variant="filled"
                          />
                          </div>
                          <div className="bg-muted/50 p-6 rounded-lg border border-border">
                            <Textarea
                              label="Email Content (HTML)"
                              placeholder="Write your custom email content here..."
                              value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.customContent || ''}
                              onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, customContent: e.target.value })}
                              variant="filled"
                              rows={5}
                            />
                          </div>
                        </motion.div>
                      )}

                      <Button
                        variant="primary"
                        size="md"
                        fullWidth
                        className="py-3 font-bold uppercase tracking-widest"
                      >
                        Preview Template
                      </Button>
                    </div>
                  )}

                  {activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'notify_user' && (
                     <div className="space-y-6">
                      <div className="bg-muted/50 p-6 rounded-lg border border-border">
                        <Textarea
                          label="Notification Message"
                          placeholder="What message should the user see?"
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.message || ''}
                          onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, message: e.target.value })}
                          variant="filled"
                          rows={4}
                        />
                      </div>
                    </div>
                  )}

                  {activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'recommend_prompt' && (
                     <div className="space-y-6">
                      <div className="bg-muted/50 p-6 rounded-lg border border-border">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-4 tracking-widest">Recommendation Strategy</label>
                        <Select
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.strategy || 'personalized'}
                          onChange={val => updateStep(selectedStepId as string, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, strategy: val })}
                          options={[
                            { label: 'AI Personalized (Best Match)', value: 'personalized', description: 'Deep learning based relevance' },
                            { label: 'Trending in Category', value: 'trending', description: 'Most popular in the last 24h' },
                            { label: 'New Arrivals', value: 'new_arrivals', description: 'Freshly released content' },
                            { label: "Editor's Pick", value: 'curated', description: 'Manually selected excellence' }
                          ]}
                          isSearchable={false}
                        />
                      </div>
                      <div className="bg-muted/50 p-6 rounded-lg border border-border">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-4 tracking-widest">Target Category</label>
                        <Select
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.category || 'all'}
                          onChange={val => updateStep(selectedStepId as string, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, category: val })}
                          options={[
                            { label: 'All Categories', value: 'all' },
                            { label: 'Creative Writing', value: 'creative' },
                            { label: 'Technical/Coding', value: 'technical' },
                            { label: 'Sales & Marketing', value: 'marketing' }
                          ]}
                        />
                      </div>
                    </div>
                  )}

                  {activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'ab_test' && (
                     <div className="space-y-6">
                      <div className="bg-muted/50 p-6 rounded-lg border border-border">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-4 tracking-widest">Traffic Split %</label>
                        <input
                          type="range"
                          min="0" max="100" step="5"
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.weight || 50}
                          onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, weight: parseInt(e.target.value) })}
                        />
                        <div className="flex justify-between mt-4 text-xs font-bold uppercase text-muted-foreground">
                          <span>Variant A: {activeFlow.steps?.find(s => s.id === selectedStepId)?.params.weight || 50}%</span>
                          <span>Variant B: {100 - (activeFlow.steps?.find(s => s.id === selectedStepId)?.params.weight || 50)}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'webhook' && (
                     <div className="space-y-6">
                      <div className="bg-muted/50 p-6 rounded-lg border border-border">
                        <Input
                          label="Target URL"
                          type="url"
                          placeholder="https://api.your-system.com/webhook"
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.url || ''}
                          onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, url: e.target.value })}
                          variant="filled"
                        />
                      </div>
                      <div className="bg-muted/50 p-6 rounded-lg border border-border">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 tracking-widest">Method</label>
                        <Select
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.method || 'POST'}
                          onChange={val => updateStep(selectedStepId as string, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, method: val })}
                          options={[
                            { label: 'POST', value: 'POST' },
                            { label: 'PUT', value: 'PUT' },
                            { label: 'GET', value: 'GET' }
                          ]}
                          isSearchable={false}
                        />
                      </div>
                    </div>
                  )}

                  {activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'condition' && (
                     <div className="space-y-6">
                      <div className="bg-muted/50 p-6 rounded-lg border border-border">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 tracking-widest">Field to Check</label>
                        <Select
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.field || 'subscriptionStatus'}
                          onChange={val => updateStep(selectedStepId as string, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, field: val })}
                          options={[
                            { label: 'Subscription Status', value: 'subscriptionStatus' },
                            { label: 'Tags', value: 'tags' },
                            { label: 'Credits', value: 'credits' },
                            { label: 'Button Click', value: 'button_click' },
                            { label: 'Email Response', value: 'email_response' }
                          ]}
                        />
                      </div>
                      <div className="bg-muted/50 p-6 rounded-lg border border-border">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 tracking-widest">Condition</label>
                        <Select
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.operator || 'equals'}
                          onChange={val => updateStep(selectedStepId as string, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, operator: val })}
                          options={[
                            { label: 'Equals', value: 'equals' },
                            { label: 'Greater than', value: 'greater_than' },
                            { label: 'Less than', value: 'less_than' },
                            { label: 'Contains', value: 'contains' },
                            { label: 'Is Positive (Yes)', value: 'is_positive' },
                            { label: 'Is Negative (No)', value: 'is_negative' }
                          ]}
                          isSearchable={false}
                        />
                      </div>
                      <div className="bg-muted/50 p-6 rounded-lg border border-border">
                        <Input
                          label="Compare Value"
                          type="text"
                          placeholder="Value to compare..."
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.value || ''}
                          onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, value: e.target.value })}
                          variant="filled"
                        />
                      </div>
                    </div>
                  )}

                  {(activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'add_tag' || activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'remove_tag') && (
                     <div className="space-y-6">
                      <div className="bg-muted/50 p-6 rounded-lg border border-border">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-4 tracking-widest">
                          {activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'add_tag' ? 'Select Tag to Apply' : 'Select Tag to Remove'}
                        </label>
                        <Select
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.tagId || ''}
                          onChange={val => updateStep(selectedStepId as string, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, tagId: val })}
                          options={[
                            { label: 'Select a tag...', value: '' },
                            ...tags.map(tag => ({ label: tag.name, value: tag.id }))
                          ]}
                        />
                      </div>
                    </div>
                  )}

                  {!['trigger', 'wait', 'send_email', 'recommend_prompt', 'ab_test', 'webhook', 'condition', 'add_tag', 'remove_tag', 'notify_user'].includes(activeFlow.steps?.find(s => s.id === selectedStepId)?.type || (selectedStepId === 'trigger' ? 'trigger' : '')) && (
                    <div className="py-20 text-center">
                      <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                        <Settings className="w-8 h-8 text-muted-foreground/40" />
                      </div>
                      <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">No settings for this step</p>
                    </div>
                  )}

                  {selectedStepId !== 'trigger' && (
                  <div className="mt-12 pt-8 border-t border-border">
                    <Button
                      onClick={() => removeStep(selectedStepId as string)}
                      variant="outline"
                      size="lg"
                      fullWidth
                      leftIcon={Trash2}
                      className="py-4 border-rose-500/20 text-rose-600 hover:bg-rose-500/10 font-bold uppercase tracking-widest"
                    >
                      Remove Step
                    </Button>
                  </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-20 text-center"
                >
                  <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MousePointer2 className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Editor Active</h3>
                  <p className="text-sm text-muted-foreground font-medium px-4 leading-relaxed">
                    Choose a node from the list to add it to your flow, or select an existing one to edit it.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
          </>
        ) : (
          <div className="flex-1 p-20 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-12">
               <div className="flex items-center justify-between">
                 <div>
                   <h2 className="text-3xl font-bold text-foreground tracking-tight mb-2">Live Performance: {activeFlow.name}</h2>
                   <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest italic">Monitoring since {new Date().toLocaleDateString()}</p>
                 </div>
                 <div className="flex gap-2">
                   <div className="bg-emerald-100 text-emerald-600 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                     <Play className="w-3 h-3 fill-current" />
                     Live & Active
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-4 gap-6">
                 <StatCard label="Recipients" value={String(Math.floor(Math.random() * 5000) + 500)} icon={Users} color="text-primary" />
                 <StatCard label="Goal Met" value={String(Math.floor(Math.random() * 20) + 10) + '%'} icon={Award} color="text-emerald-600" />
                 <StatCard label="Dropped" value={String(Math.floor(Math.random() * 10) + 2) + '%'} icon={AlertCircle} color="text-rose-600" />
                 <StatCard label="Avg. Velocity" value="4.2h" icon={Clock} color="text-blue-600" />
               </div>

               <div className="bg-card rounded-lg border border-border p-8 shadow-sm">
                 <div className="flex items-center justify-between mb-8">
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-tight flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Step-by-Step Conversion Flow
                    </h4>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Across {activeFlow.steps?.length} nodes</span>
                 </div>
                 <div className="space-y-6">
                    {activeFlow.steps?.map((step, i) => (
                       <PerformanceItem
                         key={step.id}
                         label={`${i+1}. ${step.type.replace('_', ' ')}`}
                         rate={String(Math.max(10, 100 - (i * 12) - Math.floor(Math.random() * 10))) + '%'}
                         color={i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'}
                       />
                    ))}
                    {!activeFlow.steps?.length && (
                      <div className="py-10 text-center text-muted-foreground/40 font-bold uppercase text-xs tracking-widest">No steps to analyze</div>
                    )}
                 </div>
               </div>

               <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-card rounded-lg border border-border p-8 shadow-sm">
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-tight mb-8">Audience Segments</h4>
                    <div className="h-48 flex items-center justify-center relative">
                       {/* Mock Donut Chart */}
                       <div className="w-32 h-32 rounded-full border-[12px] border-border border-t-indigo-600 border-r-blue-400 flex items-center justify-center">
                          <div className="text-center">
                             <div className="text-xl font-bold text-foreground">72%</div>
                             <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Mobile</div>
                         </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-card rounded-lg border border-border p-8 shadow-sm">
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-tight mb-6 flex items-center justify-between">
                      Recent Entries
                      <span className="text-[8px] font-bold text-primary bg-primary/8 px-2 py-1 rounded">Live</span>
                    </h4>
                    <div className="space-y-4">
                       <ActivityLog user="johndoe@example.com" action="Entered Flow" time="2m ago" />
                       <ActivityLog user="sarah.w@tech.co" action="Waiting @ Step 2" time="15m ago" />
                       <ActivityLog user="mike.r@gmail.com" action="Completed Goal" time="1h ago" />
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) {
  return (
    <div className="bg-card p-6 rounded-lg border border-border shadow-sm flex flex-col items-center gap-2">
      <div className={`w-10 h-10 ${color} bg-muted/50 rounded-md flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</div>
    </div>
  );
}

function PerformanceItem({ label, rate, color }: { label: string, rate: string, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
        <span>{label}</span>
        <span>{rate}</span>
      </div>
      <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: rate }} />
      </div>
    </div>
  );
}

function ActivityLog({ user, action, time }: { user: string, action: string, time: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div>
        <div className="text-xs font-bold text-foreground truncate max-w-[150px]">{user}</div>
        <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{action}</div>
      </div>
      <div className="text-[8px] font-bold text-muted-foreground/40 uppercase">{time}</div>
    </div>
  );
}

function NodeCard({ icon: Icon, label, sub, onClick, color, bg }: { icon: any, label: string, sub: string, onClick: () => void, color: string, bg: string }) {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      size="lg"
      fullWidth
      className="bg-card border border-border p-4 h-auto hover:border-primary hover:shadow-lg transition-all group text-left justify-start"
    >
      <div className={`w-12 h-12 ${bg} ${color} rounded-md flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">{label}</h4>
        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{sub}</p>
      </div>
    </Button>
  );
}

function ActionButton({ icon: Icon, label, onClick, color }: { icon: any, label: string, onClick: () => void, color: string }) {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      size="md"
      className="flex-col gap-1.5 p-3 h-auto min-w-[70px] hover:bg-muted/50 transition-all"
    >
      <div className={`w-10 h-10 bg-card border border-border rounded-md flex items-center justify-center shadow-sm ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-bold uppercase text-muted-foreground">{label}</span>
    </Button>
  );
}
