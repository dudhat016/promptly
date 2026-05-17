import {
  addDoc, collection, doc, getDoc, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { Medal, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AdminPageHeader } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';
import Select from '../../components/primitives/Select';
import Textarea from '../../components/primitives/Textarea';
import { db } from '../../lib/firebase';
import { BADGE_COLOR_PRESETS, BADGE_ICON_MAP } from '../../lib/badges';
import { usePath } from '../../hooks/usePath';
import { BadgeDefinition } from '../../types';
import { cn } from '../../lib/utils';

const CONDITION_OPTIONS: { label: string; value: BadgeDefinition['conditionType']; description: string }[] = [
  { label: 'Premium unlocks ≥ N',    value: 'unlocks',          description: 'User unlocked at least N premium prompts' },
  { label: 'Power unlocks ≥ N',      value: 'power_unlocks',    description: 'Higher unlock threshold variant' },
  { label: 'Prompts submitted ≥ N',  value: 'prompts',          description: 'User submitted N or more prompts to marketplace' },
  { label: 'Total views ≥ N',        value: 'views',            description: 'Sum of views across all user prompts' },
  { label: 'Following ≥ N creators', value: 'following',        description: 'User is following at least N creators' },
  { label: 'Login streak ≥ N days',  value: 'streak',           description: 'Consecutive daily login streak' },
  { label: 'Referrals ≥ N',          value: 'referrals',        description: 'User referred at least N new users' },
  { label: 'Has Pro subscription',   value: 'subscription_pro', description: 'User is currently on Pro plan (threshold ignored)' },
  { label: 'Joined before date',     value: 'early_adopter',    description: 'Threshold = Unix ms cutoff (e.g. 1748736000000 for 2025-06-01)' },
  { label: 'Manual award only',      value: 'manual',           description: 'Never auto-awarded; granted explicitly by admin' },
];

const ICON_NAMES = Object.keys(BADGE_ICON_MAP);

const empty: Omit<BadgeDefinition, 'id' | 'createdAt'> = {
  name: '',
  description: '',
  iconName: 'Star',
  colorClass: BADGE_COLOR_PRESETS[0].value,
  hint: '',
  conditionType: 'prompts',
  conditionThreshold: 1,
  isActive: true,
  order: 0,
};

export default function AdminBadgeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prefix } = usePath();
  const isNew = !id || id === 'new';

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Omit<BadgeDefinition, 'id' | 'createdAt'>>(empty);

  useEffect(() => {
    if (isNew) return;
    async function load() {
      const snap = await getDoc(doc(db, 'badges', id!));
      if (snap.exists()) {
        const data = snap.data() as BadgeDefinition;
        setForm({
          name: data.name,
          description: data.description,
          iconName: data.iconName,
          colorClass: data.colorClass,
          hint: data.hint,
          conditionType: data.conditionType,
          conditionThreshold: data.conditionThreshold,
          isActive: data.isActive,
          order: data.order,
        });
      }
    }
    load();
  }, [id, isNew]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.hint.trim()) e.hint = 'Hint is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (!isNew) {
        await updateDoc(doc(db, 'badges', id!), { ...form });
        toast.success('Badge updated');
      } else {
        await addDoc(collection(db, 'badges'), { ...form, createdAt: serverTimestamp() });
        toast.success('Badge created');
      }
      navigate(prefix('/admin/badges'));
    } catch {
      toast.error('Failed to save badge');
    } finally {
      setSaving(false);
    }
  };

  const SelectedIcon = BADGE_ICON_MAP[form.iconName] ?? BADGE_ICON_MAP['Star'];
  const needsThreshold = form.conditionType !== 'subscription_pro' && form.conditionType !== 'manual';

  return (
    <>
      <AdminPageHeader
        label="Marketplace"
        labelIcon={Medal}
        title={isNew ? 'Create Badge' : 'Edit Badge'}
        subtitle="Define the appearance, earn condition, and display order for this badge."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Form card ── */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-8">
          <form onSubmit={handleSave} className="space-y-6">

            {/* Name + Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Badge Name"
                id="badge-name"
                name="name"
                value={form.name}
                onChange={e => { set('name', e.target.value); if (errors.name) setErrors(p => ({ ...p, name: '' })); }}
                error={errors.name}
                placeholder="e.g. Power Prompter"
              />
              <Input
                label="Display Order"
                id="badge-order"
                name="order"
                type="number"
                value={String(form.order)}
                onChange={e => set('order', Number(e.target.value))}
                placeholder="0"
              />
            </div>

            <Textarea
              label="Description"
              id="badge-desc"
              name="description"
              rows={2}
              value={form.description}
              onChange={e => { set('description', e.target.value); if (errors.description) setErrors(p => ({ ...p, description: '' })); }}
              error={errors.description}
              placeholder="Short text shown when the badge is earned (e.g. Unlocked 10+ premium prompts)"
              variant="outline"
            />

            <Input
              label="Hint (shown when locked)"
              id="badge-hint"
              name="hint"
              value={form.hint}
              onChange={e => { set('hint', e.target.value); if (errors.hint) setErrors(p => ({ ...p, hint: '' })); }}
              error={errors.hint}
              placeholder="e.g. Unlock 10 premium prompts"
            />

            {/* Condition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Select
                id="condition-type"
                label="Condition Type"
                value={form.conditionType}
                onChange={v => set('conditionType', v as BadgeDefinition['conditionType'])}
                options={CONDITION_OPTIONS}
                isSearchable={false}
              />
              {needsThreshold && (
                <div>
                  <Input
                    label={form.conditionType === 'early_adopter' ? 'Cutoff Date (Unix ms)' : 'Threshold (N)'}
                    id="badge-threshold"
                    name="threshold"
                    type="number"
                    value={String(form.conditionThreshold)}
                    onChange={e => set('conditionThreshold', Number(e.target.value))}
                    placeholder={form.conditionType === 'early_adopter' ? '1748736000000' : '1'}
                  />
                  {form.conditionType === 'early_adopter' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      e.g. 1748736000000 = 2025-06-01 UTC
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Icon picker */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Icon</p>
              <div className="grid grid-cols-10 gap-1.5">
                {ICON_NAMES.map(name => {
                  const Icon = BADGE_ICON_MAP[name];
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => set('iconName', name)}
                      title={name}
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center border transition-colors',
                        form.iconName === name
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color theme */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Color Theme</p>
              <div className="flex flex-wrap gap-2">
                {BADGE_COLOR_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => set('colorClass', preset.value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                      form.colorClass === preset.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/30'
                    )}
                  >
                    <span className={cn('w-3 h-3 rounded-full flex-shrink-0', preset.preview)} />
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
              <div>
                <p className="text-sm font-semibold text-foreground">Active</p>
                <p className="text-xs text-muted-foreground mt-0.5">Inactive badges won't be auto-awarded to users</p>
              </div>
              <button
                type="button"
                onClick={() => set('isActive', !form.isActive)}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
                  form.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                )}
              >
                <span className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                  form.isActive ? 'translate-x-6' : 'translate-x-1'
                )} />
              </button>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-border flex gap-3">
              <Button type="submit" isLoading={saving} size="lg" fullWidth leftIcon={Save} className="font-bold">
                {saving ? 'Saving…' : isNew ? 'Create Badge' : 'Save Changes'}
              </Button>
              <Button
                as={Link}
                to={prefix('/admin/badges')}
                variant="secondary"
                size="lg"
                className="px-8 font-bold"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>

        {/* ── Preview card ── */}
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Live Preview</p>

            {/* Earned state */}
            <div className="mb-6">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Earned</p>
              <div className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border w-24',
                form.colorClass
              )}>
                <SelectedIcon className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-center leading-tight">
                  {form.name || 'Name'}
                </span>
              </div>
            </div>

            {/* Locked state */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Locked</p>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-muted/30 text-muted-foreground/30 grayscale w-24">
                <SelectedIcon className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-center leading-tight">
                  {form.name || 'Name'}
                </span>
              </div>
            </div>

            {/* Metadata */}
            <div className="mt-6 space-y-2 text-xs text-muted-foreground border-t border-border pt-4">
              <p><span className="font-semibold text-foreground">Description: </span>{form.description || '—'}</p>
              <p><span className="font-semibold text-foreground">Hint: </span>{form.hint || '—'}</p>
              <p><span className="font-semibold text-foreground">Condition: </span>
                {CONDITION_OPTIONS.find(o => o.value === form.conditionType)?.label ?? form.conditionType}
                {needsThreshold && <span className="ml-1 font-bold text-primary">({form.conditionThreshold})</span>}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
