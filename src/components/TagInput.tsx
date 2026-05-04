import { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, Tag as TagIcon } from 'lucide-react';
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
        className="min-h-[56px] w-full bg-slate-50 border border-slate-200 rounded-2xl p-2 flex flex-wrap gap-2 items-center focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600 transition-all cursor-text"
        onClick={() => setIsOpen(true)}
      >
        {value.map(tag => (
          <span 
            key={tag} 
            className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-sm font-bold border border-indigo-100"
          >
            <TagIcon className="w-3 h-3" />
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(tag);
              }}
              className="hover:bg-indigo-200 rounded-full p-0.5 ml-1 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
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
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-h-64 flex flex-col">
          <div className="p-3 border-b border-slate-50 flex items-center gap-2 text-slate-400 bg-slate-50/50">
            <Search className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Available Tags</span>
          </div>
          
          <div className="overflow-y-auto p-2 flex flex-col gap-1">
            {loading ? (
              <div className="p-4 text-center text-sm text-slate-500">Loading tags...</div>
            ) : (
              <>
                {filteredTags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleAddTag(tag.name)}
                    className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
                  >
                    <TagIcon className="w-4 h-4 text-slate-400" />
                    {tag.name}
                  </button>
                ))}
                
                {searchTerm.trim() && !exactMatch && !value.includes(searchTerm.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => handleAddTag(searchTerm)}
                    className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-bold transition-colors mt-1"
                  >
                    <Plus className="w-4 h-4" />
                    Create tag "{searchTerm.trim()}"
                  </button>
                )}
                
                {filteredTags.length === 0 && !searchTerm.trim() && (
                  <div className="p-4 text-center text-sm text-slate-500">
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
