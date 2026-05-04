import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { db } from '../../lib/firebase';
import { BlogPost } from '../../types';
import toast from 'react-hot-toast';

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const q = query(collection(db, 'blog_posts'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      setPosts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost)));
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      toast.error("Failed to fetch blog posts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this blog post?")) return;
    
    try {
      await deleteDoc(doc(db, 'blog_posts', id));
      toast.success("Blog post deleted successfully");
      setPosts(posts.filter(p => p.id !== id));
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete blog post");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Blog Posts</h2>
          <p className="text-slate-500">Manage your platform's blog content.</p>
        </div>
        <Link 
          to="/admin/blog/new" 
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Post
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <FileText className="w-12 h-12 text-slate-300 mb-3" />
            <p>No blog posts found. Create your first post!</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-sm font-semibold text-slate-600">Title</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Date</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr key={post.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="p-4">
                    <div className="font-semibold text-slate-800 mb-1">{post.title}</div>
                    <div className="text-xs text-slate-500">/{post.slug}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-500">
                    {post.createdAt ? new Date(post.createdAt.toMillis?.() || Date.now()).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a 
                        href={`/blog/${post.slug}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Post"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <Link 
                        to={`/admin/blog/${post.id}`} 
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button 
                        onClick={() => post.id && handleDelete(post.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete"
                      >
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
