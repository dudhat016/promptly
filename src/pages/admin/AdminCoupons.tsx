import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { CheckCircle, Copy, Edit2, Plus, RefreshCw, Tag, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AdminPageHeader, useConfirm } from '../../components/admin';
import Badge from '../../components/primitives/Badge';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import Input from '../../components/primitives/Input';
import { auth, db } from '../../lib/firebase';

interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  maxUses: number | null;
  usedCount: number;
  planIds: string[];
  description: string;
  expiresAt: any;
  active: boolean;
  createdAt: any;
}

interface Plan {
  id: string;
  name: string;
}

interface CouponForm {
  code: string;
  type: 'percent' | 'fixed';
  value: string;
  maxUses: string;
  expiresAt: string;
  description: string;
  planIds: string[];
}

const DEFAULT_FORM: CouponForm = {
  code: '', type: 'percent', value: '', maxUses: '', expiresAt: '', description: '', planIds: [],
};

async function authFetch(url: string, opts: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
}

function formatExpiry(ts: any): string {
  try { return ts?.toDate ? ts.toDate().toLocaleDateString() : new Date(ts).toLocaleDateString(); }
  catch { return 'Never'; }
}

function isExpired(ts: any): boolean {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d < new Date();
  } catch { return false; }
}

export default function AdminCoupons() {
  const [coupons, setCoupons]   = useState<Coupon[]>([]);
  const [plans, setPlans]       = useState<Plan[]>([]);
  const [loading, setLoading]   = useState(true);
  const [formMode, setFormMode] = useState<'none' | 'create' | 'edit'>('none');
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState<CouponForm>(DEFAULT_FORM);
  const [saving, setSaving]     = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    fetchCoupons();
    loadPlans();
  }, []);

  async function fetchCoupons() {
    setLoading(true);
    try {
      const res = await authFetch('/api/coupons');
      const data = await res.json();
      setCoupons(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load coupons'); }
    finally { setLoading(false); }
  }

  async function loadPlans() {
    try {
      const snap = await getDocs(query(collection(db, 'plans'), orderBy('monthlyPrice', 'asc')));
      setPlans(snap.docs.map(d => ({ id: d.id, name: (d.data() as any).name })));
    } catch { /* non-blocking */ }
  }

  function openCreate() {
    setForm(DEFAULT_FORM);
    setEditId(null);
    setFormMode('create');
  }

  function openEdit(c: Coupon) {
    setForm({
      code:        c.code,
      type:        c.type,
      value:       String(c.value),
      maxUses:     c.maxUses ? String(c.maxUses) : '',
      expiresAt:   c.expiresAt ? (() => { try { const d = c.expiresAt?.toDate ? c.expiresAt.toDate() : new Date(c.expiresAt); return d.toISOString().split('T')[0]; } catch { return ''; } })() : '',
      description: c.description || '',
      planIds:     c.planIds || [],
    });
    setEditId(c.id);
    setFormMode('edit');
  }

  function closeForm() {
    setFormMode('none');
    setEditId(null);
    setForm(DEFAULT_FORM);
  }

  function togglePlanId(planId: string) {
    setForm(f => ({
      ...f,
      planIds: f.planIds.includes(planId) ? f.planIds.filter(p => p !== planId) : [...f.planIds, planId],
    }));
  }

  async function handleCreate() {
    if (!form.code.trim() || !form.value) { toast.error('Code and value are required'); return; }
    setSaving(true);
    try {
      const res = await authFetch('/api/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code:        form.code.trim().toUpperCase(),
          type:        form.type,
          value:       parseFloat(form.value),
          maxUses:     form.maxUses ? parseInt(form.maxUses) : null,
          expiresAt:   form.expiresAt || null,
          description: form.description,
          planIds:     form.planIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Coupon ${data.code} created`);
      closeForm();
      fetchCoupons();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleEdit() {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/coupons/${editId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          maxUses:     form.maxUses ? parseInt(form.maxUses) : null,
          expiresAt:   form.expiresAt || null,
          description: form.description,
          planIds:     form.planIds,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Coupon updated');
      closeForm();
      fetchCoupons();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleToggle(coupon: Coupon) {
    try {
      const res = await authFetch(`/api/coupons/${coupon.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !coupon.active }),
      });
      if (!res.ok) throw new Error('Failed');
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, active: !coupon.active } : c));
    } catch { toast.error('Failed to update coupon'); }
  }

  async function handleDelete(coupon: Coupon) {
    const ok = await confirm({
      title: `Delete coupon ${coupon.code}?`,
      description: 'This cannot be undone. Existing orders that used this coupon are unaffected.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await authFetch(`/api/coupons/${coupon.id}`, { method: 'DELETE' });
      setCoupons(prev => prev.filter(c => c.id !== coupon.id));
      toast.success('Coupon deleted');
    } catch { toast.error('Failed to delete coupon'); }
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const activeCoupons      = coupons.filter(c => c.active);
  const totalRedemptions   = coupons.reduce((s, c) => s + (c.usedCount || 0), 0);
  const isEditing          = formMode === 'edit';

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Revenue"
        labelIcon={Tag}
        title="Coupons"
        subtitle="Create and manage discount codes for your checkout."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={RefreshCw} onClick={fetchCoupons}>Refresh</Button>
            <Button variant="primary" size="sm" leftIcon={Plus} onClick={openCreate}>New Coupon</Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Coupons',     value: coupons.length },
          { label: 'Active',            value: activeCoupons.length },
          { label: 'Total Redemptions', value: totalRedemptions },
        ].map(s => (
          <Card key={s.label} padding="sm">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-2xl font-black text-foreground">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Create / Edit form */}
      {formMode !== 'none' && (
        <Card className="!rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
              {isEditing ? `Edit Coupon — ${form.code}` : 'New Coupon'}
            </h3>
            <Button variant="ghost" size="icon" onClick={closeForm} className="w-7 h-7">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code"
              id="coupon-code"
              name="code"
              placeholder="e.g. LAUNCH20"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              variant="filled"
              disabled={isEditing}
            />

            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Type</p>
              <div className="flex gap-2">
                {(['percent', 'fixed'] as const).map(t => (
                  <Button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    variant={form.type === t ? 'primary' : 'outline'}
                    size="sm"
                    className="flex-1"
                    disabled={isEditing}
                  >
                    {t === 'percent' ? '% Percent' : '$ Fixed'}
                  </Button>
                ))}
              </div>
            </div>

            <Input
              label={form.type === 'percent' ? 'Discount (%)' : 'Discount Amount ($)'}
              id="coupon-value"
              name="value"
              type="number"
              placeholder={form.type === 'percent' ? '20' : '10.00'}
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              variant="filled"
              disabled={isEditing}
            />

            <Input
              label="Max Uses (blank = unlimited)"
              id="coupon-maxuses"
              name="maxUses"
              type="number"
              placeholder="e.g. 100"
              value={form.maxUses}
              onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
              variant="filled"
            />

            <Input
              label="Expires At (optional)"
              id="coupon-expiry"
              name="expiresAt"
              type="date"
              value={form.expiresAt}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
              variant="filled"
            />

            <Input
              label="Description (shown to user)"
              id="coupon-desc"
              name="description"
              placeholder="e.g. Launch offer — 20% off"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              variant="filled"
            />
          </div>

          {/* Plan restriction */}
          {plans.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                Restrict to Plans <span className="font-normal normal-case">(leave blank = all plans)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {plans.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlanId(p.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                      form.planIds.includes(p.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={isEditing ? handleEdit : handleCreate}
              isLoading={saving}
              leftIcon={isEditing ? Edit2 : Plus}
            >
              {isEditing ? 'Save Changes' : 'Create Coupon'}
            </Button>
            <Button variant="ghost" size="sm" onClick={closeForm}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Coupons table */}
      <Card className="!rounded-2xl" padding="none">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground animate-pulse font-bold text-sm">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-bold text-muted-foreground">No coupons yet. Create one to offer discounts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-4">Code</th>
                  <th className="px-5 py-4">Discount</th>
                  <th className="px-5 py-4">Plans</th>
                  <th className="px-5 py-4">Uses</th>
                  <th className="px-5 py-4">Expires</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map(c => {
                  const usagePct = c.maxUses ? Math.min(100, Math.round((c.usedCount / c.maxUses) * 100)) : null;
                  const expired  = c.expiresAt && isExpired(c.expiresAt);
                  const limitHit = c.maxUses != null && c.usedCount >= c.maxUses;
                  const restrictedPlans = plans.filter(p => c.planIds?.includes(p.id));

                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      {/* Code */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-foreground text-sm">{c.code}</span>
                          <Button variant="ghost" size="icon" onClick={() => copyCode(c.code, c.id)} className="w-6 h-6">
                            {copiedId === c.id
                              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                        {c.description && <p className="text-xs text-muted-foreground mt-0.5 max-w-[180px] truncate">{c.description}</p>}
                      </td>

                      {/* Discount */}
                      <td className="px-5 py-4">
                        <span className="font-black text-primary text-base">
                          {c.type === 'percent' ? `${c.value}%` : `$${c.value.toFixed(2)}`}
                        </span>
                        <p className="text-[10px] text-muted-foreground uppercase">{c.type}</p>
                      </td>

                      {/* Plans */}
                      <td className="px-5 py-4">
                        {restrictedPlans.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {restrictedPlans.map(p => (
                              <span key={p.id} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                {p.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">All plans</span>
                        )}
                      </td>

                      {/* Uses */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground text-sm">{c.usedCount || 0}</span>
                          {c.maxUses && <span className="text-muted-foreground text-xs">/ {c.maxUses}</span>}
                        </div>
                        {usagePct !== null && (
                          <div className="mt-1.5 h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${usagePct >= 100 ? 'bg-rose-500' : usagePct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${usagePct}%` }}
                            />
                          </div>
                        )}
                        {limitHit && <p className="text-[10px] text-amber-500 font-bold mt-0.5">Limit reached</p>}
                      </td>

                      {/* Expires */}
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium ${expired ? 'text-rose-500' : 'text-muted-foreground'}`}>
                          {c.expiresAt ? formatExpiry(c.expiresAt) : 'Never'}
                        </span>
                        {expired && <p className="text-[10px] text-rose-500 font-bold">Expired</p>}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <Badge variant={c.active && !expired && !limitHit ? 'success' : 'default'} size="sm" dot>
                          {expired ? 'Expired' : limitHit ? 'Exhausted' : c.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(c)}
                            title="Edit"
                            className="w-7 h-7 hover:text-primary hover:bg-primary/10"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggle(c)}
                            title={c.active ? 'Deactivate' : 'Activate'}
                            className="w-7 h-7"
                          >
                            {c.active
                              ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                              : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(c)}
                            title="Delete"
                            className="w-7 h-7 hover:text-rose-500 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
