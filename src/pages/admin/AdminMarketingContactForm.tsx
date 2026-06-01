import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Contact, Tag } from '../../types';
import { ArrowLeft, Save, Users } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { toast } from 'react-hot-toast';
import Select from '../../components/primitives/Select';
import Input from '../../components/primitives/Input';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import { cn } from '../../lib/utils';

export default function AdminMarketingContactForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prefix } = usePath();

  const [tags, setTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [contact, setContact] = useState<Partial<Contact>>({
    email: '', displayName: '', tags: [], status: 'active', customFields: {}
  });

  useEffect(() => {
    async function loadData() {
      const tSnap = await getDocs(collection(db, 'marketing_tags'));
      setTags(tSnap.docs.map(d => ({ id: d.id, ...d.data() } as Tag)));

      if (id && id !== 'new') {
        const docSnap = await getDoc(doc(db, 'marketing_contacts', id));
        if (docSnap.exists()) {
          setContact({ id: docSnap.id, ...docSnap.data() } as Contact);
        }
      }
    }
    loadData();
  }, [id]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!contact.email?.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      newErrors.email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (id && id !== 'new') {
        await updateDoc(doc(db, 'marketing_contacts', id), contact);
      } else {
        const newId = Date.now().toString();
        await setDoc(doc(db, 'marketing_contacts', newId), { ...contact, id: newId, createdAt: new Date() });
      }
      toast.success(id && id !== 'new' ? 'Contact updated' : 'New contact created');
      navigate(prefix('/admin/marketing/contacts'));
    } catch (err) {
      console.error(err);
      toast.error('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tagId: string) => {
    const currentTags = contact.tags || [];
    setContact({
      ...contact,
      tags: currentTags.includes(tagId)
        ? currentTags.filter(t => t !== tagId)
        : [...currentTags, tagId],
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Marketing CRM"
        labelIcon={Users}
        title={id === 'new' ? 'Create Contact' : 'Edit Contact'}
        subtitle="Add or update a contact in your CRM database."
        actions={
          <Button
            onClick={() => navigate(prefix('/admin/marketing/contacts'))}
            variant="secondary"
            size="md"
            leftIcon={ArrowLeft}
            className="font-bold"
          >
            Back
          </Button>
        }
      />

      <Card padding="lg" className="!rounded-3xl shadow-sm">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Input
              label="Email Address"
              id="contactEmail"
              name="contactEmail"
              type="email"
              error={errors.email}
              value={contact.email || ''}
              onChange={e => {
                setContact({ ...contact, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              variant="outline"
            />
            <Input
              label="Display Name"
              id="contactDisplayName"
              name="contactDisplayName"
              type="text"
              value={contact.displayName || ''}
              onChange={e => setContact({ ...contact, displayName: e.target.value })}
              variant="outline"
            />
          </div>

          <Select
            label="Status"
            value={contact.status || 'active'}
            onChange={val => setContact({ ...contact, status: val as any })}
            options={[
              { label: 'Active', value: 'active', description: 'Contact is subscribed and receiving emails' },
              { label: 'Unsubscribed', value: 'unsubscribed', description: 'User opted out of marketing' },
              { label: 'Bounced', value: 'bounced', description: 'Email delivery failed' },
            ]}
            isSearchable={false}
          />

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Applied Tags
            </label>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => {
                  const isActive = (contact.tags || []).includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all',
                        isActive
                          ? 'border-primary/30 bg-primary/10 text-primary shadow-sm'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      )}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No tags available.{' '}
                <Link to={prefix('/admin/marketing/tags/new')} className="text-primary hover:underline font-semibold">
                  Create one
                </Link>
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-border flex gap-3">
            <Button
              type="submit"
              isLoading={saving}
              variant="primary"
              size="md"
              leftIcon={Save}
              className="font-bold shadow-sm shadow-primary/20"
            >
              {saving ? 'Saving...' : id === 'new' ? 'Create Contact' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              onClick={() => navigate(prefix('/admin/marketing/contacts'))}
              variant="secondary"
              size="md"
              className="font-bold"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
