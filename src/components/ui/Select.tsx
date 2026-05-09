import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge tailwind classes
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange: (value: any) => void;
  placeholder?: string;
  isMulti?: boolean;
  isSearchable?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  label?: string;
}

/**
 * A professional, custom-styled Select component with support for:
 * - Search/Filter
 * - Multi-select with tags
 * - Custom descriptions
 * - Active state styling
 */
export default function Select({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  isMulti = false,
  isSearchable = true,
  className,
  disabled = false,
  id,
  name,
  label
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectId = id || name || `select-${Math.random().toString(36).substr(2, 9)}`;

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync selected options from values
  const selectedOptions = isMulti
    ? options.filter(opt => Array.isArray(value) && value.includes(opt.value))
    : options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opt.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (optionValue: string) => {
    if (isMulti) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  const removeOption = (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    if (isMulti) {
      const currentValues = Array.isArray(value) ? value : [];
      onChange(currentValues.filter(v => v !== optionValue));
    } else {
      onChange("");
    }
  };

  return (
    <div className={cn("relative w-full space-y-1.5", className)} ref={containerRef}>
      {label && (
        <label 
          htmlFor={selectId} 
          className="block text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground px-1"
        >
          {label}
        </label>
      )}
      <input
        type="hidden"
        name={name || id}
        value={isMulti ? (Array.isArray(value) ? value.join(',') : '') : (value as string || '')}
        autoComplete="off"
      />
      {/* Trigger Area */}
      <div
        id={selectId}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex min-h-[48px] w-full items-center justify-between rounded-md border-2 border-border bg-card px-4 py-2 text-sm transition-all cursor-pointer hover:border-primary/40",
          isOpen && "ring-4 ring-primary/10 border-primary shadow-sm",
          disabled && "opacity-50 cursor-not-allowed grayscale pointer-events-none"
        )}
      >
        <div className="flex flex-wrap gap-1.5 flex-grow">
          {isMulti ? (
            Array.isArray(selectedOptions) && selectedOptions.length > 0 ? (
              selectedOptions.map(opt => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg text-[11px] font-bold tracking-tight animate-in fade-in zoom-in duration-200"
                >
                  {opt.label}
                  <X
                    className="w-3.5 h-3.5 hover:bg-primary/20 rounded-full cursor-pointer transition-colors p-0.5"
                    onClick={(e) => removeOption(e, opt.value)}
                  />
                </span>
              ))
            ) : (
              <span className="text-muted-foreground/60">{placeholder}</span>
            )
          ) : (
            selectedOptions ? (
              <span className="text-foreground font-medium">{(selectedOptions as SelectOption).label}</span>
            ) : (
              <span className="text-muted-foreground/60">{placeholder}</span>
            )
          )}
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-300 ml-2", isOpen && "rotate-180")} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full rounded-2xl border border-border bg-card shadow-2xl p-1 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
          {isSearchable && (
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="text"
                  id={id ? `${id}-search` : undefined}
                  name={name ? `${name}_search` : undefined}
                  autoFocus
                  className="w-full bg-muted/50 border border-transparent rounded-xl pl-9 pr-4 py-2 text-sm focus:border-primary/20 focus:bg-card focus:outline-none transition-all placeholder:text-muted-foreground/40"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          <div className="max-h-[280px] overflow-y-auto p-1 scrollbar-hide">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = isMulti
                  ? Array.isArray(value) && value.includes(opt.value)
                  : value === opt.value;

                return (
                  <div
                    key={opt.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(opt.value);
                    }}
                    className={cn(
                      "group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm cursor-pointer transition-all duration-200 mb-0.5",
                      isSelected 
                        ? "bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20" 
                        : "hover:bg-primary/5 text-foreground hover:text-primary"
                    )}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        {opt.icon && <opt.icon className={cn("w-4 h-4", isSelected ? "text-primary-foreground" : "text-primary")} />}
                        <span>{opt.label}</span>
                      </div>
                      {opt.description && (
                        <span className={cn(
                          "text-[10px] opacity-70",
                          isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}>
                          {opt.description}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 animate-in zoom-in" />}
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center flex flex-col items-center gap-2">
                <Search className="w-8 h-8 text-muted-foreground/20" />
                <span className="text-xs text-muted-foreground">No matches found for "{searchTerm}"</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
