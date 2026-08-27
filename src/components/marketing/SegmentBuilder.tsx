import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Filter, Trash2, Info, Save } from 'lucide-react';
import { Segment, Contact } from '../../types';
import Select from '../primitives/Select';
import Button from '../primitives/Button';
import Input from '../primitives/Input';
import { cn } from '../../lib/utils';

interface Props {
  segment: Partial<Segment> | null;
  contacts: Contact[];
  onSave: (seg: any) => void;
  onCancel: () => void;
}

const OPERATORS_BY_FIELD: Record<string, string[]> = {
  email: ['equals', 'contains', 'in', 'not_in'],
  displayName: ['equals', 'contains', 'in', 'not_in'],
  lastActivity: ['greater_than', 'less_than', 'equals'],
  tags: ['in', 'not_in', 'contains'],
};

export default function SegmentBuilder({ segment, contacts, onSave, onCancel }: Props) {
  const [activeSeg, setActiveSeg] = useState<Partial<Segment>>(segment || {
    name: '',
    description: '',
    matchType: 'and',
    filters: []
  });

  const addFilter = () => {
    setActiveSeg({
      ...activeSeg,
      filters: [...(activeSeg.filters || []), { field: 'email', operator: 'contains', value: '' }]
    });
  };

  const removeFilter = (index: number) => {
    const newFilters = [...(activeSeg.filters || [])];
    newFilters.splice(index, 1);
    setActiveSeg({ ...activeSeg, filters: newFilters });
  };

  const updateFilter = (index: number, data: any) => {
    const newFilters = [...(activeSeg.filters || [])];
    newFilters[index] = { ...newFilters[index], ...data };
    
    // Reset operator if field changed and current operator is invalid
    if (data.field) {
      const validOps = OPERATORS_BY_FIELD[data.field] || [];
      if (!validOps.includes(newFilters[index].operator)) {
        newFilters[index].operator = (validOps[0] || 'equals') as any;
      }
    }
    
    setActiveSeg({ ...activeSeg, filters: newFilters });
  };

  const getUniqueValues = (field: string) => {
    const values = new Set<string>();
    contacts.forEach(c => {
      const val = (c as any)[field];
      if (val !== undefined && val !== null) {
        if (Array.isArray(val)) {
          val.forEach(v => values.add(String(v)));
        } else {
          values.add(String(val));
        }
      }
    });
    return Array.from(values);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-3xl border border-border shadow-sm p-8 space-y-8">
        <div className="grid md:grid-cols-3 gap-8">
            <Input 
              label="Segment Name"
              type="text"
              value={activeSeg.name}
              onChange={e => setActiveSeg({...activeSeg, name: e.target.value})}
              variant="outline"
              placeholder="e.g. Pro Users in New York"
            />
          <div className="space-y-4 md:col-span-1">
            <label className="block text-xs font-bold uppercase text-muted-foreground tracking-widest ml-2">Match Logic</label>
            <div className="inline-flex items-center bg-muted/60 p-1 rounded-full border border-border shadow-inner w-full">
              {(['and', 'or'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveSeg({ ...activeSeg, matchType: type })}
                  className={cn(
                    "flex-1 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-200",
                    activeSeg.matchType === type
                      ? "bg-card text-primary shadow-md border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {type === 'and' ? 'ALL (AND)' : 'ANY (OR)'}
                </button>
              ))}
            </div>
          </div>
          <Input 
            label="Description"
            type="text"
            value={activeSeg.description}
            onChange={e => setActiveSeg({...activeSeg, description: e.target.value})}
            variant="outline"
            placeholder="Who does this segment include?"
          />
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter Conditions
            </h4>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {activeSeg.matchType === 'and' ? 'Matches IF ALL conditions are met' : 'Matches IF ANY condition is met'}
            </span>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {activeSeg.filters?.map((filter, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-wrap items-end gap-4 bg-card p-8 rounded-lg border border-border shadow-xl shadow-black/5 group relative"
                >
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[8px] font-bold uppercase text-muted-foreground mb-2 ml-1 tracking-[0.2em]">Field</label>
                    <Select
                      value={filter.field}
                      onChange={val => updateFilter(idx, { field: val })}
                      options={[
                        { label: 'Email Address', value: 'email' },
                        { label: 'Display Name', value: 'displayName' },
                        { label: 'Last Activity', value: 'lastActivity' },
                        { label: 'Tags', value: 'tags' }
                      ]}
                      isSearchable={false}
                    />
                  </div>

                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[8px] font-bold uppercase text-muted-foreground mb-2 ml-1 tracking-[0.2em]">Operator</label>
                    <Select
                      value={filter.operator}
                      onChange={val => updateFilter(idx, { operator: val })}
                      options={(OPERATORS_BY_FIELD[filter.field] || []).map(op => ({
                        label: op.replace('_', ' ').charAt(0).toUpperCase() + op.replace('_', ' ').slice(1),
                        value: op
                      }))}
                      isSearchable={false}
                    />
                  </div>

                  <div className="flex-[2] min-w-[250px]">
                    <label className="block text-[8px] font-bold uppercase text-muted-foreground mb-2 ml-1 tracking-[0.2em]">Value</label>
                    <Select
                      value={filter.value}
                      onChange={val => updateFilter(idx, { value: val })}
                      options={getUniqueValues(filter.field).map(v => ({ label: v, value: v }))}
                      isSearchable={true}
                      placeholder="Select or type a value..."
                    />
                  </div>

                  <Button
                    onClick={() => removeFilter(idx)}
                    variant="ghost"
                    size="icon"
                    className="shrink-0 w-10 h-10 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 border border-border hover:border-rose-500/30 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>

            <Button 
              onClick={addFilter}
              variant="outline"
              size="lg"
              fullWidth
              className="py-16 border-2 border-dashed border-border hover:border-indigo-400 hover:bg-primary/5 flex-col gap-3 h-auto"
            >
              <div className="w-12 h-12 bg-card border border-border rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-bold text-xs uppercase tracking-[0.2em]">Add Condition</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center">
            <Info className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs font-medium text-muted-foreground max-w-xs leading-relaxed">
            Contacts are dynamically matched based on the active rule set.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={onCancel} variant="secondary" size="md" className="font-bold">
            Discard
          </Button>
          <Button
            onClick={() => onSave(activeSeg)}
            variant="primary"
            size="md"
            leftIcon={Save}
            className="font-bold shadow-sm shadow-primary/20"
          >
            Save Segment
          </Button>
        </div>
      </div>
    </div>
  );
}
