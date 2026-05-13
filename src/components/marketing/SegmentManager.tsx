import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { Filter } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { usePath } from '../../hooks/usePath';
import { db } from '../../lib/firebase';
import { Segment } from '../../types';
import DataTable, { DataTableColumn } from '../admin/DataTable';
import Badge from '../primitives/Badge';

export default function SegmentManager() {
  const { prefix } = usePath();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSegments() {
      try {
        const snap = await getDocs(collection(db, 'marketing_segments'));
        setSegments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Segment)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSegments();
  }, []);

  const handleDeleteSegment = async (segment: Segment) => {
    if (!confirm('Delete this segment?')) return;
    try {
      await deleteDoc(doc(db, 'marketing_segments', segment.id));
      setSegments(prev => prev.filter(s => s.id !== segment.id));
      toast.success('Segment deleted');
    } catch (err) {
      toast.error('Failed to delete segment');
    }
  };

  const columns: DataTableColumn<Segment>[] = [
    {
      key: 'name',
      header: 'Segment Identity',
      sortable: true,
      sortValue: s => s.name,
      searchValue: s => s.name,
      render: s => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/5 text-primary rounded-xl flex items-center justify-center border border-primary/10 shadow-sm group-hover:scale-105 transition-transform">
            <Filter className="w-5 h-5" />
          </div>
          <span className="font-semibold text-foreground text-md">{s.name}</span>
        </div>
      ),
      csvValue: s => s.name,
    },
    {
      key: 'rules',
      header: 'Logic Engine',
      sortable: true,
      sortValue: s => s.filters?.length || 0,
      render: s => (
        <div className="flex items-center gap-2">
          <Badge variant="outline" size="sm" className="bg-muted/10">
            {s.filters?.length || 0} Filters
          </Badge>
          <Badge variant="soft" size="sm" className="bg-primary/5 border-primary/10">
            {s.matchType === 'or' ? 'ANY MATCH' : 'ALL MATCH'}
          </Badge>
        </div>
      ),
      csvValue: s => `${s.filters?.length || 0} rules (${s.matchType})`,
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={segments}
      rowKey={s => s.id}
      loading={loading}
      emptyIcon={Filter}
      emptyTitle="No Active Segments"
      emptyMessage="Create segments to filter your audience by custom rules."
      actions={{
        edit: s => prefix(`/admin/marketing/segments/${s.id}/edit`),
        onDelete: handleDeleteSegment,
      }}
      searchPlaceholder="Search segments..."
      exportFilename="marketing_segments"
    />
  );
}
