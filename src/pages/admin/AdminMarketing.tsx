import { LayoutGrid, Plus } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AdminPageHeader } from '../../components/admin';
import AutomationManager from '../../components/marketing/AutomationManager';
import ContactManager from '../../components/marketing/ContactManager';
import SegmentManager from '../../components/marketing/SegmentManager';
import TagManager from '../../components/marketing/TagManager';
import Button from '../../components/primitives/Button';
import { usePath } from '../../hooks/usePath';

export default function AdminMarketing() {
  const location = useLocation();
  const navigate = useNavigate();
  const { prefix } = usePath();

  // Determine active mode from URL path (e.g., /admin/marketing/contacts)
  const getActiveMode = () => {
    const path = location.pathname;
    if (path.includes('/contacts')) return 'contact';
    if (path.includes('/tags')) return 'tag';
    if (path.includes('/segments')) return 'segment';
    if (path.includes('/automations')) return 'automation';
    return 'contact';
  };

  const activeMode = getActiveMode();

  const modeTitle = activeMode === 'contact' ? 'CRM Contacts' :
                   activeMode === 'tag' ? 'Audience Tags' :
                   activeMode === 'segment' ? 'Audience Segments' : 'Automations';

  const subtitle = activeMode === 'contact' ? 'Manage your marketing leads and CRM data.' :
                  activeMode === 'tag' ? 'Organize your audience with custom labels.' :
                  activeMode === 'segment' ? 'Create targeted lists based on custom rules.' : 'Build intelligent workflows for user engagement.';

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <AdminPageHeader
        label="Marketing Engine"
        labelIcon={LayoutGrid}
        title={modeTitle}
        subtitle={subtitle}
        actions={
          <div className="flex items-center gap-3">
            {activeMode === 'automation' && (
              <Button as={Link} to={prefix("/admin/marketing/automations/new")} variant="primary" size="md" leftIcon={Plus} className="font-bold shadow-xl shadow-primary/20">
                New Automation
              </Button>
            )}
            {activeMode === 'tag' && (
              <Button as={Link} to={prefix("/admin/marketing/tags/new")} variant="primary" size="md" leftIcon={Plus} className="font-bold shadow-xl shadow-primary/20">
                New Tag
              </Button>
            )}
            {activeMode === 'segment' && (
              <Button as={Link} to={prefix("/admin/marketing/segments/new")} variant="primary" size="md" leftIcon={Plus} className="font-bold shadow-xl shadow-primary/20">
                New Segment
              </Button>
            )}
            {activeMode === 'contact' && (
              <Button as={Link} to={prefix("/admin/marketing/contacts/new")} variant="primary" size="md" leftIcon={Plus} className="font-bold shadow-xl shadow-primary/20">
                Add Contact
              </Button>
            )}
          </div>
        }
      />

      {activeMode === 'contact' && <ContactManager />}
      {activeMode === 'automation' && <AutomationManager />}
      {activeMode === 'tag' && <TagManager />}
      {activeMode === 'segment' && <SegmentManager />}
    </div>
  );
}
