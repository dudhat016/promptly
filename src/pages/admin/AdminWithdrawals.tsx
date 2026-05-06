import { collection, getDocs, orderBy, query, updateDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import { 
  Check, 
  Clock, 
  DollarSign, 
  ExternalLink, 
  Search, 
  ShieldCheck, 
  X,
  CreditCard,
  User,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';

export default function AdminWithdrawals() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('pending');

  useEffect(() => {
    fetchPayouts();
  }, [filter]);

  async function fetchPayouts() {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'payouts'),
        orderBy('requestedAt', 'desc')
      );

      if (filter !== 'all') {
        q = query(
          collection(db, 'payouts'),
          where('status', '==', filter),
          orderBy('requestedAt', 'desc')
        );
      }

      const snap = await getDocs(q);
      setPayouts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching payouts:", err);
      toast.error("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }

  const handleStatusUpdate = async (payoutId: string, newStatus: 'completed' | 'rejected', userId: string, amount: number) => {
    try {
      // 1. Update Payout Record
      await updateDoc(doc(db, 'payouts', payoutId), {
        status: newStatus,
        processedAt: serverTimestamp()
      });

      // 2. If rejected, we might want to refund the balance (logic depends on if we subtract on request)
      // For now, we assume simple approval flow
      
      toast.success(`Payout ${newStatus} successfully!`);
      fetchPayouts();
    } catch (err) {
      console.error("Update Error:", err);
      toast.error("Failed to update status");
    }
  };

  const filteredPayouts = payouts.filter(p => 
    p.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.userId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-600 font-black uppercase tracking-[0.2em] text-xs">
            <ShieldCheck className="w-4 h-4" />
            Financial Governance
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Withdrawals</h1>
          <p className="text-slate-500 font-medium">Review and process creator payout requests.</p>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pending Requests</p>
          <h3 className="text-3xl font-black text-slate-900">{payouts.filter(p => p.status === 'pending').length}</h3>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Paid Out</p>
          <h3 className="text-3xl font-black text-indigo-600">${payouts.filter(p => p.status === 'completed').reduce((acc, p) => acc + Number(p.amount || 0), 0)}.00</h3>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Average Payout</p>
          <h3 className="text-3xl font-black text-slate-900">${payouts.length > 0 ? Math.round(payouts.reduce((acc, p) => acc + Number(p.amount || 0), 0) / payouts.length) : 0}.00</h3>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-[3rem] p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by user email or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all outline-none font-bold"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {(['all', 'pending', 'completed', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex-grow md:flex-none px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${filter === s ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">
                <th className="p-8">Requested At</th>
                <th className="p-8">Creator</th>
                <th className="p-8">Amount</th>
                <th className="p-8">Payout Method</th>
                <th className="p-8">Status</th>
                <th className="p-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Payouts...</p>
                  </td>
                </tr>
              ) : filteredPayouts.length > 0 ? (
                filteredPayouts.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="p-8">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <Clock className="w-3 h-3" />
                        {p.requestedAt?.toDate().toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xs font-black text-slate-400">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-black text-slate-900 truncate">{p.userEmail}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter truncate">{p.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-indigo-600" />
                        <span className="text-xl font-black text-slate-900">{p.amount}.00</span>
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="space-y-1">
                        {p.payoutMethod?.upiId && (
                          <p className="text-xs font-bold text-slate-600 flex items-center gap-2">
                            <span className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-widest">UPI</span>
                            {p.payoutMethod.upiId}
                          </p>
                        )}
                        {p.payoutMethod?.paypalEmail && (
                          <p className="text-xs font-bold text-slate-600 flex items-center gap-2">
                            <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase tracking-widest">PayPal</span>
                            {p.payoutMethod.paypalEmail}
                          </p>
                        )}
                        {!p.payoutMethod?.upiId && !p.payoutMethod?.paypalEmail && (
                          <p className="text-xs font-bold text-amber-600 flex items-center gap-2">
                            <AlertCircle className="w-3 h-3" />
                            No payout method saved
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-8">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        p.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        p.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-8 text-right">
                      {p.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleStatusUpdate(p.id, 'completed', p.userId, p.amount)}
                            className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                            title="Mark as Paid"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(p.id, 'rejected', p.userId, p.amount)}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                            title="Reject Request"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-8 h-8 text-slate-200" />
                    </div>
                    <h3 className="font-black text-slate-900 mb-1">No withdrawal requests</h3>
                    <p className="text-sm text-slate-400 font-medium">Any new requests from creators will appear here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
