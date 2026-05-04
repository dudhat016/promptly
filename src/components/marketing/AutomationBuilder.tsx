import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Mail, Clock, GitBranch, Plus, X, Save, Play, 
  Settings, Trash2, MousePointer2, ChevronRight, Sliders,
  Database, Send, Bell, Users, Filter, Layers, Info, Tag as TagIcon,
  Sparkles, Activity, Split, Globe, Share2, AlertCircle, Award
} from 'lucide-react';
import { AutomationFlow, Tag as TagType, EmailTemplate } from '../../types';

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
    <div className="flex flex-col h-[85vh] bg-slate-50 rounded-[3rem] overflow-hidden border border-slate-200 shadow-2xl">
      <div className="bg-white px-8 py-6 border-b border-slate-200 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <input 
              type="text" 
              value={activeFlow.name}
              onChange={e => setActiveFlow({...activeFlow, name: e.target.value})}
              className="text-xl font-black text-slate-900 bg-transparent border-none focus:ring-0 p-0"
              placeholder="Automation Name"
            />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
              <Play className="w-3 h-3 fill-current" />
              Trigger: {activeFlow.trigger?.type.replace('_', ' ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl mr-4">
            <button 
              onClick={() => setViewMode('editor')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'editor' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Editor
            </button>
            <button 
              onClick={() => setViewMode('stats')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'stats' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Stats
            </button>
          </div>
          <button 
            onClick={onCancel}
            className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
          >
            Back
          </button>
          <button 
            onClick={() => onSave(activeFlow)}
            className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'editor' ? (
          <>
        <div className="flex-1 overflow-auto p-12 relative bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] cursor-grab active:cursor-grabbing">
           {/* Navigation Controls */}
           <div className="absolute left-8 bottom-8 flex flex-col items-center gap-4 bg-white border border-slate-200 p-2 rounded-2xl shadow-xl z-20">
              <button 
                onClick={() => handleZoom(0.1)}
                className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Zoom In"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setZoomLevel(1)}
                className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Reset Zoom"
              >
                <X className="w-5 h-5 rotate-45" />
              </button>
              <button 
                onClick={() => handleZoom(-0.1)}
                className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Zoom Out"
              >
                <div className="w-5 h-0.5 bg-current rounded-full" />
              </button>
              <div className="h-px w-6 bg-slate-100" />
              <div className="text-[8px] font-black text-slate-400 p-1">{Math.round(zoomLevel * 100)}%</div>
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
                className={`bg-white border-2 rounded-3xl p-6 shadow-sm group cursor-pointer hover:shadow-xl transition-all ${selectedStepId === 'trigger' ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-200'}`}
                onClick={() => setSelectedStepId('trigger')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                    <Play className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Flow Trigger</h4>
                    <p className="text-xs text-slate-500 font-medium">
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
              <div className="h-12 w-0.5 bg-slate-200 mx-auto relative">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-200 rounded-full" />
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
                        className={`bg-white border-2 rounded-3xl p-6 shadow-md transition-all cursor-pointer hover:shadow-xl ${selectedStepId === step.id ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-100'}`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              step.type === 'send_email' ? 'bg-blue-50 text-blue-600' :
                              step.type === 'wait' ? 'bg-slate-100 text-slate-600' :
                              step.type === 'condition' ? 'bg-emerald-50 text-emerald-600' :
                              step.type === 'notify_user' ? 'bg-indigo-50 text-indigo-600' :
                              'bg-purple-50 text-purple-600'
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
                              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{step.type.replace('_', ' ')}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{
                                step.type === 'recommend_prompt' ? 'AI Recommendation' :
                                step.type === 'ab_test' ? 'Optimization' :
                                step.type === 'condition' ? 'Decision point' :
                                'Marketing Action'
                              }</p>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeStep(step.id); }}
                            className="p-2 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {step.type === 'condition' && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                               <Filter className="w-3 h-3 text-emerald-500" />
                               <span>If {step.params.field} {step.params.operator} "{step.params.value}"</span>
                            </div>
                            <div className="flex gap-2">
                               <div className="flex-1 bg-slate-50 rounded-lg p-2 text-center">
                                 <span className="text-[9px] font-black uppercase text-emerald-600">Yes path</span>
                               </div>
                               <div className="flex-1 bg-slate-50 rounded-lg p-2 text-center">
                                 <span className="text-[9px] font-black uppercase text-rose-600">No path</span>
                               </div>
                            </div>
                          </div>
                        )}
                        {step.type === 'wait' && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded-lg">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Wait for {step.params.duration} {step.params.unit || 'days'}</span>
                          </div>
                        )}
                        {step.type === 'notify_user' && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                             <Bell className="w-3 h-3 text-indigo-500" />
                             <span className="truncate">{step.params.message || 'Notification alert'}</span>
                          </div>
                        )}
                        {step.type === 'send_email' && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                            <Mail className="w-4 h-4 text-blue-500" />
                            <span>Send "{step.params.templateName || 'Welcome Series'}"</span>
                          </div>
                        )}
                        {step.type === 'recommend_prompt' && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 shadow-sm">
                             <Sparkles className="w-4 h-4 text-indigo-500" />
                             <span>Send {step.params.category || 'Recommended'} Prompts</span>
                          </div>
                        )}
                        {step.type === 'ab_test' && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                             <Split className="w-3 h-3 text-amber-500" />
                             <span>Split Traffic: {step.params.weight || 50}/{100 - (step.params.weight || 50)}</span>
                          </div>
                        )}
                        <div className="flex gap-1 mt-4">
                          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-indigo-600 w-1/4 rounded-full" />
                          </div>
                        </div>
                      </div>
                      <div className="h-12 w-0.5 bg-slate-200 mx-auto relative">
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-200 rounded-full" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add Step Button */}
              <div className="relative pt-4">
                <button 
                  className="w-12 h-12 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:border-indigo-600 hover:text-indigo-600 hover:shadow-xl transition-all group"
                >
                  <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                </button>
                
                {/* Floating Action Menu */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white border border-slate-200 p-2 rounded-[2rem] shadow-2xl flex gap-1 z-50 whitespace-nowrap">
                  <ActionButton icon={Mail} label="Email" onClick={() => addStep('send_email')} color="text-blue-600" />
                  <ActionButton icon={Clock} label="Delay" onClick={() => addStep('wait')} color="text-slate-600" />
                  <ActionButton icon={TagIcon} label="Tag" onClick={() => addStep('add_tag')} color="text-purple-600" />
                  <ActionButton icon={GitBranch} label="Split" onClick={() => addStep('condition')} color="text-emerald-600" />
                  <ActionButton icon={Bell} label="Notify" onClick={() => addStep('notify_user')} color="text-indigo-600" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-white border-l border-slate-200 overflow-hidden flex flex-col shadow-2xl">
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            <button 
              onClick={() => setSidebarTab('nodes')}
              className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${sidebarTab === 'nodes' ? 'border-indigo-600 text-slate-900 bg-slate-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Nodes
            </button>
            <button 
              onClick={() => setSidebarTab('settings')}
              className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${sidebarTab === 'settings' ? 'border-indigo-600 text-slate-900 bg-slate-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Settings
            </button>
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
                  <h3 className="text-xs font-black uppercase text-slate-400 mb-6 flex items-center gap-2">
                    <Layers className="w-3 h-3" />
                    Available Steps
                  </h3>
                  
                  <div className="space-y-6">
                    <section>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest pl-2">Logic</h4>
                      <div className="space-y-3">
                        <NodeCard icon={GitBranch} label="Condition" sub="Basic Branching" onClick={() => addStep('condition')} color="text-emerald-600" bg="bg-emerald-50" />
                        <NodeCard icon={Split} label="A/B Split" sub="Traffic Optimization" onClick={() => addStep('ab_test')} color="text-amber-600" bg="bg-amber-50" />
                        <NodeCard icon={Clock} label="Delay" sub="Wait Duration" onClick={() => addStep('wait')} color="text-slate-600" bg="bg-slate-50" />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest pl-2">Messaging</h4>
                      <div className="space-y-3">
                        <NodeCard icon={Mail} label="Send Email" sub="Campaign/Template" onClick={() => addStep('send_email')} color="text-blue-600" bg="bg-blue-50" />
                        <NodeCard icon={Bell} label="Notify User" sub="App Notification" onClick={() => addStep('notify_user')} color="text-indigo-600" bg="bg-indigo-50" />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest pl-2">AI & Advanced</h4>
                      <div className="space-y-3">
                        <NodeCard icon={Sparkles} label="Recommend" sub="AI Prompt Sharing" onClick={() => addStep('recommend_prompt')} color="text-indigo-600" bg="bg-indigo-50" />
                        <NodeCard icon={TagIcon} label="Add Tag" sub="Segmentation" onClick={() => addStep('add_tag')} color="text-purple-600" bg="bg-purple-50" />
                        <NodeCard icon={X} label="Remove Tag" sub="Clean up tags" onClick={() => addStep('remove_tag')} color="text-rose-600" bg="bg-rose-50" />
                        <NodeCard icon={Globe} label="Webhook" sub="External API" onClick={() => addStep('webhook')} color="text-slate-600" bg="bg-slate-50" />
                      </div>
                    </section>
                  </div>
                  
                  <div className="pt-8 text-center">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">More steps coming soon</p>
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
                    <h3 className="text-sm font-black text-slate-900 uppercase">Step Details</h3>
                    <button onClick={() => setSelectedStepId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {selectedStepId === 'trigger' && (
                     <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Trigger Event</label>
                        <select 
                          className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600"
                          value={activeFlow.trigger?.type || 'user_signup'}
                          onChange={e => setActiveFlow({ ...activeFlow, trigger: { ...activeFlow.trigger, type: e.target.value as any } })}
                        >
                          <option value="user_signup">New Register</option>
                          <option value="user_login">User Login</option>
                          <option value="contact_created">Contact Created</option>
                          <option value="tag_added">Tag Apply</option>
                          <option value="tag_remove">Tag Remove</option>
                          <option value="list_applied">List Applied</option>
                          <option value="list_removed">List Removed</option>
                          <option value="form_submited">Form Submitted</option>
                          <option value="subscription_changed">Subscription Changed</option>
                          <option value="subscription_payment_recived">Subscription Payment Received</option>
                          <option value="subscription_cancled">Subscription Canceled</option>
                          <option value="prompt_favorite">Prompt Favorite</option>
                          <option value="limit_reached">Limit Reached</option>
                          <option value="affiliate_commison">Affiliate Commission</option>
                        </select>
                      </div>
                      
                      {['tag_added', 'tag_remove'].includes(activeFlow.trigger?.type || '') && (
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Select Tag</label>
                          <select 
                            className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600"
                            value={activeFlow.trigger?.value || ''}
                            onChange={e => setActiveFlow({ ...activeFlow, trigger: { ...activeFlow.trigger!, value: e.target.value } })}
                          >
                            <option value="">Any Tag</option>
                            {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                      )}
                      
                      {['list_applied', 'list_removed', 'form_submited'].includes(activeFlow.trigger?.type || '') && (
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">
                            {activeFlow.trigger?.type === 'form_submited' ? 'Form Name' : 'List Name'}
                          </label>
                          <input 
                            type="text"
                            placeholder={activeFlow.trigger?.type === 'form_submited' ? 'e.g. Lead Gen Form' : 'e.g. Newsletter Subscribers'}
                            className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600"
                            value={activeFlow.trigger?.value || ''}
                            onChange={e => setActiveFlow({ ...activeFlow, trigger: { ...activeFlow.trigger!, value: e.target.value } })}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'wait' && (
                     <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-4">Wait Duration</label>
                        <div className="flex gap-2">
                          <input 
                            type="number"
                            className="w-20 bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600"
                            value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.duration || 1}
                            onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, duration: parseInt(e.target.value) })}
                          />
                           <select 
                            className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600"
                            value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.unit || 'days'}
                            onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, unit: e.target.value })}
                          >
                            <option value="minutes">Minutes</option>
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 px-2 italic">
                        <Info className="w-3 h-3" />
                        <span>Flow will pause for this duration before continuing.</span>
                      </div>
                    </div>
                  )}

                  {activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'send_email' && (
                     <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-4">Email Template</label>
                        <select 
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600"
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.templateId || ''}
                          onChange={e => {
                            const template = templates.find(t => t.id === e.target.value);
                            updateStep(selectedStepId, { 
                              ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, 
                              templateId: e.target.value,
                              templateName: template?.type || 'Custom Email'
                            });
                          }}
                        >
                          <option value="">Select a template...</option>
                          <option value="custom">-- Custom Email --</option>
                          {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.type} - {t.subject}</option>
                          ))}
                        </select>
                      </div>

                      {activeFlow.steps?.find(s => s.id === selectedStepId)?.params.templateId === 'custom' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-4"
                        >
                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Subject Line</label>
                            <input 
                              type="text"
                              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold"
                              placeholder="Email subject..."
                              value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.customSubject || ''}
                              onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, customSubject: e.target.value })}
                            />
                          </div>
                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Email Content (HTML)</label>
                            <textarea 
                              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold h-32"
                              placeholder="Write your custom email content here..."
                              value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.customContent || ''}
                              onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, customContent: e.target.value })}
                            />
                          </div>
                        </motion.div>
                      )}
                      
                      <button className="w-full bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Preview Template</button>
                    </div>
                  )}

                  {activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'notify_user' && (
                     <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Notification Message</label>
                        <textarea 
                          className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-bold h-32 focus:ring-2 focus:ring-indigo-600"
                          placeholder="What message should the user see?"
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.message || ''}
                          onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, message: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'recommend_prompt' && (
                     <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Recommendation Strategy</label>
                        <select 
                          className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600"
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.strategy || 'personalized'}
                          onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, strategy: e.target.value })}
                        >
                          <option value="personalized">AI Personalized (Best Match)</option>
                          <option value="trending">Trending in Category</option>
                          <option value="new_arrivals">New Arrivals</option>
                          <option value="curated">Editor's Pick</option>
                        </select>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Target Category</label>
                        <select 
                          className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600"
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.category || 'all'}
                          onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, category: e.target.value })}
                        >
                          <option value="all">All Categories</option>
                          <option value="creative">Creative Writing</option>
                          <option value="technical">Technical/Coding</option>
                          <option value="marketing">Sales & Marketing</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'ab_test' && (
                     <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Traffic Split %</label>
                        <input 
                          type="range" 
                          min="0" max="100" step="5"
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.weight || 50}
                          onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, weight: parseInt(e.target.value) })}
                        />
                        <div className="flex justify-between mt-4 text-[10px] font-black uppercase text-slate-500">
                          <span>Variant A: {activeFlow.steps?.find(s => s.id === selectedStepId)?.params.weight || 50}%</span>
                          <span>Variant B: {100 - (activeFlow.steps?.find(s => s.id === selectedStepId)?.params.weight || 50)}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'webhook' && (
                     <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Target URL</label>
                        <input 
                          type="url"
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold"
                          placeholder="https://api.your-system.com/webhook"
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.url || ''}
                          onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, url: e.target.value })}
                        />
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Method</label>
                        <select 
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold"
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.method || 'POST'}
                          onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, method: e.target.value })}
                        >
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="GET">GET</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'condition' && (
                     <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Field to Check</label>
                        <select 
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold"
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.field || 'subscriptionStatus'}
                          onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, field: e.target.value })}
                        >
                          <option value="subscriptionStatus">Subscription Status</option>
                          <option value="tags">Tags</option>
                          <option value="credits">Credits</option>
                          <option value="button_click">Button Click</option>
                          <option value="email_response">Email Response</option>
                        </select>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Condition</label>
                        <select 
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold"
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.operator || 'equals'}
                          onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, operator: e.target.value })}
                        >
                          <option value="equals">Equals</option>
                          <option value="greater_than">Greater than</option>
                          <option value="less_than">Less than</option>
                          <option value="contains">Contains</option>
                          <option value="is_positive">Is Positive (Yes)</option>
                          <option value="is_negative">Is Negative (No)</option>
                        </select>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Compare Value</label>
                        <input 
                          type="text"
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold"
                          placeholder="Value to compare..."
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.value || ''}
                          onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, value: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {(activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'add_tag' || activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'remove_tag') && (
                     <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">
                          {activeFlow.steps?.find(s => s.id === selectedStepId)?.type === 'add_tag' ? 'Select Tag to Apply' : 'Select Tag to Remove'}
                        </label>
                        <select 
                          className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600"
                          value={activeFlow.steps?.find(s => s.id === selectedStepId)?.params.tagId || ''}
                          onChange={e => updateStep(selectedStepId, { ...activeFlow.steps?.find(s => s.id === selectedStepId)?.params, tagId: e.target.value })}
                        >
                          <option value="">Select a tag...</option>
                          {tags.map(tag => (
                            <option key={tag.id} value={tag.id}>{tag.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {!['trigger', 'wait', 'send_email', 'recommend_prompt', 'ab_test', 'webhook', 'condition', 'add_tag', 'remove_tag', 'notify_user'].includes(activeFlow.steps?.find(s => s.id === selectedStepId)?.type || (selectedStepId === 'trigger' ? 'trigger' : '')) && (
                    <div className="py-20 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <Settings className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No settings for this step</p>
                    </div>
                  )}
                  
                  {selectedStepId !== 'trigger' && (
                  <div className="mt-12 pt-8 border-t border-slate-100">
                    <button 
                      onClick={() => removeStep(selectedStepId as string)}
                      className="w-full py-4 rounded-xl border border-rose-100 text-rose-600 hover:bg-rose-50 transition-all text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove Step
                    </button>
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
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MousePointer2 className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">Editor Active</h3>
                  <p className="text-sm text-slate-400 font-medium px-4 leading-relaxed">
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
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Live Performance: {activeFlow.name}</h2>
                   <p className="text-sm text-slate-400 font-bold uppercase tracking-widest italic">Monitoring since {new Date().toLocaleDateString()}</p>
                 </div>
                 <div className="flex gap-2">
                   <div className="bg-emerald-100 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                     <Play className="w-3 h-3 fill-current" />
                     Live & Active
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-4 gap-6">
                 <StatCard label="Recipients" value={String(Math.floor(Math.random() * 5000) + 500)} icon={Users} color="text-indigo-600" />
                 <StatCard label="Goal Met" value={String(Math.floor(Math.random() * 20) + 10) + '%'} icon={Award} color="text-emerald-600" />
                 <StatCard label="Dropped" value={String(Math.floor(Math.random() * 10) + 2) + '%'} icon={AlertCircle} color="text-rose-600" />
                 <StatCard label="Avg. Velocity" value="4.2h" icon={Clock} color="text-blue-600" />
               </div>

               <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                 <div className="flex items-center justify-between mb-8">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-500" />
                      Step-by-Step Conversion Flow
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Across {activeFlow.steps?.length} nodes</span>
                 </div>
                 <div className="space-y-6">
                    {activeFlow.steps?.map((step, i) => (
                       <PerformanceItem 
                         key={step.id} 
                         label={`${i+1}. ${step.type.replace('_', ' ')}`} 
                         rate={String(Math.max(10, 100 - (i * 12) - Math.floor(Math.random() * 10))) + '%'} 
                         color={i === 0 ? 'bg-indigo-600' : 'bg-slate-400'} 
                       />
                    ))}
                    {!activeFlow.steps?.length && (
                      <div className="py-10 text-center text-slate-300 font-bold uppercase text-xs tracking-widest">No steps to analyze</div>
                    )}
                 </div>
               </div>

               <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-8">Audience Segments</h4>
                    <div className="h-48 flex items-center justify-center relative">
                       {/* Mock Donut Chart */}
                       <div className="w-32 h-32 rounded-full border-[12px] border-slate-50 border-t-indigo-600 border-r-blue-400 flex items-center justify-center">
                          <div className="text-center">
                             <div className="text-xl font-black text-slate-900">72%</div>
                             <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Mobile</div>
                          </div>
                       </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center justify-between">
                      Recent Entries
                      <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Live</span>
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
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-2">
      <div className={`w-10 h-10 ${color} bg-slate-50 rounded-xl flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-black text-slate-900">{value}</div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</div>
    </div>
  );
}

function PerformanceItem({ label, rate, color }: { label: string, rate: string, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase tracking-widest">
        <span>{label}</span>
        <span>{rate}</span>
      </div>
      <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: rate }} />
      </div>
    </div>
  );
}

function ActivityLog({ user, action, time }: { user: string, action: string, time: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <div>
        <div className="text-[10px] font-black text-slate-900 truncate max-w-[150px]">{user}</div>
        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{action}</div>
      </div>
      <div className="text-[8px] font-black text-slate-300 uppercase">{time}</div>
    </div>
  );
}

function NodeCard({ icon: Icon, label, sub, onClick, color, bg }: { icon: any, label: string, sub: string, onClick: () => void, color: string, bg: string }) {
  return (
    <button 
      onClick={onClick}
      className="w-full bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-4 hover:border-indigo-600 hover:shadow-lg transition-all group text-left"
    >
      <div className={`w-12 h-12 ${bg} ${color} rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{label}</h4>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{sub}</p>
      </div>
    </button>
  );
}

function ActionButton({ icon: Icon, label, onClick, color }: { icon: any, label: string, onClick: () => void, color: string }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl hover:bg-slate-50 transition-all min-w-[70px]"
    >
      <div className={`w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center shadow-sm ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[10px] font-black uppercase text-slate-500">{label}</span>
    </button>
  );
}

