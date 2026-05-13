import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { Tag as TagIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { usePath } from '../../hooks/usePath';
import { db } from '../../lib/firebase';
import { Tag } from '../../types';
import DataTable, { DataTableColumn } from '../admin/DataTable';

export default function TagManager() {
  const { prefix } = usePath();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTags() {
      try {
        const snap = await getDocs(collection(db, 'marketing_tags'));
        setTags(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tag)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchTags();
  }, []);

  const handleDeleteTag = async (tag: Tag) => {
    if (!confirm('Delete this tag?')) return;
    try {
      await deleteDoc(doc(db, 'marketing_tags', tag.id));
      setTags(prev => prev.filter(t => t.id !== tag.id));
      toast.success('Tag deleted');
    } catch (err) {
      toast.error('Failed to delete tag');
    }
  };

  const columns: DataTableColumn<Tag>[] = [
    {
      key: 'name',
      header: 'Tag Identity',
      sortable: true,
      sortValue: t => t.name,
      searchValue: t => t.name,
      render: t => (
        <div className="flex items-center gap-4">
          <div className="w-4 h-4 rounded-full shadow-inner border border-white/10 shrink-0" style={{ backgroundColor: t.color }} />
          <span className="font-semibold text-foreground text-md">{t.name}</span>
        </div>
      ),
      csvValue: t => t.name,
    },
    {
      key: 'description',
      header: 'Description',
      searchValue: t => t.description || '',
      render: t => (
        <p className="text-xs font-medium text-muted-foreground line-clamp-1 max-w-md">{t.description || 'No description provided'}</p>
      ),
      csvValue: t => t.description || '',
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={tags}
      rowKey={t => t.id}
      loading={loading}
      emptyIcon={TagIcon}
      emptyTitle="No Labels Defined"
      emptyMessage="Create tags to organize your marketing audience."
      actions={{
        edit: t => prefix(`/admin/marketing/tags/${t.id}/edit`),
        onDelete: handleDeleteTag,
      }}
      searchPlaceholder="Search tags..."
      exportFilename="marketing_tags"
    />
  );
}
