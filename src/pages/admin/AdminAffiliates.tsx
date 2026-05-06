import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, serverTimestamp, Timestamp, addDoc, setDoc } from 'firebase/firestore';
import { UserProfile, Payout } from '../../types';
import { Gift, Award, Check, Percent } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useMarketing } from '../../hooks/useMarketing';

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  try {
    if (date instanceof Timestamp) return date.toDate().toLocaleDateString();
    if (typeof date === 'object' && date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
    return new Date(date).toLocaleDateString();
  } catch {
    return 'N/A';
  }
};

export default function AdminAffiliates() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const { marketingConfig } = useMarketing();
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [newRate, setNewRate] = useState(marketingConfig.referralCommission);

  useEffect(() => {
    setNewRate(marketingConfig.referralCommission);
  }, [marketingConfig.referralCommission]);

  const handleUpdateRate = async () => {
    try {
      await setDoc(doc(db, 'configs', 'marketing'), {
        referralCommission: Number(newRate),
        updatedAt: serverTimestamp()
      }, { merge: true });
      setIsEditingRate(false);
      toast.success("Commission rate updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update rate");
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const uSnap = await getDocs(collection(db, 'users'));
        setUsers(uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleProcessPayout = async (affiliate: UserProfile) => {
    const amount = affiliate.affiliateEarnings || 0;
    if (amount <= 0) return toast.error("No pending earnings");
    if (!confirm(`Mark $${amount} as paid to ${affiliate.email}?`)) return;

    try {
      const payoutData = {
        userId: affiliate.uid,
        userEmail: affiliate.email,
        amount,
        status: 'paid' as const,
        processedAt: serverTimestamp(),
      };
      
      // Save payout record
      await addDoc(collection(db, 'payouts'), payoutData);
      
      await updateDoc(doc(db, 'users', affiliate.uid), {
        affiliateEarnings: 0,
        updatedAt: serverTimestamp()
      });
      
      setUsers(prev => prev.map(u => u.uid === affiliate.uid ? { ...u, affiliateEarnings: 0 } : u));
      setPayouts(prev => [{ id: 'temp-' + Date.now(), ...payoutData } as any, ...prev]);
      toast.success("Payout processed successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to process payout.");
    }
  };

  const affiliates = users.filter(u => (u.referralsCount && u.referralsCount > 0) || (u.affiliateEarnings && u.affiliateEarnings > 0));

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Affiliate Program</h2>
          <p className="text-slate-500 mt-2">Manage referral earnings and process affiliate payouts.</p>
        </div>
        
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-sm min-w-[280px]">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <Percent className="w-5 h-5 text-white" />
          </div>
          <div className="flex-grow">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Current Rate</p>
            {isEditingRate ? (
              <div className="flex items-center gap-2 mt-1">
                <input 
                  type="number"
                  value={newRate}
                  onChange={e => setNewRate(Number(e.target.value))}
                  className="w-16 bg-white border border-indigo-200 rounded-lg px-2 py-1 text-sm font-black text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  onClick={handleUpdateRate}
                  className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <p className="text-xl font-black text-indigo-900">{marketingConfig.referralCommission}% Commission</p>
                <button 
                  onClick={() => setIsEditingRate(true)}
                  className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 underline transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Affiliate</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Referrals</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Unpaid Earnings</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading affiliates...</td></tr>
              ) : affiliates.map(affiliate => (
                <tr key={affiliate.uid} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <Link to={`/user/${affiliate.uid}`} className="font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                          {affiliate.displayName || 'Unknown User'}
                        </Link>
                        <p className="text-xs text-slate-500">{affiliate.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <span className="font-black text-slate-900">{affiliate.referralsCount || 0}</span>
                  </td>
                  <td className="px-8 py-4">
                    <span className="font-black text-green-600">${(affiliate.affiliateEarnings || 0).toFixed(2)}</span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    {(affiliate.affiliateEarnings || 0) > 0 ? (
                      <button 
                        onClick={() => handleProcessPayout(affiliate)}
                        className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-md"
                      >
                        Mark as Paid
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 font-bold bg-slate-100 px-3 py-1.5 rounded-lg">All Paid</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && affiliates.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 font-bold">No affiliates have earned commissions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
