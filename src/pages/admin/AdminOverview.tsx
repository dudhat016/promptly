import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { ArrowUpRight, BarChart3, Eye, LayoutGrid, Star, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../lib/firebase';

function StatBox({ label, value, sub, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-6">
      <div className={`w-16 h-16 ${bg} ${color} rounded-2xl flex items-center justify-center shrink-0`}>
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-400 mb-1">{label}</p>
        <h3 className="text-3xl font-black text-slate-900">{value}</h3>
        {sub && <p className="text-xs font-bold mt-2 text-indigo-600 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> {sub}</p>}
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPrompts: 0,
    proUsers: 0,
    totalCopies: 0,
    totalViews: 0,
    estimatedRevenue: 0,
    newUsersWeek: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [topPrompts, setTopPrompts] = useState<any[]>([]);

  useEffect(() => {
    // Real-time Users Listener (Gap #3)
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      let proCount = 0;
      let newThisWeek = 0;
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const users = snapshot.docs.map(d => {
        const data = d.data();
        if (data.subscriptionStatus === 'pro') proCount++;
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        if (createdAt > sevenDaysAgo) newThisWeek++;
        return { id: d.id, ...data };
      });

      setStats(prev => ({
        ...prev,
        totalUsers: snapshot.size,
        proUsers: proCount,
        newUsersWeek: newThisWeek,
        estimatedRevenue: proCount * 15
      }));

      // Sort and set recent users
      const sortedUsers = [...users].sort((a: any, b: any) => 
        (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      setRecentUsers(sortedUsers.slice(0, 5));
      setLoading(false);
    });

    // Real-time Prompts Listener (Gap #3)
    const unsubscribePrompts = onSnapshot(collection(db, 'prompts'), (snapshot) => {
      let totalCopies = 0;
      let totalViews = 0;

      const prompts = snapshot.docs.map(d => {
        const data = d.data();
        totalCopies += data.copiesCount || 0;
        totalViews += data.viewsCount || 0;
        return { id: d.id, ...data };
      });

      setStats(prev => ({
        ...prev,
        totalPrompts: snapshot.size,
        totalCopies,
        totalViews
      }));

      const sortedPrompts = [...prompts].sort((a: any, b: any) => 
        (b.viewsCount || 0) - (a.viewsCount || 0)
      );
      setTopPrompts(sortedPrompts.slice(0, 3));
    });

    return () => {
      unsubscribeUsers();
      unsubscribePrompts();
    };
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-bold">Loading dashboard statistics...</div>;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Platform Overview</h2>
          <p className="text-slate-500 mt-2">Key metrics and recent activity across your system.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatBox label="Total Users" value={stats.totalUsers} sub={`+${stats.newUsersWeek} this week`} icon={Users} color="text-indigo-600" bg="bg-indigo-50" />
        <StatBox label="Pro Subscribers" value={stats.proUsers} sub="Recurring revenue" icon={Star} color="text-amber-600" bg="bg-amber-50" />
        <StatBox label="Total Copies" value={stats.totalCopies} sub="User engagement" icon={LayoutGrid} color="text-emerald-600" bg="bg-emerald-50" />
        <StatBox label="Platform Views" value={stats.totalViews} sub="Visibility" icon={BarChart3} color="text-rose-600" bg="bg-rose-50" />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Signups */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900">Recent Signups</h3>
            <Link to="/admin/users" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View All Users</Link>
          </div>
          <div className="space-y-4">
            {recentUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold uppercase text-sm">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{user.displayName || 'Unknown User'}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.email}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                  user.subscriptionStatus === 'pro' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {user.subscriptionStatus === 'pro' ? 'PRO' : 'FREE'}
                </span>
              </div>
            ))}
            {recentUsers.length === 0 && <p className="text-slate-500 text-sm">No recent users found.</p>}
          </div>
        </div>

        {/* Popular Prompts */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900">Top Performing Prompts</h3>
            <Link to="/admin/prompts" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Analytics</Link>
          </div>
          <div className="space-y-4">
            {topPrompts.map(prompt => (
              <div key={prompt.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">{prompt.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {prompt.viewsCount || 0}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <LayoutGrid className="w-3 h-3" /> {prompt.copiesCount || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <Link to={`/prompts/${prompt.id}`} className="p-2 bg-white rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:text-indigo-600">
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
            {topPrompts.length === 0 && <p className="text-slate-500 text-sm">No analytics data yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
