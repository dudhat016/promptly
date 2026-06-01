import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileText,
  Hash,
  Info,
  Mail,
  Percent,
  Plus,
  Printer,
  Save,
  Send,
  Trash2,
  User
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/primitives/Card';
import Button from '../../components/primitives/Button';
import DatePicker from '../../components/primitives/DatePicker';
import Input from '../../components/primitives/Input';
import Select from '../../components/primitives/Select';
import Textarea from '../../components/primitives/Textarea';
import Spinner from '../../components/feedback/Spinner';
import { usePath } from '../../hooks/usePath';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  notes?: string;
  taxRate: number;
}

export default function AdminInvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prefix } = usePath();
  const isEdit = !!id && id !== 'new';
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>(isEdit ? 'preview' : 'edit');

  const [data, setData] = useState<InvoiceData>({
    invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    status: 'draft',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
    items: [
      { id: '1', description: 'Consulting Services', quantity: 1, unitPrice: 0 }
    ],
    taxRate: 0,
    notes: ''
  });

  useEffect(() => {
    if (isEdit) {
      fetchInvoice();
    }
  }, [id]);

  async function fetchInvoice() {
    try {
      const docRef = doc(db, 'invoices', id!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setData(docSnap.data() as InvoiceData);
      } else {
        toast.error('Invoice not found');
        navigate(prefix('/admin/invoices'));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!data.customerName || !data.customerEmail) {
      toast.error('Please fill in customer details');
      return;
    }

    setSaving(true);
    try {
      const invoiceData = {
        ...data,
        updatedAt: serverTimestamp(),
        total: subtotal + tax
      };

      if (isEdit) {
        await setDoc(doc(db, 'invoices', id!), invoiceData);
        toast.success('Invoice updated');
      } else {
        await addDoc(collection(db, 'invoices'), {
          ...invoiceData,
          createdAt: serverTimestamp()
        });
        toast.success('Invoice created');
      }
      navigate(prefix('/admin/invoices'));
    } catch (err) {
      console.error(err);
      toast.error('Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    setData(prev => ({
      ...prev,
      items: [...prev.items, { id: Math.random().toString(), description: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  const removeItem = (itemId: string) => {
    if (data.items.length === 1) return;
    setData(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId)
    }));
  };

  const updateItem = (itemId: string, field: keyof InvoiceItem, value: any) => {
    setData(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
    }));
  };

  const subtotal = data.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const tax = subtotal * (data.taxRate / 100);
  const total = subtotal + tax;

  const statusOptions = [
    { label: 'Draft', value: 'draft', description: 'Internal document' },
    { label: 'Pending', value: 'pending', description: 'Awaiting payment' },
    { label: 'Paid', value: 'paid', description: 'Payment received' },
    { label: 'Overdue', value: 'overdue', description: 'Payment past due date' }
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Spinner size="md" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(prefix('/admin/invoices'))} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              {isEdit ? data.invoiceNumber : 'Create Invoice'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Finance</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
              <span className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">{isEdit ? 'Update Record' : 'New Entry'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
          <Button
            variant={viewMode === 'edit' ? 'primary' : 'ghost'}
            size="sm"
            leftIcon={Edit3}
            onClick={() => setViewMode('edit')}
            className="rounded-xl"
          >
            Edit
          </Button>
          <Button
            variant={viewMode === 'preview' ? 'primary' : 'ghost'}
            size="sm"
            leftIcon={Eye}
            onClick={() => setViewMode('preview')}
            className="rounded-xl"
          >
            Preview
          </Button>
          <div className="w-px h-6 bg-border/50 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            leftIcon={Save}
            isLoading={saving}
            onClick={handleSave}
            className="rounded-xl text-primary hover:bg-primary/10"
          >
            Save
          </Button>
        </div>
      </div>

      {viewMode === 'edit' ? (
        <div className="grid lg:grid-cols-3 gap-8 pb-20">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">
            <Card padding="none" className="!rounded-3xl shadow-sm">
              <div className="px-8 py-5 border-b border-border bg-muted/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-[0.15em] text-foreground">Customer Information</h3>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    label="Customer Name"
                    value={data.customerName}
                    onChange={e => setData({...data, customerName: e.target.value})}
                    placeholder="e.g. John Doe"
                    leftIcon={User}
                    variant="outline"
                  />
                  <Input
                    label="Customer Email"
                    type="email"
                    value={data.customerEmail}
                    onChange={e => setData({...data, customerEmail: e.target.value})}
                    placeholder="e.g. john@example.com"
                    leftIcon={Mail}
                    variant="outline"
                  />
                </div>
                <Textarea
                  label="Billing Address"
                  rows={3}
                  value={data.customerAddress}
                  onChange={e => setData({...data, customerAddress: e.target.value})}
                  placeholder="Enter full billing address..."
                  variant="outline"
                />
              </div>
            </Card>

            <Card padding="none" className="!rounded-3xl shadow-sm">
              <div className="px-8 py-5 border-b border-border bg-muted/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-xs uppercase tracking-[0.15em] text-foreground">Line Items</h3>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl h-9 px-4" leftIcon={Plus} onClick={addItem}>Add Row</Button>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/20 border-b border-border text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">
                    <tr>
                      <th className="px-8 py-4 w-full">Description</th>
                      <th className="px-4 py-4 text-center w-24">Qty</th>
                      <th className="px-4 py-4 text-right w-36">Unit Price</th>
                      <th className="px-4 py-4 text-right w-36">Total</th>
                      <th className="px-8 py-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {data.items.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="px-8 py-5">
                          <input
                            type="text"
                            value={item.description}
                            onChange={e => updateItem(item.id, 'description', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-bold text-foreground placeholder:text-muted-foreground/30"
                            placeholder="Describe service or product..."
                          />
                        </td>
                        <td className="px-4 py-5">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-black text-center text-primary"
                          />
                        </td>
                        <td className="px-4 py-5 text-right">
                          <div className="flex items-center justify-end gap-1 font-bold text-sm text-foreground">
                            <span className="opacity-30">$</span>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-24 bg-transparent border-none focus:ring-0 p-0 text-sm font-black text-right"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-5 text-right font-black text-sm text-foreground">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
                        <td className="px-8 py-5 text-center">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/30 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-8 bg-muted/5 border-t border-border flex justify-end">
                <div className="w-72 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
                    <span className="font-black text-foreground">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Tax Rate</span>
                    <div className="w-24">
                      <Input
                        type="number"
                        value={data.taxRate}
                        onChange={e => setData({...data, taxRate: parseFloat(e.target.value) || 0})}
                        variant="outline"
                        inputSize="sm"
                        className="text-right font-black"
                        rightIcon={Percent}
                      />
                    </div>
                  </div>
                  <div className="pt-5 border-t border-border flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="font-black text-[10px] uppercase tracking-[0.2em] text-primary">Final Total</span>
                      <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">Inc. all taxes</span>
                    </div>
                    <span className="text-3xl font-black text-foreground tracking-tighter">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card padding="lg" className="!rounded-3xl shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Info className="w-4 h-4" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-[0.15em] text-foreground">Additional Notes</h3>
              </div>
              <Textarea
                value={data.notes}
                onChange={e => setData({...data, notes: e.target.value})}
                placeholder="Include payment instructions or thank you message..."
                variant="outline"
                rows={4}
              />
            </Card>
          </div>

          {/* Sidebar Settings */}
          <div className="space-y-8">
            <Card padding="none" className="!rounded-3xl shadow-sm sticky top-24">
              <div className="px-8 py-5 border-b border-border bg-muted/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Calculator className="w-4 h-4" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-[0.15em] text-foreground">Document Config</h3>
              </div>
              <div className="p-8 space-y-6 z-20">
                <Input
                  label="Invoice Number"
                  value={data.invoiceNumber}
                  onChange={e => setData({...data, invoiceNumber: e.target.value})}
                  leftIcon={Hash}
                  variant="outline"
                  className="font-black"
                />

                <DatePicker
                  label="Issue Date"
                  value={data.issueDate}
                  onChange={val => setData({...data, issueDate: val})}
                />

                <DatePicker
                  label="Due Date"
                  value={data.dueDate}
                  onChange={val => setData({...data, dueDate: val})}
                />

                <Select
                  label="Payment Status"
                  value={data.status}
                  onChange={val => setData({...data, status: val})}
                  options={statusOptions}
                  isSearchable={false}
                />

                <div className="pt-6 border-t border-border">
                  <Button
                    variant="primary"
                    className="w-full h-12 rounded-2xl shadow-lg shadow-primary/20"
                    leftIcon={Save}
                    isLoading={saving}
                    onClick={handleSave}
                  >
                    Confirm & Save
                  </Button>
                </div>
              </div>
            </Card>

            <div className="bg-primary border z-[-1] border-primary/10 rounded-3xl p-8 text-primary-foreground relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Calculator className="w-32 h-32 rotate-12" />
              </div>
              <div className="relative z-10">
                <h4 className="font-black text-sm uppercase tracking-widest mb-3">Billing System</h4>
                <p className="text-xs text-primary-foreground/70 leading-relaxed font-medium">
                  The invoice number is generated automatically but can be overridden. Ensure the due date provides adequate time for the customer to process the payment.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Preview Mode */
        <Card padding="none" className="!rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in-95 duration-500 max-w-4xl mx-auto mb-20">
          <div className="bg-foreground px-12 py-16 text-background relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5">
              <FileText className="w-80 h-80 rotate-12" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center rotate-3">
                  <FileText className="w-8 h-8 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-5xl font-black tracking-tighter uppercase leading-none">Invoice</h2>
                  <p className="text-background/40 text-xs font-black tracking-[0.4em] uppercase mt-2">{data.invoiceNumber}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-2">Total Amount Due</p>
                <p className="text-6xl font-black tracking-tighter leading-none">${total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="p-12 md:p-16 space-y-16">
            <div className="grid md:grid-cols-2 gap-16">
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary border-b-2 border-primary/10 pb-3 w-fit">Client Details</h4>
                <div>
                  <p className="text-2xl font-black text-foreground tracking-tight">{data.customerName || 'Undefined Customer'}</p>
                  <p className="text-sm font-bold text-muted-foreground/60 mt-1">{data.customerEmail || 'no-email@provided.com'}</p>
                  <div className="text-sm text-muted-foreground mt-6 whitespace-pre-wrap leading-relaxed font-medium bg-muted/30 p-6 rounded-2xl border border-border/50">
                    {data.customerAddress || 'No billing address provided for this account.'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-10 gap-x-8">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Date Issued</h4>
                  <p className="font-black text-foreground text-sm">{new Date(data.issueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Due Date</h4>
                  <p className="font-black text-primary text-sm">{new Date(data.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Payment Status</h4>
                  <span className={cn(
                    "inline-flex px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm",
                    data.status === 'paid' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                    data.status === 'pending' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                    "bg-rose-500/10 text-rose-600 border-rose-500/20"
                  )}>
                    {data.status}
                  </span>
                </div>
              </div>
            </div>

            <Card padding="none" className="!rounded-[2rem] shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/50 border-b border-border text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  <tr>
                    <th className="px-8 py-5">Service / Product Description</th>
                    <th className="px-8 py-5 text-center w-24">Qty</th>
                    <th className="px-8 py-5 text-right w-36">Unit Price</th>
                    <th className="px-8 py-5 text-right w-36">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {data.items.map((item, idx) => (
                    <tr key={idx} className="text-sm">
                      <td className="px-8 py-8 text-foreground font-bold leading-relaxed">{item.description}</td>
                      <td className="px-8 py-8 text-center text-muted-foreground font-black">{item.quantity}</td>
                      <td className="px-8 py-8 text-right text-muted-foreground font-bold">${item.unitPrice.toFixed(2)}</td>
                      <td className="px-8 py-8 text-right font-black text-foreground">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/10">
                  <tr>
                    <td colSpan={2} className="px-8 py-16 text-sm text-muted-foreground">
                      <div className="max-w-xs space-y-4">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-primary" />
                          <h5 className="font-black text-[10px] uppercase tracking-[0.2em] text-foreground">Terms & Notes</h5>
                        </div>
                        <p className="text-xs leading-relaxed opacity-70 font-medium">
                          {data.notes || 'Full payment is expected by the due date mentioned above. Please include the invoice number as a reference for bank transfers.'}
                        </p>
                      </div>
                    </td>
                    <td colSpan={2} className="px-8 py-16">
                      <div className="space-y-5">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                          <span className="text-muted-foreground/60">Subtotal</span>
                          <span className="text-foreground">${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                          <span className="text-muted-foreground/60">VAT/Tax ({data.taxRate}%)</span>
                          <span className="text-foreground">${tax.toFixed(2)}</span>
                        </div>
                        <div className="pt-6 border-t-2 border-foreground/5 flex justify-between items-center">
                          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Total Payable</span>
                          <span className="text-4xl font-black text-foreground tracking-tighter leading-none">${total.toFixed(2)}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </Card>

            <div className="pt-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Legally Verified</p>
                  <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Digitally signed via Promptly HQ</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" leftIcon={Printer} className="rounded-xl h-11 px-6">Print</Button>
                <Button variant="outline" size="sm" leftIcon={Download} className="rounded-xl h-11 px-6">Download</Button>
                <Button variant="primary" size="sm" leftIcon={Send} className="rounded-xl h-11 px-6 shadow-lg shadow-primary/20">Send Invoice</Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
