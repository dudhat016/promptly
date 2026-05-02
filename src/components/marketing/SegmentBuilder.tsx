import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, X, Filter, Sliders, ChevronDown, 
  Trash2, Database, Info, Save, Search, Check
} from 'lucide-react';
import { Segment, Contact } from '../../types';

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
    <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] w-full">
      <div className="p-8 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Segment Rules</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 italic">Define automated filters for your contacts</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
      </div>

      <div className="flex-1 overflow-auto p-10 space-y-10">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Segment Name</label>
            <input 
              type="text"
              value={activeSeg.name}
              onChange={e => setActiveSeg({...activeSeg, name: e.target.value})}
              className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner"
              placeholder="e.g. Pro Users in New York"
            />
          </div>
          <div className="space-y-4 md:col-span-1">
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Match Logic</label>
            <div className="flex bg-slate-50 p-1 rounded-2xl shadow-inner">
              <button 
                onClick={() => setActiveSeg({...activeSeg, matchType: 'and'})}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSeg.matchType === 'and' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Match ALL (AND)
              </button>
              <button 
                onClick={() => setActiveSeg({...activeSeg, matchType: 'or'})}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSeg.matchType === 'or' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Match ANY (OR)
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Description</label>
            <input 
              type="text"
              value={activeSeg.description}
              onChange={e => setActiveSeg({...activeSeg, description: e.target.value})}
              className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner"
              placeholder="Who does this segment include?"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter Conditions
            </h4>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
                  className="flex flex-wrap items-end gap-4 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 group relative"
                >
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[8px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-[0.2em]">Field</label>
                    <select 
                      value={filter.field}
                      onChange={e => updateFilter(idx, { field: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs font-bold shadow-sm focus:ring-2 focus:ring-indigo-600 appearance-none transition-all cursor-pointer"
                    >
                      <option value="email">Email Address</option>
                      <option value="displayName">Display Name</option>
                      <option value="subscriptionStatus">Subscription</option>
                      <option value="lastActivity">Last Activity</option>
                      <option value="tags">Tags</option>
                    </select>
                  </div>

                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[8px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-[0.2em]">Operator</label>
                    <select 
                      value={filter.operator}
                      onChange={e => updateFilter(idx, { operator: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs font-bold shadow-sm focus:ring-2 focus:ring-indigo-600 appearance-none transition-all cursor-pointer"
                    >
                      {(OPERATORS_BY_FIELD[filter.field] || []).map(op => (
                        <option key={op} value={op}>{op.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-[2] min-w-[250px] relative">
                    <label className="block text-[8px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-[0.2em]">Value</label>
                    
                    {/* Searchable Value Dropdown */}
                    <div className="relative">
                      <div 
                        onClick={() => setIsDropdownOpen({...isDropdownOpen, [idx]: !isDropdownOpen[idx]})}
                        className="w-full bg-slate-50 rounded-2xl p-4 text-xs font-bold shadow-sm focus-within:ring-2 focus-within:ring-indigo-600 flex items-center justify-between cursor-pointer group"
                      >
                        <span className={filter.value ? 'text-slate-900' : 'text-slate-400 italic'}>
                          {filter.value || 'Select a value...'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${isDropdownOpen[idx] ? 'rotate-180' : ''}`} />
                      </div>

                      <AnimatePresence>
                        {isDropdownOpen[idx] && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                          >
                            <div className="p-4 border-b border-slate-50">
                              <div className="bg-slate-50 rounded-xl p-2 flex items-center gap-2">
                                <Search className="w-3 h-3 text-slate-400" />
                                <input 
                                  type="text"
                                  autoFocus
                                  value={searchValue[idx] || ''}
                                  onChange={e => setSearchValue({...searchValue, [idx]: e.target.value})}
                                  placeholder="Search values..."
                                  className="w-full bg-transparent border-none text-[10px] font-bold focus:ring-0 p-1"
                                />
                              </div>
                            </div>
                            <div className="max-h-48 overflow-auto py-2">
                              {/* Custom Option */}
                              <button 
                                onClick={() => {
                                  const custom = prompt('Enter custom value:');
                                  if (custom !== null) updateFilter(idx, { value: custom });
                                  setIsDropdownOpen({...isDropdownOpen, [idx]: false});
                                }}
                                className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 border-b border-slate-50 transition-colors"
                              >
                                + Custom Value
                              </button>

                              {getUniqueValues(filter.field)
                                .filter(v => v.toLowerCase().includes((searchValue[idx] || '').toLowerCase()))
                                .map(val => (
                                  <button 
                                    key={val}
                                    onClick={() => {
                                      updateFilter(idx, { value: val });
                                      setIsDropdownOpen({...isDropdownOpen, [idx]: false});
                                    }}
                                    className="w-full text-left px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-between group transition-colors"
                                  >
                                    {val}
                                    {filter.value === val && <Check className="w-3 h-3 text-indigo-600" />}
                                  </button>
                                ))}
                              
                              {getUniqueValues(filter.field).length === 0 && (
                                <p className="p-5 text-[10px] font-bold text-slate-300 uppercase italic">No existing values found</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <button 
                    onClick={() => removeFilter(idx)}
                    className="p-4 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            <button 
              onClick={addFilter}
              className="w-full py-10 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/20 transition-all font-black text-xs uppercase tracking-widest flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                <Plus className="w-6 h-6" />
              </div>
              Add Condition
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3 text-slate-400">
           <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <Info className="w-4 h-4 text-indigo-400" />
           </div>
           <p className="text-[10px] font-bold uppercase tracking-widest max-w-xs leading-relaxed">Contacts are dynamically synchronized with this segment based on the active rule set.</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all hover:bg-slate-100">Discard</button>
          <button 
            onClick={() => onSave(activeSeg)}
            className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-3"
          >
            <Save className="w-4 h-4" />
            Save Segment
          </button>
        </div>
      </div>
    </div>
  );
}
