import { Plus, Users, Tag as TagIcon, GitBranch, Filter, Send } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { AdminPageHeader } from '../../components/admin';
import Button from '../../components/ui/Button';
import ContactManager from '../../components/marketing/ContactManager';
import TagManager from '../../components/marketing/TagManager';
import SegmentManager from '../../components/marketing/SegmentManager';
import AutomationManager from '../../components/marketing/AutomationManager';

export default function AdminMarketing() {
  const location = useLocation();

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

  const modeIcon = activeMode === 'contact' ? Users : activeMode === 'tag' ? TagIcon : activeMode === 'segment' ? Filter : GitBranch;
  const modeTitle = `Marketing ${activeMode.charAt(0).toUpperCase() + activeMode.slice(1)}s`;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="Comms"
        labelIcon={Send}
        title={modeTitle}
        subtitle={`Manage and organize your marketing ${activeMode}s and CRM data.`}
        actions={
          activeMode === 'automation' ? (
            <Button as={Link} to="/admin/marketing/automations/new" variant="primary" size="md" leftIcon={Plus} className="font-bold">
              Create Automation
            </Button>
          ) : activeMode === 'tag' ? (
            <Button as={Link} to="/admin/marketing/tags/new" variant="primary" size="md" leftIcon={Plus} className="font-bold">
              Create Tag
            </Button>
          ) : activeMode === 'segment' ? (
            <Button as={Link} to="/admin/marketing/segments/new" variant="primary" size="md" leftIcon={Plus} className="font-bold">
              Create Segment
            </Button>
          ) : (
            <Button as={Link} to="/admin/marketing/contacts/new" variant="primary" size="md" leftIcon={Plus} className="font-bold">
              Add Contact
            </Button>
          )
        }
      />

      <div className={activeMode === 'contact' ? "" : "card overflow-hidden"}>
        {activeMode === 'contact' && (
          <ContactManager />
        )}

        {activeMode === 'automation' && (
          <AutomationManager />
        )}
        
        {activeMode === 'tag' && (
          <TagManager />
        )}

        {activeMode === 'segment' && (
          <SegmentManager />
        )}
      </div>
    </div>
  );
}
