import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, X, Filter, Sliders, ChevronDown, 
  Trash2, Database, Info, Save, Search, Check
} from 'lucide-react';
import { Segment, Contact } from '../../types';
import Input from '../primitives/Input';
import Select from '../primitives/Select';
import Button from '../primitives/Button';
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
  subscriptionStatus: ['equals', 'in', 'not_in'],
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

  const [searchValue, setSearchValue] = useState<Record<number, string>>({});
  const [isDropdownOpen, setIsDropdownOpen] = useState<Record<number, boolean>>({});

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
    <div className="bg-card rounded-lg border border-border overflow-hidden shadow-2xl flex flex-col max-h-[90vh] w-full">
      <div className="p-8 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground uppercase tracking-tight">Segment Rules</h3>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1 italic">Define automated filters for your contacts</p>
        </div>
        <Button 
          onClick={onCancel} 
          variant="ghost" 
          size="icon" 
          className="rounded-full text-muted-foreground"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-10 space-y-10">
        <div className="grid md:grid-cols-3 gap-8">
            <Input 
              label="Segment Name"
              type="text"
              value={activeSeg.name}
              onChange={e => setActiveSeg({...activeSeg, name: e.target.value})}
              variant="filled"
              placeholder="e.g. Pro Users in New York"
            />
          <div className="space-y-4 md:col-span-1">
            <label className="block text-xs font-bold uppercase text-muted-foreground tracking-widest ml-2">Match Logic</label>
            <div className="flex bg-muted/50 p-1 rounded-md shadow-inner">
              <Button 
                onClick={() => setActiveSeg({...activeSeg, matchType: 'and'})}
                variant={activeSeg.matchType === 'and' ? 'white' : 'ghost'}
                size="md"
                fullWidth
                className={cn(
                  "py-3 font-bold uppercase tracking-widest",
                  activeSeg.matchType === 'and' ? "text-primary shadow-md" : "text-muted-foreground"
                )}
              >
                Match ALL (AND)
              </Button>
              <Button 
                onClick={() => setActiveSeg({...activeSeg, matchType: 'or'})}
                variant={activeSeg.matchType === 'or' ? 'white' : 'ghost'}
                size="md"
                fullWidth
                className={cn(
                  "py-3 font-bold uppercase tracking-widest",
                  activeSeg.matchType === 'or' ? "text-primary shadow-md" : "text-muted-foreground"
                )}
              >
                Match ANY (OR)
              </Button>
            </div>
          </div>
          <Input 
            label="Description"
            type="text"
            value={activeSeg.description}
            onChange={e => setActiveSeg({...activeSeg, description: e.target.value})}
            variant="filled"
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
                        { label: 'Subscription', value: 'subscriptionStatus' },
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

                  <div className="flex-[2] min-w-[250px] relative">
                    <label className="block text-[8px] font-bold uppercase text-muted-foreground mb-2 ml-1 tracking-[0.2em]">Value</label>
                    
                    {/* Searchable Value Dropdown */}
                    <div className="relative">
                      <div 
                        onClick={() => setIsDropdownOpen({...isDropdownOpen, [idx]: !isDropdownOpen[idx]})}
                        className="w-full bg-muted/50 rounded-md p-4 text-xs font-bold shadow-sm focus-within:ring-2 focus-within:ring-indigo-600 flex items-center justify-between cursor-pointer group"
                      >
                        <span className={filter.value ? 'text-foreground' : 'text-muted-foreground italic'}>
                          {filter.value || 'Select a value...'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground/40 transition-transform ${isDropdownOpen[idx] ? 'rotate-180' : ''}`} />
                      </div>

                      <AnimatePresence>
                        {isDropdownOpen[idx] && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-card rounded-lg shadow-2xl border border-border z-50 overflow-hidden"
                          >
                            <div className="p-4 border-b border-border">
                                <Input 
                                  type="text"
                                  autoFocus
                                  value={searchValue[idx] || ''}
                                  onChange={e => setSearchValue({...searchValue, [idx]: e.target.value})}
                                  placeholder="Search values..."
                                  variant="ghost"
                                  inputSize="sm"
                                  leftIcon={Search}
                                />
                            </div>
                            <div className="max-h-48 overflow-auto py-2">
                              {/* Custom Option */}
                              <Button 
                                onClick={() => {
                                  const custom = prompt('Enter custom value:');
                                  if (custom !== null) updateFilter(idx, { value: custom });
                                  setIsDropdownOpen({...isDropdownOpen, [idx]: false});
                                }}
                                variant="ghost"
                                size="md"
                                fullWidth
                                className="justify-start px-5 py-6 font-bold uppercase tracking-widest text-primary hover:bg-primary/8 border-b border-border"
                              >
                                + Custom Value
                              </Button>

                              {getUniqueValues(filter.field)
                                .filter(v => v.toLowerCase().includes((searchValue[idx] || '').toLowerCase()))
                                .map(val => (
                                  <Button 
                                    key={val}
                                    onClick={() => {
                                      updateFilter(idx, { value: val });
                                      setIsDropdownOpen({...isDropdownOpen, [idx]: false});
                                    }}
                                    variant="ghost"
                                    size="md"
                                    fullWidth
                                    className="justify-between px-5 py-6 font-bold text-muted-foreground hover:bg-muted/50"
                                  >
                                    {val}
                                    {filter.value === val && <Check className="w-3 h-3 text-primary" />}
                                  </Button>
                                ))}
                              
                              {getUniqueValues(filter.field).length === 0 && (
                                <p className="p-5 text-xs font-bold text-muted-foreground/40 uppercase italic">No existing values found</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <Button 
                    onClick={() => removeFilter(idx)}
                    variant="ghost"
                    size="icon"
                    className="p-6 text-muted-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20"
                  >
                    <Trash2 className="w-5 h-5" />
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

      <div className="p-8 bg-muted/50 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-3 text-muted-foreground">
           <div className="w-8 h-8 bg-card rounded-md flex items-center justify-center shadow-sm">
            <Info className="w-4 h-4 text-primary" />
           </div>
           <p className="text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed">Contacts are dynamically synchronized with this segment based on the active rule set.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={onCancel} variant="ghost" size="lg" className="px-8 font-bold uppercase tracking-widest">
            Discard
          </Button>
          <Button 
            onClick={() => onSave(activeSeg)}
            variant="primary"
            size="lg"
            leftIcon={Save}
            className="px-12 shadow-xl shadow-primary/20 font-bold uppercase tracking-widest"
          >
            Save Segment
          </Button>
        </div>
      </div>
    </div>
  );
}
