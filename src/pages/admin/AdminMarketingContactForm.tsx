import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Contact, Tag } from '../../types';
import { Save, Users } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { toast } from 'react-hot-toast';

import Select from '../../components/primitives/Select';
import Input from '../../components/primitives/Input';
import Button from '../../components/primitives/Button';
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
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      newErrors.email = "Invalid email format";
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
      toast.success(id && id !== 'new' ? "Contact updated" : "New contact created");
      navigate(prefix('/admin/marketing?tab=contact'));
    } catch (err) {
      console.error(err);
      toast.error("Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tagId: string) => {
    const currentTags = contact.tags || [];
    if (currentTags.includes(tagId)) {
      setContact({ ...contact, tags: currentTags.filter(t => t !== tagId) });
    } else {
      setContact({ ...contact, tags: [...currentTags, tagId] });
    }
  };


  return (
    <>
      <AdminPageHeader
        label="Marketing CRM"
        labelIcon={Users}
        title={id === 'new' ? 'Create Contact' : 'Edit Contact'}
        subtitle="Add or update a contact in your CRM database."
      />

      <div className="bg-card rounded-lg border border-border p-8">

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
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
              variant="filled"
            />
            <Input
              label="Display Name"
              id="contactDisplayName"
              name="contactDisplayName"
              type="text"
              value={contact.displayName || ''}
              onChange={e => setContact({ ...contact, displayName: e.target.value })}
              variant="filled"
            />
          </div>

          <div>
          <Select
            label="Status"
            value={contact.status || 'active'}
            onChange={val => setContact({ ...contact, status: val as any })}
            options={[
              { label: 'Active', value: 'active', description: 'Contact is subscribed and receiving emails' },
              { label: 'Unsubscribed', value: 'unsubscribed', description: 'User opted out of marketing' },
              { label: 'Bounced', value: 'bounced', description: 'Email delivery failed' }
            ]}
            isSearchable={false}
          />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Applied Tags</label>
            <div className="flex flex-wrap gap-3">
              {tags.map(tag => {
                const isActive = (contact.tags || []).includes(tag.id);
                return (
                  <Button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    variant={isActive ? 'primary' : 'ghost'}
                    size="sm"
                    className={cn(
                      "px-4 py-2 h-auto text-xs font-bold border transition-all rounded-xl",
                      isActive
                        ? 'border-primary bg-primary/10 text-primary shadow-sm hover:bg-primary/20'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {tag.name}
                  </Button>
                );
              })}
              {tags.length === 0 && <p className="text-sm text-muted-foreground italic">No tags available. Create some in the CRM dashboard.</p>}
            </div>
          </div>

          <div className="pt-6 border-t border-border flex gap-4">
            <Button
              type="submit"
              isLoading={saving}
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={Save}
              className="font-bold shadow-lg shadow-primary/20"
            >
              {saving ? 'Saving...' : 'Save Contact'}
            </Button>
            <Button
              as={Link}
              to={prefix("/admin/marketing?tab=contact")}
              variant="secondary"
              size="lg"
              className="px-8 font-bold"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
