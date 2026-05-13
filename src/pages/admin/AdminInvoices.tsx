import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy, limit, doc, deleteDoc } from 'firebase/firestore';
import { FileText, Plus, Search, Download, Trash2, Eye, Edit2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { AdminPageHeader, DataTable, useConfirm } from '../../components/admin';
import type { DataTableColumn } from '../../components/admin';
import { toast } from 'react-hot-toast';
import Button from '../../components/primitives/Button';
import { cn } from '../../lib/utils';
import { usePath } from '../../hooks/usePath';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/primitives/Badge';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  dueDate: Date;
  createdAt: Date;
}

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { prefix } = usePath();
  const navigate = useNavigate();
  const confirm = useConfirm();

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    setLoading(true);
    try {
      // In a real app, we'd fetch from Firestore
      // For now, let's simulate with some data based on users or just hardcoded
      const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      
      setInvoices(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        dueDate: d.data().dueDate?.toDate() || new Date(),
        createdAt: d.data().createdAt?.toDate() || new Date()
      } as Invoice)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (invoice: Invoice) => {
    const ok = await confirm({
      title: 'Delete Invoice?',
      description: `Are you sure you want to delete ${invoice.invoiceNumber}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true
    });

    if (!ok) return;

    try {
      await deleteDoc(doc(db, 'invoices', invoice.id));
      setInvoices(prev => prev.filter(i => i.id !== invoice.id));
      toast.success('Invoice deleted successfully');
    } catch (err) {
      toast.error('Failed to delete invoice');
    }
  };

  const statusStyles = {
    paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    overdue: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    draft: "bg-slate-500/10 text-slate-600 border-slate-500/20"
  };

  const statusIcons = {
    paid: CheckCircle,
    pending: Clock,
    overdue: AlertCircle,
    draft: FileText
  };

  const columns: DataTableColumn<Invoice>[] = [
    {
      key: 'invoice',
      header: 'Invoice',
      sortable: true,
      sortValue: i => i.invoiceNumber,
      render: i => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
            statusStyles[i.status]
          )}>
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-foreground">{i.invoiceNumber}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
              {i.createdAt.toLocaleDateString()}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'customer',
      header: 'Customer',
      searchValue: i => `${i.customerName} ${i.customerEmail}`,
      render: i => (
        <div className="min-w-0">
          <p className="font-bold text-foreground truncate">{i.customerName}</p>
          <p className="text-xs text-muted-foreground truncate">{i.customerEmail}</p>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      sortValue: i => i.amount,
      render: i => <span className="font-bold text-foreground">${i.amount.toFixed(2)}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: i => (
        <Badge
          variant={
            i.status === 'paid' ? 'success' :
            i.status === 'pending' ? 'warning' :
            i.status === 'overdue' ? 'error' : 'soft'
          }
          dot
          className="capitalize"
        >
          {i.status}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="Finance"
        labelIcon={FileText}
        title="Invoices"
        subtitle="Manage and track customer billing and payments."
        actions={
          <Button 
            variant="primary" 
            size="sm" 
            leftIcon={Plus}
            onClick={() => navigate(prefix('/admin/invoices/new'))}
          >
            Create Invoice
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={invoices}
        rowKey={i => i.id}
        loading={loading}
        searchPlaceholder="Search invoices, customers..."
        actions={{
          custom: [
            { 
              icon: Eye, 
              label: 'Preview', 
              onClick: i => navigate(prefix(`/admin/invoices/${i.id}`)) 
            },
            { 
              icon: Edit2, 
              label: 'Edit', 
              onClick: i => navigate(prefix(`/admin/invoices/${i.id}/edit`)) 
            },
            { 
              icon: Download, 
              label: 'Download PDF', 
              onClick: i => toast.success('Preparing PDF download...') 
            }
          ],
          onDelete: handleDelete
        }}
      />
    </div>
  );
}
