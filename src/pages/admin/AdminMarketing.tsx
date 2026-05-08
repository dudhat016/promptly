import { Plus, Users, Tag as TagIcon, GitBranch, Filter, Send } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { AdminPageHeader } from '../../components/admin';
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
          activeMode === 'automation' ? <Link to="/admin/marketing/automations/new" className="btn-primary"><Plus className="w-5 h-5" />Create Automation</Link>
          : activeMode === 'tag' ? <Link to="/admin/marketing/tags/new" className="btn-primary"><Plus className="w-5 h-5" />Create Tag</Link>
          : activeMode === 'segment' ? <Link to="/admin/marketing/segments/new" className="btn-primary"><Plus className="w-5 h-5" />Create Segment</Link>
          : <Link to="/admin/marketing/contacts/new" className="btn-primary"><Plus className="w-5 h-5" />Add Contact</Link>
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
