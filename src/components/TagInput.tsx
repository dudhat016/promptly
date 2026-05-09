import { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, Tag as TagIcon } from 'lucide-react';
import Button from './ui/Button';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Tag } from '../types';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ value, onChange, placeholder = "Search or add tags..." }: TagInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch available tags
  useEffect(() => {
    async function fetchTags() {
      try {
        const querySnapshot = await getDocs(collection(db, 'tags'));
        const tags = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
        setAvailableTags(tags);
      } catch (error) {
        console.error("Error fetching tags:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTags();
  }, []);

  const handleAddTag = async (tagName: string) => {
    const trimmed = tagName.trim().toLowerCase();
    if (!trimmed) return;

    // Check if tag already selected
    if (value.includes(trimmed)) {
      setSearchTerm('');
      return;
    }

    // Add to current selection
    onChange([...value, trimmed]);
    setSearchTerm('');

    // Check if tag exists in database, if not, create it
    const tagExists = availableTags.some(t => t.name.toLowerCase() === trimmed);
    if (!tagExists) {
      try {
        const newTagData = {
          name: trimmed,
          color: '#6366f1', // default indigo color
          createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'tags'), newTagData);
        setAvailableTags([...availableTags, { id: docRef.id, ...newTagData } as Tag]);
      } catch (err) {
        console.error("Error creating new tag:", err);
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(searchTerm);
    } else if (e.key === 'Backspace' && !searchTerm && value.length > 0) {
      handleRemoveTag(value[value.length - 1]);
    }
  };

  const filteredTags = availableTags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
    !value.includes(tag.name.toLowerCase())
  );

  const exactMatch = availableTags.some(t => t.name.toLowerCase() === searchTerm.trim().toLowerCase());

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        className="min-h-[56px] w-full bg-muted/50 border border-border rounded-md p-2 flex flex-wrap gap-2 items-center focus-within:bg-card focus-within:border-primary focus-within:ring-1 focus-within:ring-indigo-600 transition-all cursor-text"
        onClick={() => setIsOpen(true)}
      >
        {value.map(tag => (
          <span 
            key={tag} 
            className="flex items-center gap-1 bg-primary/8 text-primary px-3 py-1.5 rounded-md text-sm font-bold border border-indigo-100"
          >
            <TagIcon className="w-3 h-3" />
            {tag}
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(tag);
              }}
              variant="ghost"
              size="icon"
              className="w-5 h-5 ml-1 hover:bg-primary/20 rounded-full"
            >
              <X className="w-3 h-3" />
            </Button>
          </span>
        ))}
        
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-grow bg-transparent border-none outline-none text-sm min-w-[120px] p-2 placeholder-slate-400"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-card rounded-md shadow-xl border border-border overflow-hidden max-h-64 flex flex-col">
          <div className="p-3 border-b border-border flex items-center gap-2 text-muted-foreground bg-muted/30">
            <Search className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Available Tags</span>
          </div>
          
          <div className="overflow-y-auto p-2 flex flex-col gap-1">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading tags...</div>
            ) : (
              <>
                {filteredTags.map(tag => (
                  <Button
                    key={tag.id}
                    type="button"
                    onClick={() => handleAddTag(tag.name)}
                    variant="ghost"
                    size="md"
                    fullWidth
                    leftIcon={TagIcon}
                    className="justify-start font-medium text-foreground hover:bg-muted/50"
                  >
                    {tag.name}
                  </Button>
                ))}
                
                {searchTerm.trim() && !exactMatch && !value.includes(searchTerm.trim().toLowerCase()) && (
                  <Button
                    type="button"
                    onClick={() => handleAddTag(searchTerm)}
                    variant="primary"
                    size="md"
                    fullWidth
                    leftIcon={Plus}
                    className="bg-primary/10 hover:bg-primary/20 text-primary border-none shadow-none mt-1 font-bold"
                  >
                    Create tag "{searchTerm.trim()}"
                  </Button>
                )}
                
                {filteredTags.length === 0 && !searchTerm.trim() && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No available tags. Type to create one.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
