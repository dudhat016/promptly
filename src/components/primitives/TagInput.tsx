import { Plus, X } from 'lucide-react';
import React, { useState, KeyboardEvent, useId } from 'react';
import { cn } from '../../lib/utils';
import Chip from './Chip';

interface TagInputProps {
  label?: string;
  placeholder?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

/**
 * A professional Tag Input component for SEO keywords, categories, and tags.
 * Supports: Enter/Comma to add, Backspace to remove, and duplicate prevention.
 */
export default function TagInput({
  label,
  placeholder = "Type and press enter...",
  tags = [],
  onChange,
  error,
  helperText,
  required,
  className,
  id
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const generatedId = useId();
  const inputId = id || generatedId;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const trimmed = inputValue.trim().replace(/,$/, '');
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      onChange(newTags);
      setInputValue("");
    } else {
      setInputValue("");
    }
  };

  const removeTag = (index: number) => {
    const newTags = [...tags];
    newTags.splice(index, 1);
    onChange(newTags);
  };

  return (
    <div className={cn("space-y-1.5 w-full", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-md font-semibold cursor-pointer text-muted-foreground px-1"
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}

      <div
        className={cn(
          "flex flex-wrap gap-2 p-2 min-h-[44px] w-full rounded-md border bg-card transition-colors focus-within:border-primary",
          error ? "border-destructive" : "border-border hover:border-primary/40"
        )}
        onClick={() => document.getElementById(inputId)?.focus()}
      >
        {tags.map((tag, index) => (
          <Chip
            key={`${tag}-${index}`}
            variant="soft"
            color="primary"
            size="sm"
            onRemove={() => removeTag(index)}
            className="animate-in fade-in zoom-in duration-200"
          >
            {tag}
          </Chip>
        ))}
        
        <input
          id={inputId}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-grow bg-transparent border-none outline-none text-sm min-w-[120px] h-7 text-foreground placeholder:text-muted-foreground/40"
          autoComplete="off"
        />
      </div>

      {(error || helperText) && (
        <div className="px-1">
          {error ? (
            <p className="text-[11px] font-bold text-destructive animate-in fade-in slide-in-from-top-1">
              {error}
            </p>
          ) : (
            <p className="text-[11px] font-medium text-muted-foreground/60">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
}
