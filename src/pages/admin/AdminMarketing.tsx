import { LayoutGrid, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AdminPageHeader } from '../../components/admin';
import AutomationManager from '../../components/marketing/AutomationManager';
import ContactManager from '../../components/marketing/ContactManager';
import SegmentManager from '../../components/marketing/SegmentManager';
import TagManager from '../../components/marketing/TagManager';
import Button from '../../components/primitives/Button';
import { usePath } from '../../hooks/usePath';

export default function AdminMarketing() {
  const location = useLocation();
  const { prefix } = usePath();
  const [refreshKey, setRefreshKey] = useState(0);

  const getActiveMode = () => {
    const path = location.pathname;
    if (path.includes('/contacts')) return 'contact';
    if (path.includes('/tags')) return 'tag';
    if (path.includes('/segments')) return 'segment';
    if (path.includes('/automations')) return 'automation';
    return 'contact';
  };

  const activeMode = getActiveMode();

  const modeTitle =
    activeMode === 'contact'   ? 'CRM Contacts'      :
    activeMode === 'tag'       ? 'Audience Tags'      :
    activeMode === 'segment'   ? 'Audience Segments'  :
                                 'Automations';

  const subtitle =
    activeMode === 'contact'   ? 'Manage your marketing leads and CRM data.'              :
    activeMode === 'tag'       ? 'Organize your audience with custom labels.'              :
    activeMode === 'segment'   ? 'Create targeted lists based on custom rules.'            :
                                 'Build intelligent workflows for user engagement.';

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <AdminPageHeader
        label="Marketing Engine"
        labelIcon={LayoutGrid}
        title={modeTitle}
        subtitle={subtitle}
        actions={
          <div className="flex items-center gap-2">
            {activeMode === 'automation' && (
              <Button as={Link} to={prefix('/admin/marketing/automations/new')} variant="primary" size="md" leftIcon={Plus} className="font-bold shadow-xl shadow-primary/20">
                New Automation
              </Button>
            )}
            {activeMode === 'tag' && (
              <Button as={Link} to={prefix('/admin/marketing/tags/new')} variant="primary" size="md" leftIcon={Plus} className="font-bold shadow-xl shadow-primary/20">
                New Tag
              </Button>
            )}
            {activeMode === 'segment' && (
              <Button as={Link} to={prefix('/admin/marketing/segments/new')} variant="primary" size="md" leftIcon={Plus} className="font-bold shadow-xl shadow-primary/20">
                New Segment
              </Button>
            )}
            {activeMode === 'contact' && (
              <Button as={Link} to={prefix('/admin/marketing/contacts/new')} variant="primary" size="md" leftIcon={Plus} className="font-bold shadow-xl shadow-primary/20">
                Add Contact
              </Button>
            )}
          </div>
        }
      />

      {activeMode === 'contact'   && <ContactManager key={refreshKey} />}
      {activeMode === 'automation'&& <AutomationManager key={refreshKey} />}
      {activeMode === 'tag'       && <TagManager key={refreshKey} />}
      {activeMode === 'segment'   && <SegmentManager key={refreshKey} />}
    </div>
  );
}
