import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { UserProfile } from '../../types';
import { Search, UserCheck, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  try {
    if (date instanceof Timestamp) return date.toDate().toLocaleDateString();
    if (typeof date === 'object' && date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
    const parsed = new Date(date);
    return parsed.toString() !== 'Invalid Date' ? parsed.toLocaleDateString() : 'N/A';
  } catch (err) {
    return 'N/A';
  }
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateUser = async (uid: string, updates: Partial<UserProfile>) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, ...updates } as UserProfile : u));
      toast.success("User updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update user.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Users</h2>
          <p className="text-slate-500 mt-2">Manage platform users, roles, and subscriptions.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">User</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Joined</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading users...</td></tr>
              ) : filteredUsers.map(u => (
                <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-10 h-10 rounded-xl" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-400 uppercase">
                          {u.displayName?.charAt(0) || u.email?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div>
                        <Link to={`/user/${u.uid}`} className="font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                          {u.displayName || 'Unknown User'}
                        </Link>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex flex-col gap-2 items-start">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        u.subscriptionStatus === 'pro' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.subscriptionStatus === 'pro' ? 'PRO PLAN' : 'FREE'}
                      </span>
                      {u.role === 'admin' && (
                        <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600">
                          Admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <p className="text-sm font-medium text-slate-600">{formatDate(u.createdAt)}</p>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleUpdateUser(u.uid, { subscriptionStatus: u.subscriptionStatus === 'pro' ? 'free' : 'pro' })}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Toggle Subscription"
                      >
                        <UserCheck className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleUpdateUser(u.uid, { role: u.role === 'admin' ? 'user' : 'admin' })}
                        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all" title="Toggle Admin"
                      >
                        <Shield className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
