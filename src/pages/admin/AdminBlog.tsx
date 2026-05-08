import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import { AdminPageHeader, DataTable, useConfirm } from '../../components/admin';
import type { DataTableColumn, DataTableActions } from '../../components/admin';
import { db } from '../../lib/firebase';
import { BlogPost } from '../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { logAuditEvent } from '../../lib/auditLog';

export default function AdminBlog() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPosts(); }, []);

  async function fetchPosts() {
    try {
      const q = query(collection(db, 'blog_posts'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as BlogPost)));
    } catch {
      toast.error('Failed to fetch blog posts');
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (post: BlogPost) => {
    if (!post.id) return;
    const ok = await confirm({ title: 'Delete this blog post?', description: 'This action cannot be undone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'blog_posts', post.id));
      logAuditEvent({ action: 'blog.deleted', entityType: 'blog_post', entityId: post.id, actorId: user?.uid, actorEmail: user?.email ?? undefined, details: { title: post.title } });
      toast.success('Blog post deleted');
      setPosts(prev => prev.filter(p => p.id !== post.id));
    } catch {
      toast.error('Failed to delete blog post');
    }
  };

  const handleBulkDelete = async (rows: BlogPost[]) => {
    await Promise.all(rows.filter(p => p.id).map(p => deleteDoc(doc(db, 'blog_posts', p.id!))));
    setPosts(prev => prev.filter(p => !rows.some(r => r.id === p.id)));
    logAuditEvent({ action: 'blog.bulk_deleted', entityType: 'blog_post', actorId: user?.uid, actorEmail: user?.email ?? undefined, details: { count: rows.length } });
    toast.success(`${rows.length} posts deleted`);
  };

  const formatDate = (post: BlogPost) => {
    if (!post.createdAt) return 'N/A';
    try { return new Date(post.createdAt.toMillis?.() ?? Date.now()).toLocaleDateString(); }
    catch { return 'N/A'; }
  };

  const columns: DataTableColumn<BlogPost>[] = [
    {
      key: 'title',
      header: 'Title & Slug',
      searchValue: p => `${p.title} ${p.slug}`,
      sortable: true,
      sortValue: p => p.title,
      render: p => (
        <div>
          <p className="font-bold text-foreground">{p.title}</p>
          <p className="text-xs text-muted-foreground font-medium">/{p.slug}</p>
        </div>
      ),
      csvValue: p => p.title,
    },
    {
      key: 'status',
      header: 'Status',
      searchValue: p => p.status,
      sortable: true,
      sortValue: p => p.status,
      render: p => (
        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${
          p.status === 'published'
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            : 'bg-muted text-muted-foreground border-border'
        }`}>
          {p.status}
        </span>
      ),
      csvValue: p => p.status,
    },
    {
      key: 'date',
      header: 'Published Date',
      sortable: true,
      sortValue: p => p.createdAt?.toMillis?.() ?? 0,
      render: p => (
        <span className="text-xs font-bold text-muted-foreground">{formatDate(p)}</span>
      ),
      csvValue: p => formatDate(p),
    },
  ];

  const actions: DataTableActions<BlogPost> = {
    viewExternal: p => `/blog/${p.slug}`,
    edit: p => `/admin/blog/${p.id}`,
    onDelete: handleDelete,
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="Content"
        labelIcon={FileText}
        title="Blog"
        subtitle="Manage your platform's blog content and announcements."
        actions={
          <Link to="/admin/blog/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Create New Post
          </Link>
        }
      />
      <DataTable
        columns={columns}
        data={posts}
        rowKey={p => p.id ?? p.slug}
        loading={loading}
        actions={actions}
        searchPlaceholder="Search by title or slug..."
        selectable
        onBulkDelete={handleBulkDelete}
        exportFilename="blog-posts"
        emptyIcon={FileText}
        emptyTitle="No blog posts found"
        emptyMessage="Start by creating your first platform announcement."
      />
    </div>
  );
}
