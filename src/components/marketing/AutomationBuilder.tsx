import { cn } from '../../lib/utils';
import {
  Activity,
  AlertCircle, Award,
  Bell,
  Clock,
  Filter,
  Hand,
  Maximize2,
  GitBranch,
  Globe,
  Info,
  Layers,
  Mail,
  Minus,
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useGesture } from '@use-gesture/react';
import { AutomationFlow, EmailTemplate, Tag as TagType } from '../../types';
import Button from '../primitives/Button';
import Card from '../primitives/Card';
import Input from '../primitives/Input';
import Select from '../primitives/Select';
import Textarea from '../primitives/Textarea';

const SCALE_MIN = 0.3;
const SCALE_MAX = 2.5;
const NODE_WIDTH = 360;

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
  const [sidebarTab, setSidebarTab] = useState<'nodes' | 'settings'>('nodes');
  const [viewMode, setViewMode] = useState<'editor' | 'stats'>('editor');
  // addMenuTarget: -1 = after trigger, n = after steps[n], null = closed
  const [addMenuTarget, setAddMenuTarget] = useState<number | null>(null);
  const [tool, setTool] = useState<'select' | 'hand'>('select');
  const [spaceHeld, setSpaceHeld] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const innerLayerRef = useRef<HTMLDivElement>(null);
  const scaleTextRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const toolRef = useRef(tool);
  const spaceRef = useRef(spaceHeld);
  const selectedStepIdRef = useRef(selectedStepId);
  toolRef.current = tool;
  spaceRef.current = spaceHeld;
  selectedStepIdRef.current = selectedStepId;

  // Write transform directly to DOM — no React re-render
  const commitTransform = (t: { x: number; y: number; scale: number }) => {
    transformRef.current = t;
    if (innerLayerRef.current) {
      innerLayerRef.current.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
    }
    if (scaleTextRef.current) {
      scaleTextRef.current.textContent = `${Math.round(t.scale * 100)}%`;
    }
  };

  // Center flow on first mount / view switch
  useEffect(() => {
    if (!canvasRef.current) return;
    const { width } = canvasRef.current.getBoundingClientRect();
    commitTransform({ x: (width - NODE_WIDTH) / 2, y: 60, scale: 1 });
  }, [viewMode]);

  useEffect(() => {
    if (selectedStepId) setSidebarTab('settings');
  }, [selectedStepId]);

  // Keyboard shortcuts: H = hand tool, V = select tool, Space = temporary hand
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' && !e.repeat) { e.preventDefault(); setSpaceHeld(true); }
      if (e.code === 'KeyH') setTool('hand');
      if (e.code === 'KeyV' || e.code === 'Escape') setTool('select');
      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedStepIdRef.current && selectedStepIdRef.current !== 'trigger') {
        setActiveFlow(f => ({ ...f, steps: f.steps?.filter(s => s.id !== selectedStepIdRef.current) }));
        setSelectedStepId(null);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  // Sync cursor style when tool or space changes
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = (spaceHeld || tool === 'hand') ? 'grab' : 'default';
    }
  }, [tool, spaceHeld]);

  // Zoom to cursor
  const applyZoom = (factor: number, cx: number, cy: number) => {
    const prev = transformRef.current;
    const newScale = Math.min(Math.max(SCALE_MIN, prev.scale * factor), SCALE_MAX);
    const ratio = newScale / prev.scale;
    commitTransform({
      scale: newScale,
      x: Math.round((cx - ratio * (cx - prev.x)) * 100) / 100,
      y: Math.round((cy - ratio * (cy - prev.y)) * 100) / 100,
    });
  };

  const fitToScreen = () => {
    if (!canvasRef.current) return;
    const { width } = canvasRef.current.getBoundingClientRect();
    commitTransform({ x: (width - NODE_WIDTH) / 2, y: 60, scale: 1 });
  };

  // Pan + wheel zoom gestures
  useGesture(
    {
      onDrag: ({ active, delta: [dx, dy], event }) => {
        const isHandMode = spaceRef.current || toolRef.current === 'hand';
        const target = event.target as HTMLElement;
        if (!isHandMode && target.closest('[data-node]')) return;
        // Update cursor directly — no React re-render
        if (canvasRef.current) {
          canvasRef.current.style.cursor = active
            ? 'grabbing'
            : (spaceRef.current || toolRef.current === 'hand') ? 'grab' : 'default';
        }
        const prev = transformRef.current;
        commitTransform({ ...prev, x: prev.x + dx, y: prev.y + dy });
      },
      onWheel: ({ event, delta: [, dy] }) => {
        event.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const cx = (event as WheelEvent).clientX - rect.left;
        const cy = (event as WheelEvent).clientY - rect.top;
        applyZoom(dy > 0 ? 1 / 1.1 : 1.1, cx, cy);
      },
    },
    { target: canvasRef, drag: { filterTaps: true, pointer: { buttons: 1 } }, wheel: { eventOptions: { passive: false } } }
  );

  const addStep = (type: 'send_email' | 'wait' | 'add_tag' | 'remove_tag' | 'notify_user' | 'condition' | 'webhook' | 'ab_test' | 'recommend_prompt', afterIndex?: number) => {
    const newStep = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      params: type === 'wait'             ? { duration: 1, unit: 'days' } :
               type === 'recommend_prompt' ? { category: 'all' } :
               type === 'ab_test'          ? { variants: ['A', 'B'], weight: 50 } :
               type === 'condition'        ? { field: 'subscriptionStatus', operator: 'equals', value: '' } :
               type === 'send_email'       ? { templateId: '', customSubject: '', customContent: '' } :
               type === 'notify_user'      ? { message: 'New activity detected' } : {}
    };
    const steps = [...(activeFlow.steps || [])];
    if (afterIndex !== undefined && afterIndex >= 0) {
      steps.splice(afterIndex + 1, 0, newStep as any);
    } else {
      steps.push(newStep as any);
    }
    setActiveFlow({ ...activeFlow, steps });
    setAddMenuTarget(null);
  };

  const removeStep = (id: string) => {
    setActiveFlow({ ...activeFlow, steps: activeFlow.steps?.filter(s => s.id !== id) });
    if (selectedStepId === id) setSelectedStepId(null);
  };

  const updateStep = (id: string, params: any) => {
    setActiveFlow({ ...activeFlow, steps: activeFlow.steps?.map(s => s.id === id ? { ...s, params } : s) });
  };

  const selectedStep = useMemo(
    () => activeFlow.steps?.find(s => s.id === selectedStepId),
    [activeFlow.steps, selectedStepId]
  );

  return (
    <Card padding="none" className="flex flex-col h-[85vh] overflow-hidden rounded-2xl shadow-none">
      <div className="bg-card px-8 py-6 border-b border-border flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
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
              Trigger: {activeFlow.trigger?.type.replace(/_/g, ' ')}
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
                viewMode === 'editor' ? "text-foreground border border-border" : "text-muted-foreground"
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
                viewMode === 'stats' ? "text-foreground border border-border" : "text-muted-foreground"
              )}
            >
              Stats
            </Button>
          </div>
          {/* Active toggle */}
          <button
            type="button"
            onClick={() => setActiveFlow(f => ({ ...f, active: !f.active }))}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-widest transition-all",
              activeFlow.active
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                : "bg-muted text-muted-foreground border-border hover:border-primary/30"
            )}
          >
            <span className={cn(
              "w-2 h-2 rounded-full",
              activeFlow.active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
            )} />
            {activeFlow.active ? 'Active' : 'Inactive'}
          </button>
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
          >
            Back
          </Button>
          <Button
            onClick={() => {
              const incomplete = activeFlow.steps?.filter(s =>
                (s.type === 'send_email' && !s.params?.templateId) ||
                (s.type === 'condition' && !s.params?.value) ||
                (s.type === 'webhook' && !s.params?.url)
              );
              if (incomplete?.length) {
                toast.error(`${incomplete.length} step${incomplete.length > 1 ? 's' : ''} need configuration before saving`);
                return;
              }
              onSave(activeFlow);
            }}
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
          {/* ── Canvas ───────────────────────────────────────────── */}
          <div
            ref={canvasRef}
            style={{ touchAction: 'none', cursor: 'default' }}
            className={cn(
              "flex-1 relative overflow-hidden select-none",
              "bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:24px_24px]"
            )}
          >
            {/* ── Transformed canvas layer ── */}
            <div
              ref={innerLayerRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `translate(${transformRef.current.x}px, ${transformRef.current.y}px) scale(${transformRef.current.scale})`,
                transformOrigin: '0 0',
                width: NODE_WIDTH,
                willChange: 'transform',
              }}
            >
              <div className="flex flex-col items-center" style={{ width: NODE_WIDTH }}>

                {/* Trigger Node */}
                <div data-node className="w-full" onMouseDown={e => e.stopPropagation()}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedStepId('trigger')}
                    className={cn(
                      "w-full bg-card border-2 rounded-xl p-5 cursor-pointer transition-all",
                      selectedStepId === 'trigger' ? 'border-primary ring-4 ring-primary/10' : 'border-border hover:border-primary/40'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                        <Play className="w-4 h-4 fill-current" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Entry Point</p>
                        <p className="text-sm font-semibold text-foreground truncate">
                          {activeFlow.trigger?.type === 'user_signup'                  ? 'When a user signs up' :
                           activeFlow.trigger?.type === 'user_login'                   ? 'When a user logs in' :
                           activeFlow.trigger?.type === 'contact_created'              ? 'When a contact is created' :
                           activeFlow.trigger?.type === 'tag_added'                    ? `Tag applied${activeFlow.trigger?.value ? `: "${tags.find(t => t.id === activeFlow.trigger?.value)?.name || activeFlow.trigger.value}"` : ''}` :
                           activeFlow.trigger?.type === 'tag_remove'                   ? `Tag removed${activeFlow.trigger?.value ? `: "${tags.find(t => t.id === activeFlow.trigger?.value)?.name || activeFlow.trigger.value}"` : ''}` :
                           activeFlow.trigger?.type === 'subscription_changed'         ? 'Subscription changes' :
                           activeFlow.trigger?.type === 'subscription_payment_received'? 'Payment received' :
                           activeFlow.trigger?.type === 'subscription_renewed'         ? 'Subscription renews' :
                           activeFlow.trigger?.type === 'subscription_cancelled'       ? 'Subscription canceled' :
                           activeFlow.trigger?.type === 'prompt_favorite'              ? 'Prompt favorited' :
                           activeFlow.trigger?.type === 'limit_reached'                ? 'Usage limit reached' :
                           activeFlow.trigger?.type === 'affiliate_commison'           ? 'Affiliate commission earned' :
                           (activeFlow.trigger?.type as string)?.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Connector after trigger */}
                <FlowConnector
                  afterIndex={-1}
                  addMenuTarget={addMenuTarget}
                  onToggle={idx => setAddMenuTarget(addMenuTarget === idx ? null : idx)}
                  onAdd={(type) => addStep(type, undefined)}
                />

                {/* Step Nodes */}
                <AnimatePresence>
                  {activeFlow.steps?.map((step, idx) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className="w-full"
                      data-node
                      onMouseDown={e => e.stopPropagation()}
                    >
                      <div
                        onClick={() => setSelectedStepId(step.id)}
                        className={cn(
                          "w-full bg-card border-2 rounded-xl p-5 cursor-pointer transition-all group",
                          selectedStepId === step.id ? 'border-primary ring-4 ring-primary/10' : 'border-border hover:border-primary/40'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                            step.type === 'send_email'       ? 'bg-blue-500/10 text-blue-600' :
                            step.type === 'wait'             ? 'bg-muted text-muted-foreground' :
                            step.type === 'condition'        ? 'bg-emerald-500/10 text-emerald-600' :
                            step.type === 'notify_user'      ? 'bg-primary/10 text-primary' :
                            step.type === 'add_tag'          ? 'bg-purple-500/10 text-purple-600' :
                            step.type === 'remove_tag'       ? 'bg-rose-500/10 text-rose-600' :
                            step.type === 'ab_test'          ? 'bg-amber-500/10 text-amber-600' :
                            step.type === 'recommend_prompt' ? 'bg-primary/10 text-primary' :
                            'bg-muted text-muted-foreground'
                          )}>
                            {step.type === 'send_email'       && <Mail className="w-4 h-4" />}
                            {step.type === 'wait'             && <Clock className="w-4 h-4" />}
                            {step.type === 'add_tag'          && <TagIcon className="w-4 h-4" />}
                            {step.type === 'remove_tag'       && <X className="w-4 h-4" />}
                            {step.type === 'notify_user'      && <Bell className="w-4 h-4" />}
                            {step.type === 'condition'        && <GitBranch className="w-4 h-4" />}
                            {step.type === 'recommend_prompt' && <Sparkles className="w-4 h-4" />}
                            {step.type === 'ab_test'          && <Split className="w-4 h-4" />}
                            {step.type === 'webhook'          && <Globe className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground">
                              {step.type === 'send_email' ? 'Send Email' : step.type === 'add_tag' ? 'Add Tag' : step.type === 'remove_tag' ? 'Remove Tag' : step.type === 'notify_user' ? 'Notify User' : step.type === 'recommend_prompt' ? 'AI Recommend' : step.type === 'ab_test' ? 'A/B Test' : step.type.charAt(0).toUpperCase() + step.type.slice(1)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {step.type === 'send_email'       ? (step.params.templateName ? `"${step.params.templateName}"` : 'No template selected') :
                               step.type === 'wait'             ? `Wait ${step.params.duration} ${step.params.unit || 'days'}` :
                               step.type === 'condition'        ? `If ${step.params.field} ${step.params.operator} "${step.params.value}"` :
                               step.type === 'notify_user'      ? (step.params.message || 'Notification alert') :
                               step.type === 'add_tag'          ? (tags.find(t => t.id === step.params.tagId)?.name || 'Select a tag') :
                               step.type === 'remove_tag'       ? (tags.find(t => t.id === step.params.tagId)?.name || 'Select a tag') :
                               step.type === 'ab_test'          ? `Split ${step.params.weight || 50}% / ${100 - (step.params.weight || 50)}%` :
                               step.type === 'recommend_prompt' ? `${step.params.category || 'All'} category` :
                               step.type === 'webhook'          ? (step.params.url || 'No URL set') :
                               'Configure this step'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); removeStep(step.id); }}
                            className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {step.type === 'condition' && (
                          <div className="flex gap-2 mt-3">
                            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-center">
                              <span className="text-[10px] font-bold uppercase text-emerald-600">Yes path</span>
                            </div>
                            <div className="flex-1 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 text-center">
                              <span className="text-[10px] font-bold uppercase text-rose-600">No path</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Connector after this step */}
                      <FlowConnector
                        afterIndex={idx}
                        addMenuTarget={addMenuTarget}
                        onToggle={i => setAddMenuTarget(addMenuTarget === i ? null : i)}
                        onAdd={(type) => addStep(type, idx)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* End node */}
                <div className="w-full flex items-center justify-center py-4 pb-32">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-dashed border-border text-muted-foreground/50">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Flow ends here</span>
                  </div>
                </div>

              </div>
            </div>

            {/* ── Tool palette (top-left) ── */}
            <div
              data-node
              onMouseDown={e => e.stopPropagation()}
              className="absolute top-4 left-4 flex items-center gap-1 bg-card border border-border rounded-xl p-1.5 z-20"
            >
              <button
                type="button"
                title="Select tool (V)"
                onClick={() => setTool('select')}
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-lg transition-all",
                  !spaceHeld && tool === 'select'
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <MousePointer2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Hand tool (H) — or hold Space"
                onClick={() => setTool(tool === 'hand' ? 'select' : 'hand')}
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-lg transition-all",
                  spaceHeld || tool === 'hand'
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Hand className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-border mx-0.5" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 select-none">
                {spaceHeld ? 'SPACE' : tool === 'hand' ? 'H' : 'V'}
              </span>
            </div>

            {/* ── Fixed zoom controls (bottom-right) ── */}
            <div
              data-node
              onMouseDown={e => e.stopPropagation()}
              className="absolute bottom-6 right-6 flex flex-col items-center gap-1 bg-card border border-border rounded-xl p-1.5 z-20"
            >
              <Button onClick={() => applyZoom(1.15, canvasRef.current ? canvasRef.current.clientWidth / 2 : 0, canvasRef.current ? canvasRef.current.clientHeight / 2 : 0)} variant="ghost" size="icon" className="w-8 h-8" title="Zoom In">
                <Plus className="w-4 h-4" />
              </Button>
              <div ref={scaleTextRef} className="text-[10px] font-bold text-muted-foreground tabular-nums w-8 text-center">
                100%
              </div>
              <Button onClick={() => applyZoom(1 / 1.15, canvasRef.current ? canvasRef.current.clientWidth / 2 : 0, canvasRef.current ? canvasRef.current.clientHeight / 2 : 0)} variant="ghost" size="icon" className="w-8 h-8" title="Zoom Out">
                <Minus className="w-4 h-4" />
              </Button>
              <div className="w-6 h-px bg-border my-0.5" />
              <Button onClick={fitToScreen} variant="ghost" size="icon" className="w-8 h-8" title="Fit to screen">
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Drag hint */}
            {(activeFlow.steps?.length ?? 0) === 0 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-full px-4 py-2 pointer-events-none">
                <Hand className="w-3.5 h-3.5 text-muted-foreground/50" />
                <span className="text-[11px] font-medium text-muted-foreground/50">H = hand tool · Space = pan · Scroll = zoom</span>
              </div>
            )}
          </div>

        {/* Sidebar */}
        <div className="w-96 bg-card border-l border-border overflow-hidden flex flex-col">
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
                  <div className="flex items-center gap-2 mb-6">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Available Steps</h3>
                  </div>

                  <div className="space-y-6">
                    <section>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3 px-1">Logic</p>
                      <div className="space-y-2">
                        <NodeCard icon={GitBranch} label="Condition" sub="Basic Branching" onClick={() => addStep('condition')} color="text-emerald-600" bg="bg-emerald-500/10" />
                        <NodeCard icon={Split} label="A/B Split" sub="Traffic Optimization" onClick={() => addStep('ab_test')} color="text-amber-600" bg="bg-amber-500/10" />
                        <NodeCard icon={Clock} label="Delay" sub="Wait Duration" onClick={() => addStep('wait')} color="text-muted-foreground" bg="bg-muted/50" />
                      </div>
                    </section>

                    <section>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3 px-1">Messaging</p>
                      <div className="space-y-2">
                        <NodeCard icon={Mail} label="Send Email" sub="Campaign/Template" onClick={() => addStep('send_email')} color="text-blue-600" bg="bg-blue-500/10" />
                        <NodeCard icon={Bell} label="Notify User" sub="App Notification" onClick={() => addStep('notify_user')} color="text-primary" bg="bg-primary/10" />
                      </div>
                    </section>

                    <section>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3 px-1">AI & Advanced</p>
                      <div className="space-y-2">
                        <NodeCard icon={Sparkles} label="Recommend" sub="AI Prompt Sharing" onClick={() => addStep('recommend_prompt')} color="text-primary" bg="bg-primary/10" />
                        <NodeCard icon={TagIcon} label="Add Tag" sub="Segmentation" onClick={() => addStep('add_tag')} color="text-purple-600" bg="bg-purple-500/10" />
                        <NodeCard icon={X} label="Remove Tag" sub="Clean up tags" onClick={() => addStep('remove_tag')} color="text-rose-600" bg="bg-rose-500/10" />
                        <NodeCard icon={Globe} label="Webhook" sub="External API" onClick={() => addStep('webhook')} color="text-muted-foreground" bg="bg-muted/50" />
                      </div>
                    </section>
                  </div>

                  <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest text-center mt-8">More steps coming soon</p>
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
                      <Card variant="flat" padding="md" className="rounded-lg">
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
                            { label: 'Payment Received', value: 'subscription_payment_received', description: 'Triggered when a payment is successful' },
                            { label: 'Subscription Renewed', value: 'subscription_renewed', description: 'Triggered on auto-renewal billing' },
                            { label: 'Subscription Canceled', value: 'subscription_cancelled', description: 'Triggered when a plan is canceled' },
                            { label: 'Prompt Favorite', value: 'prompt_favorite', description: 'Triggered when a user favorites a prompt' },
                            { label: 'Limit Reached', value: 'limit_reached', description: 'Triggered when usage quotas are met' },
                            { label: 'Affiliate Commission', value: 'affiliate_commison', description: 'Triggered when a commission is earned' }
                          ]}
                        />
                      </Card>

                      {['tag_added', 'tag_remove'].includes(activeFlow.trigger?.type || '') && (
                        <Card variant="flat" padding="md" className="rounded-lg">
                          <label className="block text-xs font-bold uppercase text-muted-foreground mb-4 tracking-widest">Select Tag</label>
                          <Select
                            value={activeFlow.trigger?.value || ''}
                            onChange={val => setActiveFlow({ ...activeFlow, trigger: { ...activeFlow.trigger!, value: val } })}
                            options={[
                              { label: 'Any Tag', value: '' },
                              ...tags.map(t => ({ label: t.name, value: t.id }))
                            ]}
                          />
                        </Card>
                      )}

                      {['list_applied', 'list_removed', 'form_submited'].includes(activeFlow.trigger?.type || '') && (
                        <Card variant="flat" padding="md" className="rounded-lg">
                          <Input
                            label={activeFlow.trigger?.type === 'form_submited' ? 'Form Name' : 'List Name'}
                            type="text"
                            placeholder={activeFlow.trigger?.type === 'form_submited' ? 'e.g. Lead Gen Form' : 'e.g. Newsletter Subscribers'}
                            value={activeFlow.trigger?.value || ''}
                            onChange={e => setActiveFlow({ ...activeFlow, trigger: { ...activeFlow.trigger!, value: e.target.value } })}
                            variant="outline"
                          />
                        </Card>
                      )}
                    </div>
                  )}

                  {selectedStep?.type === 'wait' && (
                      <div className="space-y-6">
                        <Card variant="flat" padding="md" className="rounded-lg">
                          <div className="flex items-end gap-2">
                            <Input
                            label="Wait Duration"
                            type="number"
                            value={selectedStep?.params.duration || 1}
                            onChange={e => updateStep(selectedStepId, { ...selectedStep?.params, duration: parseInt(e.target.value) })}
                            variant="outline"
                            className="w-24"
                          />
                          <Select
                              value={selectedStep?.params.unit || 'days'}
                              onChange={val => updateStep(selectedStepId as string, { ...selectedStep?.params, unit: val })}
                              options={[
                                { label: 'Minutes', value: 'minutes' },
                                { label: 'Hours', value: 'hours' },
                                { label: 'Days', value: 'days' },
                                { label: 'Weeks', value: 'weeks' }
                              ]}
                              isSearchable={false}
                            />
                          </div>
                        </Card>
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground px-2 italic">
                        <Info className="w-3 h-3" />
                        <span>Flow will pause for this duration before continuing.</span>
                      </div>
                    </div>
                  )}

                  {selectedStep?.type === 'send_email' && (
                     <div className="space-y-6">
                      <Card variant="flat" padding="md" className="rounded-lg">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-4">Email Template</label>
                        <Select
                          value={selectedStep?.params.templateId || ''}
                          onChange={val => {
                            const template = templates.find(t => t.id === val);
                            updateStep(selectedStepId as string, {
                              ...selectedStep?.params,
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
                      </Card>

                      {selectedStep?.params.templateId === 'custom' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-4"
                        >
                          <Card variant="flat" padding="md" className="rounded-lg">
                          <Input
                            label="Subject Line"
                            type="text"
                            placeholder="Email subject..."
                            value={selectedStep?.params.customSubject || ''}
                            onChange={e => updateStep(selectedStepId, { ...selectedStep?.params, customSubject: e.target.value })}
                            variant="outline"
                          />
                          </Card>
                          <Card variant="flat" padding="md" className="rounded-lg">
                            <Textarea
                              label="Email Content (HTML)"
                              placeholder="Write your custom email content here..."
                              value={selectedStep?.params.customContent || ''}
                              onChange={e => updateStep(selectedStepId, { ...selectedStep?.params, customContent: e.target.value })}
                              variant="outline"
                              rows={5}
                            />
                          </Card>
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

                  {selectedStep?.type === 'notify_user' && (
                     <div className="space-y-6">
                      <Card variant="flat" padding="md" className="rounded-lg">
                        <Textarea
                          label="Notification Message"
                          placeholder="What message should the user see?"
                          value={selectedStep?.params.message || ''}
                          onChange={e => updateStep(selectedStepId, { ...selectedStep?.params, message: e.target.value })}
                          variant="outline"
                          rows={4}
                        />
                      </Card>
                    </div>
                  )}

                  {selectedStep?.type === 'recommend_prompt' && (
                     <div className="space-y-6">
                      <Card variant="flat" padding="md" className="rounded-lg">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-4 tracking-widest">Recommendation Strategy</label>
                        <Select
                          value={selectedStep?.params.strategy || 'personalized'}
                          onChange={val => updateStep(selectedStepId as string, { ...selectedStep?.params, strategy: val })}
                          options={[
                            { label: 'AI Personalized (Best Match)', value: 'personalized', description: 'Deep learning based relevance' },
                            { label: 'Trending in Category', value: 'trending', description: 'Most popular in the last 24h' },
                            { label: 'New Arrivals', value: 'new_arrivals', description: 'Freshly released content' },
                            { label: "Editor's Pick", value: 'curated', description: 'Manually selected excellence' }
                          ]}
                          isSearchable={false}
                        />
                      </Card>
                      <Card variant="flat" padding="md" className="rounded-lg">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-4 tracking-widest">Target Category</label>
                        <Select
                          value={selectedStep?.params.category || 'all'}
                          onChange={val => updateStep(selectedStepId as string, { ...selectedStep?.params, category: val })}
                          options={[
                            { label: 'All Categories', value: 'all' },
                            { label: 'Creative Writing', value: 'creative' },
                            { label: 'Technical/Coding', value: 'technical' },
                            { label: 'Sales & Marketing', value: 'marketing' }
                          ]}
                        />
                      </Card>
                    </div>
                  )}

                  {selectedStep?.type === 'ab_test' && (
                     <div className="space-y-6">
                      <Card variant="flat" padding="md" className="rounded-lg">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-4 tracking-widest">Traffic Split %</label>
                        <input
                          type="range"
                          min="0" max="100" step="5"
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          value={selectedStep?.params.weight || 50}
                          onChange={e => updateStep(selectedStepId, { ...selectedStep?.params, weight: parseInt(e.target.value) })}
                        />
                        <div className="flex justify-between mt-4 text-xs font-bold uppercase text-muted-foreground">
                          <span>Variant A: {selectedStep?.params.weight || 50}%</span>
                          <span>Variant B: {100 - (selectedStep?.params.weight || 50)}%</span>
                        </div>
                      </Card>
                    </div>
                  )}

                  {selectedStep?.type === 'webhook' && (
                     <div className="space-y-6">
                      <Card variant="flat" padding="md" className="rounded-lg">
                        <Input
                          label="Target URL"
                          type="url"
                          placeholder="https://api.your-system.com/webhook"
                          value={selectedStep?.params.url || ''}
                          onChange={e => updateStep(selectedStepId, { ...selectedStep?.params, url: e.target.value })}
                          variant="outline"
                        />
                      </Card>
                      <Card variant="flat" padding="md" className="rounded-lg">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 tracking-widest">Method</label>
                        <Select
                          value={selectedStep?.params.method || 'POST'}
                          onChange={val => updateStep(selectedStepId as string, { ...selectedStep?.params, method: val })}
                          options={[
                            { label: 'POST', value: 'POST' },
                            { label: 'PUT', value: 'PUT' },
                            { label: 'GET', value: 'GET' }
                          ]}
                          isSearchable={false}
                        />
                      </Card>
                    </div>
                  )}

                  {selectedStep?.type === 'condition' && (
                     <div className="space-y-6">
                      <Card variant="flat" padding="md" className="rounded-lg">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 tracking-widest">Field to Check</label>
                        <Select
                          value={selectedStep?.params.field || 'subscriptionStatus'}
                          onChange={val => updateStep(selectedStepId as string, { ...selectedStep?.params, field: val })}
                          options={[
                            { label: 'Subscription Status', value: 'subscriptionStatus' },
                            { label: 'Tags', value: 'tags' },
                            { label: 'Credits', value: 'credits' },
                            { label: 'Button Click', value: 'button_click' },
                            { label: 'Email Response', value: 'email_response' }
                          ]}
                        />
                      </Card>
                      <Card variant="flat" padding="md" className="rounded-lg">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 tracking-widest">Condition</label>
                        <Select
                          value={selectedStep?.params.operator || 'equals'}
                          onChange={val => updateStep(selectedStepId as string, { ...selectedStep?.params, operator: val })}
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
                      </Card>
                      <Card variant="flat" padding="md" className="rounded-lg">
                        <Input
                          label="Compare Value"
                          type="text"
                          placeholder="Value to compare..."
                          value={selectedStep?.params.value || ''}
                          onChange={e => updateStep(selectedStepId, { ...selectedStep?.params, value: e.target.value })}
                          variant="outline"
                        />
                      </Card>
                    </div>
                  )}

                  {(selectedStep?.type === 'add_tag' || selectedStep?.type === 'remove_tag') && (
                     <div className="space-y-6">
                      <Card variant="flat" padding="md" className="rounded-lg">
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-4 tracking-widest">
                          {selectedStep?.type === 'add_tag' ? 'Select Tag to Apply' : 'Select Tag to Remove'}
                        </label>
                        <Select
                          value={selectedStep?.params.tagId || ''}
                          onChange={val => updateStep(selectedStepId as string, { ...selectedStep?.params, tagId: val })}
                          options={[
                            { label: 'Select a tag...', value: '' },
                            ...tags.map(tag => ({ label: tag.name, value: tag.id }))
                          ]}
                        />
                      </Card>
                    </div>
                  )}

                  {!['trigger', 'wait', 'send_email', 'recommend_prompt', 'ab_test', 'webhook', 'condition', 'add_tag', 'remove_tag', 'notify_user'].includes(selectedStep?.type || (selectedStepId === 'trigger' ? 'trigger' : '')) && (
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
               {(() => {
                 const stats = { recipients: 1240, goalMet: 18, dropped: 4 };
                 return (<>
                 <div className="flex items-center justify-between">
                   <div>
                     <h2 className="text-3xl font-bold text-foreground tracking-tight mb-2">Live Performance: {activeFlow.name}</h2>
                     <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest italic">
                       {(activeFlow as any).createdAt
                         ? `Monitoring since ${new Date((activeFlow as any).createdAt?.seconds ? (activeFlow as any).createdAt.seconds * 1000 : (activeFlow as any).createdAt).toLocaleDateString()}`
                         : 'No live data yet — activate the flow to start collecting stats'}
                     </p>
                   </div>
                   <div className={cn(
                     "px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest flex items-center gap-2",
                     activeFlow.active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                   )}>
                     <span className={cn("w-2 h-2 rounded-full", activeFlow.active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40")} />
                     {activeFlow.active ? 'Live & Active' : 'Inactive'}
                   </div>
                 </div>

                 <div className="grid grid-cols-4 gap-6">
                   <StatCard label="Recipients" value={String(stats.recipients)} icon={Users} color="text-primary" />
                   <StatCard label="Goal Met" value={stats.goalMet + '%'} icon={Award} color="text-emerald-600" />
                   <StatCard label="Dropped" value={stats.dropped + '%'} icon={AlertCircle} color="text-rose-600" />
                   <StatCard label="Avg. Velocity" value="4.2h" icon={Clock} color="text-blue-600" />
                 </div>
                 </>);
               })()}

               <Card padding="lg" className="rounded-lg shadow-none">
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
                         label={`${i+1}. ${step.type.replace(/_/g, ' ')}`}
                         rate={String(Math.max(10, 100 - (i * 12) - Math.floor(Math.random() * 10))) + '%'}
                         color={i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'}
                       />
                    ))}
                    {!activeFlow.steps?.length && (
                      <div className="py-10 text-center text-muted-foreground/40 font-bold uppercase text-xs tracking-widest">No steps to analyze</div>
                    )}
                 </div>
               </Card>

               <div className="grid md:grid-cols-2 gap-8">
                  <Card padding="lg" className="rounded-lg shadow-none">
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-tight mb-8">Audience Segments</h4>
                    <div className="h-48 flex items-center justify-center relative">
                       <div className="w-32 h-32 rounded-full border-[12px] border-border border-t-primary border-r-primary/40 flex items-center justify-center">
                          <div className="text-center">
                             <div className="text-xl font-bold text-foreground">72%</div>
                             <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Mobile</div>
                         </div>
                      </div>
                    </div>
                  </Card>
                  <Card padding="lg" className="rounded-lg shadow-none">
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-tight mb-6 flex items-center justify-between">
                      Recent Entries
                      <span className="text-[8px] font-bold text-primary bg-primary/10 px-2 py-1 rounded">Live</span>
                    </h4>
                    <div className="space-y-4">
                       <ActivityLog user="johndoe@example.com" action="Entered Flow" time="2m ago" />
                       <ActivityLog user="sarah.w@tech.co" action="Waiting @ Step 2" time="15m ago" />
                       <ActivityLog user="mike.r@gmail.com" action="Completed Goal" time="1h ago" />
                    </div>
                  </Card>
               </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) {
  return (
    <Card padding="md" className="rounded-lg shadow-none items-center gap-2">
      <div className={`w-10 h-10 ${color} bg-muted/50 rounded-md flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</div>
    </Card>
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
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 bg-card border border-border rounded-xl p-4 text-left hover:border-primary transition-all group"
    >
      <div className={`w-10 h-10 ${bg} ${color} rounded-lg flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{label}</p>
        <p className="text-xs text-muted-foreground font-medium mt-0.5">{sub}</p>
      </div>
    </button>
  );
}

function ActionButton({ icon: Icon, label, onClick, color }: { icon: any, label: string, onClick: () => void, color: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-muted/60 transition-all group min-w-[56px]"
    >
      <div className={`w-9 h-9 bg-muted/50 border border-border rounded-lg flex items-center justify-center ${color} group-hover:border-current/30 transition-colors`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
    </button>
  );
}

// Vertical connector between nodes with a "+ add step" button in the middle
function FlowConnector({ afterIndex, addMenuTarget, onToggle, onAdd }: {
  afterIndex: number;
  addMenuTarget: number | null;
  onToggle: (idx: number) => void;
  onAdd: (type: any) => void;
}) {
  const isOpen = addMenuTarget === afterIndex;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onToggle(afterIndex);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen]);

  return (
    <div className="flex flex-col items-center w-full relative" style={{ zIndex: isOpen ? 30 : 1 }}>
      {/* Top segment */}
      <div className="w-px h-6 bg-border" />
      {/* + button */}
      <div ref={containerRef}>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onToggle(afterIndex); }}
          className={cn(
            "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
            isOpen
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
          )}
        >
          <Plus className={cn("w-3.5 h-3.5 transition-transform duration-200", isOpen && "rotate-45")} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute left-1/2 -translate-x-1/2 mt-2 bg-card border border-border rounded-2xl p-2 flex gap-1"
              style={{ top: '100%' }}
            >
              <ActionButton icon={Mail}      label="Email"   onClick={() => onAdd('send_email')}       color="text-blue-600" />
              <ActionButton icon={Clock}     label="Delay"   onClick={() => onAdd('wait')}              color="text-muted-foreground" />
              <ActionButton icon={TagIcon}   label="Tag"     onClick={() => onAdd('add_tag')}           color="text-purple-600" />
              <ActionButton icon={GitBranch} label="Split"   onClick={() => onAdd('condition')}         color="text-emerald-600" />
              <ActionButton icon={Bell}      label="Notify"  onClick={() => onAdd('notify_user')}       color="text-primary" />
              <ActionButton icon={Sparkles}  label="AI"      onClick={() => onAdd('recommend_prompt')}  color="text-primary" />
              <ActionButton icon={Globe}     label="Webhook" onClick={() => onAdd('webhook')}           color="text-muted-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Bottom segment */}
      <div className="w-px h-6 bg-border" />
    </div>
  );
}
