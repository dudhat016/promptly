import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useRef, useState, useId } from 'react';
import { cn } from '../../lib/utils';
import Button from './Button';

interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
  id?: string;
  name?: string;
}

type ViewMode = 'days' | 'months' | 'years';

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = "Select date...",
  error,
  className,
  disabled,
  required,
  minDate,
  maxDate,
  id,
  name
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const containerRef = useRef<HTMLDivElement>(null);
  
  const generatedId = useId();
  const datePickerId = id || name || generatedId;

  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // Internal state for calendar view (Month/Year)
  const [viewDate, setViewDate] = useState(() => {
    return (value ? parseDate(value) : null) || new Date();
  });

  const selectedDate = value ? parseDate(value) : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setViewMode('days');
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === 'days') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    } else if (viewMode === 'years') {
      setViewDate(new Date(viewDate.getFullYear() - 12, viewDate.getMonth(), 1));
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === 'days') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    } else if (viewMode === 'years') {
      setViewDate(new Date(viewDate.getFullYear() + 12, viewDate.getMonth(), 1));
    }
  };

  const handleDateSelect = (day: number) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const formatted = `${year}-${month}-${d}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleMonthSelect = (monthIdx: number) => {
    setViewDate(new Date(viewDate.getFullYear(), monthIdx, 1));
    setViewMode('days');
  };

  const handleYearSelect = (year: number) => {
    setViewDate(new Date(year, viewDate.getMonth(), 1));
    setViewMode('months');
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const totalDays = daysInMonth(currentYear, currentMonth);
  const startDay = firstDayOfMonth(currentYear, currentMonth);

  // Generate Year Grid (12 years based on current viewDate)
  const startYear = currentYear - (currentYear % 12);
  const years = Array.from({ length: 12 }, (_, i) => startYear + i);

  return (
    <div className={cn("relative w-full space-y-1.5", className)} ref={containerRef}>
      {label && (
        <label 
          htmlFor={datePickerId}
          className="block text-md font-semibold cursor-pointer text-muted-foreground px-1"
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}

      <input
        id={datePickerId}
        type="hidden"
        name={name || id}
        value={value || ''}
        readOnly
      />

      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="grid"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) setViewMode('days');
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            !disabled && setIsOpen(!isOpen);
          }
        }}
        className={cn(
          "flex min-h-[44px] w-full items-center gap-3 rounded-md border bg-card px-4 py-1.5 text-base transition-colors cursor-pointer group",
          isOpen ? "border-primary" : "border-border hover:border-primary/40",
          error && "border-destructive",
          disabled && "opacity-50 cursor-not-allowed grayscale pointer-events-none"
        )}
      >
        <CalendarIcon className={cn("w-4 h-4 transition-colors", isOpen ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("flex-grow font-bold", !value && "text-muted-foreground/40")}>
          {value ? parseDate(value)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : placeholder}
        </span>
        {value && !required && (
          <X
            className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-rose-500 transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
          />
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "circOut" }}
            className="absolute z-[100] w-[320px] rounded-[2rem] border border-border bg-card shadow-2xl p-6 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
                  className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1 hover:bg-primary/5 px-1 py-0.5 rounded transition-colors w-fit"
                >
                  {viewMode === 'years' ? `${years[0]} - ${years[11]}` : currentYear}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                  className="text-lg font-black text-foreground leading-none hover:bg-muted/50 px-1 py-0.5 rounded transition-colors w-fit"
                >
                  {monthNames[currentMonth]}
                </button>
              </div>
              <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/50">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg" 
                  onClick={handlePrevMonth}
                  disabled={viewMode === 'months'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg" 
                  onClick={handleNextMonth}
                  disabled={viewMode === 'months'}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {viewMode === 'days' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="animate-in fade-in duration-300"
              >
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map(day => (
                    <div key={day} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 text-center h-8 flex items-center justify-center">
                      {day[0]}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: startDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-9 w-9" />
                  ))}
                  {Array.from({ length: totalDays }).map((_, i) => {
                    const day = i + 1;
                    const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();
                    const isSelected = selectedDate?.toDateString() === new Date(currentYear, currentMonth, day).toDateString();
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleDateSelect(day)}
                        className={cn(
                          "h-9 w-9 cursor-pointer rounded-xl text-xs font-bold transition-all flex items-center justify-center relative",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110 z-10"
                            : "hover:bg-primary/10 hover:text-primary text-foreground",
                          isToday && !isSelected && "after:content-[''] after:absolute after:bottom-1.5 after:w-1 after:h-1 after:bg-primary after:rounded-full"
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {viewMode === 'months' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="grid grid-cols-3 gap-2 py-2"
              >
                {monthNames.map((month, idx) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => handleMonthSelect(idx)}
                    className={cn(
                      "py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                      idx === currentMonth 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                        : "hover:bg-primary/10 text-foreground hover:text-primary"
                    )}
                  >
                    {month.substring(0, 3)}
                  </button>
                ))}
              </motion.div>
            )}

            {viewMode === 'years' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="grid grid-cols-3 gap-2 py-2"
              >
                {years.map(year => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => handleYearSelect(year)}
                    className={cn(
                      "py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                      year === currentYear 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                        : "hover:bg-primary/10 text-foreground hover:text-primary"
                    )}
                  >
                    {year}
                  </button>
                ))}
              </motion.div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-5 border-t border-border flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  onChange(today);
                  setViewDate(new Date());
                  setViewMode('days');
                  setIsOpen(false);
                }}
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-[11px] font-bold text-rose-500 px-1 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default DatePicker;
