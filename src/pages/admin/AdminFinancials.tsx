import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { UserProfile } from '../../types';
import { CreditCard, Check } from 'lucide-react';

export default function AdminFinancials() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

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

  const proUsers = users.filter(u => u.subscriptionStatus === 'pro').length;
  const estimatedRevenue = proUsers * 15;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900">Financials</h2>
        <p className="text-slate-500 mt-2">Revenue analytics and payment history.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
         <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
           <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6">
             <CreditCard className="w-6 h-6" />
           </div>
           <h4 className="text-4xl font-black">${estimatedRevenue.toFixed(2)}</h4>
           <p className="text-slate-500 text-xs mt-4 font-medium">Estimated Monthly Recurring Revenue (MRR)</p>
         </div>
         <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
           <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
             <CreditCard className="w-6 h-6" />
           </div>
           <h4 className="text-4xl font-black">$15.00</h4>
           <p className="text-slate-500 text-xs mt-4 font-medium">Average Revenue Per User</p>
         </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
        <h3 className="text-xl font-black mb-8">Recent Payments (Simulated)</h3>
        {loading ? (
          <p className="text-slate-500">Loading financials...</p>
        ) : (
          <div className="space-y-4">
            {users.filter(u => u.subscriptionStatus === 'pro').slice(0, 10).map((u, i) => (
              <div key={u.uid + i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-2 rounded-xl text-green-600">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{u.displayName || u.email}</p>
                    <p className="text-xs text-slate-500 font-mono">Pro Plan Subscription</p>
                  </div>
                </div>
                <span className="font-black text-slate-900">+$15.00</span>
              </div>
            ))}
            {proUsers === 0 && <p className="text-slate-500">No active paid subscriptions found.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
