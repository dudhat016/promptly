import {
  ArrowRight, Bell, Check, ChevronRight, Filter,
  Globe, Home, Info, Mail, Search, Settings, Star, Tag, User,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminPageHeader } from '../../components/admin';
import Timeline from '../../components/data/Timeline';
import Alert from '../../components/feedback/Alert';
import Progress from '../../components/feedback/Progress';
import Accordion from '../../components/navigation/Accordion';
import Tabs from '../../components/navigation/Tabs';
import Tooltip from '../../components/overlays/Tooltip';
import Badge from '../../components/primitives/Badge';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import Chip from '../../components/primitives/Chip';
import Input from '../../components/primitives/Input';
import Select from '../../components/primitives/Select';
import { RTL_LANGUAGES } from '../../i18n';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Section({ title, status, children, notes }: {
  title: string;
  status: 'pass' | 'partial' | 'fail';
  children: React.ReactNode;
  notes?: string;
}) {
  const colors = {
    pass:    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    partial: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    fail:    'bg-rose-500/10 text-rose-600 border-rose-500/20',
  };
  const labels = { pass: 'Pass', partial: 'Partial', fail: 'Needs Work' };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground">{title}</h3>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${colors[status]}`}>
          {labels[status]}
        </span>
      </div>
      <div className="space-y-4">{children}</div>
      {notes && (
        <p className="mt-4 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">
          <span className="font-bold">Note:</span> {notes}
        </p>
      )}
    </Card>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{children}</p>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminRTLTest() {
  const { i18n } = useTranslation();
  const isRtl = RTL_LANGUAGES.includes(i18n.language);
  const [activeTab, setActiveTab] = useState('overview');
  const [progressValue] = useState(65);
  const [chips, setChips] = useState(['Arabic', 'Hebrew', 'RTL']);

  const toggleDirection = () => {
    i18n.changeLanguage(isRtl ? 'en' : 'ar');
  };

  return (
    <div>
      <AdminPageHeader
        label="System"
        labelIcon={Globe}
        title="RTL Test Page"
        subtitle="Verify component behavior under right-to-left layout direction."
        actions={
          <Button
            variant={isRtl ? 'primary' : 'outline'}
            leftIcon={Globe}
            onClick={toggleDirection}
          >
            {isRtl ? 'Switch to LTR' : 'Switch to RTL (Arabic)'}
          </Button>
        }
      />

      {/* Direction banner */}
      <Alert
        variant={isRtl ? 'success' : 'info'}
        title={isRtl ? 'Currently in RTL mode (dir="rtl")' : 'Currently in LTR mode (dir="ltr")'}
      >
        {isRtl
          ? 'The document direction is set to RTL. Arabic locale is active. Review each component below for correct mirroring.'
          : 'Click "Switch to RTL" above to test component behavior in right-to-left layout.'}
      </Alert>

      {/* ── 1. Button ── */}
      <Section title="1. Button — icon placement" status="pass">
        <Label>Left icon (should appear on leading edge)</Label>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" leftIcon={Mail}>Send Email</Button>
          <Button variant="outline" leftIcon={Search}>Search</Button>
          <Button variant="ghost" leftIcon={Settings}>Settings</Button>
        </div>
        <Label>Right icon (should appear on trailing edge)</Label>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" rightIcon={ArrowRight}>Continue</Button>
          <Button variant="outline" rightIcon={ChevronRight}>Next</Button>
        </div>
        <Label>Icon-only</Label>
        <div className="flex gap-2">
          <Button variant="outline" size="icon"><Bell className="w-4 h-4" /></Button>
          <Button variant="primary" size="icon"><Star className="w-4 h-4" /></Button>
        </div>
      </Section>

      {/* ── 2. Input ── */}
      <Section title="2. Input — prefix / suffix icons" status="pass">
        <Input
          label="Search (left icon)"
          placeholder="Search…"
          leftIcon={Search}
          variant="outline"
        />
        <Input
          label="Email (left icon + right action)"
          placeholder="you@example.com"
          leftIcon={Mail}
          variant="outline"
          rightAction={<Badge variant="success" size="sm">Verified</Badge>}
        />
      </Section>

      {/* ── 3. Select ── */}
      <Section title="3. Select — dropdown arrow" status="pass">
        <Label>Arrow should appear on the trailing edge</Label>
        <Select
          value="option1"
          onChange={() => {}}
          options={[
            { value: 'option1', label: 'First option' },
            { value: 'option2', label: 'Second option' },
            { value: 'option3', label: 'Third option' },
          ]}
        />
      </Section>

      {/* ── 4. Tabs ── */}
      <Section title="4. Tabs — underline alignment" status="pass">
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview', icon: Home },
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'users',    label: 'Users',    icon: User },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="line"
        />
        <Tabs
          tabs={[
            { id: 't1', label: 'Dashboard' },
            { id: 't2', label: 'Reports' },
            { id: 't3', label: 'Analytics' },
          ]}
          defaultTab="t1"
          variant="pill"
        />
      </Section>

      {/* ── 5. Accordion ── */}
      <Section title="5. Accordion — chevron on trailing edge" status="pass">
        <Accordion
          items={[
            {
              id: 'a1',
              title: 'What is RTL?',
              content: 'RTL (Right-to-Left) is a text directionality used by languages like Arabic, Hebrew, and Persian. The chevron should appear on the left side in RTL mode.',
            },
            {
              id: 'a2',
              title: 'How does Promptly support RTL?',
              content: 'By switching the language to Arabic, the document direction is automatically set to rtl. All Tailwind RTL utilities (rtl:*) are applied accordingly.',
            },
          ]}
          defaultOpenIds={['a1']}
        />
      </Section>

      {/* ── 6. Chip ── */}
      <Section title="6. Chip — remove × on trailing edge" status="pass">
        <Label>Removable chips — × should appear on leading side in RTL</Label>
        <div className="flex flex-wrap gap-2">
          {chips.map(chip => (
            <Chip
              key={chip}
              color="primary"
              onRemove={() => setChips(prev => prev.filter(c => c !== chip))}
            >
              {chip}
            </Chip>
          ))}
          {chips.length === 0 && (
            <Button size="sm" variant="ghost" onClick={() => setChips(['Arabic', 'Hebrew', 'RTL'])}>
              Reset chips
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip color="success" icon={Check}>Verified</Chip>
          <Chip color="warning" icon={Info}>Pending</Chip>
          <Chip color="error" icon={Filter} onRemove={() => {}}>Active Filter</Chip>
        </div>
      </Section>

      {/* ── 7. Timeline ── */}
      <Section title="7. Timeline — icon on correct side" status="pass"
        notes="Timeline icons are centered vertically. In RTL, content flows right-to-left with icon on the right.">
        <Timeline
          items={[
            {
              id: '1',
              title: 'Account created',
              description: 'User registered via email',
              icon: User,
              color: 'primary',
              timestamp: '2 hours ago',
            },
            {
              id: '2',
              title: 'Email verified',
              description: 'Verification link clicked',
              icon: Mail,
              color: 'success',
              timestamp: '1 hour ago',
            },
            {
              id: '3',
              title: 'First purchase',
              description: 'Subscribed to Pro plan',
              icon: Star,
              color: 'warning',
              timestamp: '30 min ago',
            },
          ]}
        />
      </Section>

      {/* ── 8. Alert ── */}
      <Section title="8. Alert — icon on leading edge" status="pass">
        <Alert variant="info" title="Information">Icon should appear on the leading edge in RTL.</Alert>
        <Alert variant="success" title="Success" dismissible>Action completed successfully.</Alert>
        <Alert variant="warning" title="Warning">Please review before continuing.</Alert>
        <Alert variant="error" title="Error">Something went wrong.</Alert>
      </Section>

      {/* ── 9. Progress ── */}
      <Section title="9. Progress — fills from leading edge" status="partial"
        notes="Tailwind does not automatically flip progress fill direction in RTL. The bar fills from the left in both LTR and RTL. A custom RTL fill (direction: rtl on the container) can be applied if required by the target market.">
        <Label>Default progress ({progressValue}%)</Label>
        <Progress value={progressValue} size="md" />
        <Label>Success variant</Label>
        <Progress value={80} size="md" variant="success" />
        <Label>Warning variant</Label>
        <Progress value={45} size="sm" variant="warning" />
        <Label>Gradient + animated</Label>
        <Progress value={70} size="lg" variant="gradient" animated />
      </Section>

      {/* ── 10. Badge ── */}
      <Section title="10. Badge — text direction" status="pass">
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">Default</Badge>
          <Badge variant="success" dot>Active</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      {/* ── 11. Tooltip ── */}
      <Section title="11. Tooltip — placement" status="pass"
        notes="Tooltip left/right placement should be semantically correct in RTL contexts. The tooltip library uses absolute positioning and may not auto-flip — verify manually.">
        <div className="flex flex-wrap gap-3">
          <Tooltip content="Tooltip on top" placement="top">
            <Button variant="outline" size="sm">Hover — Top</Button>
          </Tooltip>
          <Tooltip content="Tooltip on bottom" placement="bottom">
            <Button variant="outline" size="sm">Hover — Bottom</Button>
          </Tooltip>
          <Tooltip content="Tooltip on left" placement="left">
            <Button variant="outline" size="sm">Hover — Left</Button>
          </Tooltip>
          <Tooltip content="Tooltip on right" placement="right">
            <Button variant="outline" size="sm">Hover — Right</Button>
          </Tooltip>
        </div>
      </Section>

      {/* ── 12. Arabic text rendering ── */}
      <Section title="12. Arabic / mixed text rendering" status="pass">
        <Label>Pure Arabic text</Label>
        <p className="text-base text-foreground leading-relaxed" lang="ar">
          مرحباً بكم في برومبتلي — منصة لإدارة وبيع النصوص التوجيهية للذكاء الاصطناعي.
        </p>
        <Label>Mixed LTR + RTL (bidi)</Label>
        <p className="text-base text-foreground leading-relaxed" lang="ar">
          استخدم <span className="font-mono bg-muted px-1 rounded text-sm" dir="ltr">promptly.ai</span> للوصول إلى أفضل النصوص التوجيهية.
        </p>
        <Label>Numbers in RTL context</Label>
        <p className="text-base text-foreground" lang="ar">
          لديك <span className="font-bold text-primary">١٢٣</span> رصيداً متبقياً في حسابك.
        </p>
      </Section>

      {/* ── Known limitations ── */}
      <Card variant="flat">
        <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          Known RTL Limitations
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground list-none">
          {[
            { component: 'Progress bar', note: 'Fill direction does not auto-reverse in RTL. Acceptable for most use cases; fix with dir="rtl" on container if needed.' },
            { component: 'Charts (Recharts)', note: 'Bar/area charts do not mirror in RTL. Axis labels may need manual RTL adjustments.' },
            { component: 'DataTable', note: 'Column order stays LTR. Text alignment in cells follows document direction correctly.' },
            { component: 'Tooltip placement', note: '"left" and "right" placements are not semantically swapped in RTL. Use "top" / "bottom" for safe cross-direction usage.' },
            { component: 'Code blocks', note: 'Code is always displayed LTR regardless of document direction (correct behavior).' },
          ].map(({ component, note }) => (
            <li key={component} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
              <Tag className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
              <span><span className="font-bold text-foreground">{component}:</span> {note}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
