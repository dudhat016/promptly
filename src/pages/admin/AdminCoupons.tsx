import { useState, useEffect } from 'react';
import { auth } from '../../lib/firebase';
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Copy, CheckCircle, RefreshCw } from 'lucide-react';
import { AdminPageHeader, useConfirm } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';
import Badge from '../../components/primitives/Badge';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

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

interface CouponForm {
  code: string;
  type: 'percent' | 'fixed';
  value: string;
  maxUses: string;
  expiresAt: string;
  description: string;
}

const DEFAULT_FORM: CouponForm = { code: '', type: 'percent', value: '', maxUses: '', expiresAt: '', description: '' };

async function authFetch(url: string, opts: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
  });
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CouponForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const confirm = useConfirm();

  useEffect(() => { fetchCoupons(); }, []);

  async function fetchCoupons() {
    setLoading(true);
    try {
      const res = await authFetch('/api/coupons');
      const data = await res.json();
      setCoupons(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load coupons'); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!form.code.trim() || !form.value) { toast.error('Code and value are required'); return; }
    setSaving(true);
    try {
      const res = await authFetch('/api/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          type: form.type,
          value: parseFloat(form.value),
          maxUses: form.maxUses ? parseInt(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
          description: form.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Coupon ${data.code} created`);
      setForm(DEFAULT_FORM);
      setShowForm(false);
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
    const ok = await confirm({ title: `Delete coupon ${coupon.code}?`, description: 'This cannot be undone.', confirmLabel: 'Delete', destructive: true });
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

  const formatExpiry = (ts: any) => {
    try { return ts?.toDate ? ts.toDate().toLocaleDateString() : new Date(ts).toLocaleDateString(); }
    catch { return 'Never'; }
  };

  const activeCoupons = coupons.filter(c => c.active);
  const totalRedemptions = coupons.reduce((s, c) => s + (c.usedCount || 0), 0);

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
            <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => setShowForm(v => !v)}>New Coupon</Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Coupons', value: coupons.length },
          { label: 'Active', value: activeCoupons.length },
          { label: 'Total Redemptions', value: totalRedemptions },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-2xl font-black text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground">New Coupon</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Code" id="coupon-code" name="code" placeholder="e.g. LAUNCH20" value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} variant="filled" />
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Type</p>
              <div className="flex gap-2">
                {(['percent', 'fixed'] as const).map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={cn('flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all', form.type === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50')}>
                    {t === 'percent' ? '% Percent' : '₹ Fixed'}
                  </button>
                ))}
              </div>
            </div>
            <Input label={form.type === 'percent' ? 'Discount (%)' : 'Discount Amount (₹)'} id="coupon-value" name="value"
              type="number" placeholder={form.type === 'percent' ? '20' : '100'} value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))} variant="filled" />
            <Input label="Max Uses (blank = unlimited)" id="coupon-maxuses" name="maxUses" type="number"
              placeholder="e.g. 100" value={form.maxUses}
              onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} variant="filled" />
            <Input label="Expires At (optional)" id="coupon-expiry" name="expiresAt" type="date"
              value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} variant="filled" />
            <Input label="Description (shown to user)" id="coupon-desc" name="description"
              placeholder="e.g. Launch offer — 20% off" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} variant="filled" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="primary" size="sm" onClick={handleCreate} isLoading={saving} leftIcon={Plus}>
              Create Coupon
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setForm(DEFAULT_FORM); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Coupons table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground animate-pulse font-bold text-sm">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-bold text-muted-foreground">No coupons yet. Create one to offer discounts.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <th className="px-5 py-4">Code</th>
                <th className="px-5 py-4">Discount</th>
                <th className="px-5 py-4">Uses</th>
                <th className="px-5 py-4">Expires</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons.map(c => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-foreground text-sm">{c.code}</span>
                      <button onClick={() => copyCode(c.code, c.id)} className="text-muted-foreground hover:text-primary transition-colors">
                        {copiedId === c.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-black text-primary text-base">
                      {c.type === 'percent' ? `${c.value}%` : `₹${c.value}`}
                    </span>
                    <p className="text-[10px] text-muted-foreground uppercase">{c.type}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-bold text-foreground text-sm">{c.usedCount || 0}</span>
                    {c.maxUses && <span className="text-muted-foreground text-xs"> / {c.maxUses}</span>}
                    {c.maxUses && c.usedCount >= c.maxUses && (
                      <p className="text-[10px] text-amber-500 font-bold">Limit reached</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">{c.expiresAt ? formatExpiry(c.expiresAt) : 'Never'}</td>
                  <td className="px-5 py-4">
                    <Badge variant={c.active ? 'success' : 'default'} size="sm" dot>{c.active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggle(c)} title={c.active ? 'Deactivate' : 'Activate'}
                        className="text-muted-foreground hover:text-primary transition-colors">
                        {c.active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => handleDelete(c)} title="Delete"
                        className="text-muted-foreground hover:text-rose-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
