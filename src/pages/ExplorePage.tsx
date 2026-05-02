import { useState, useEffect } from 'react';
import { collection, query, getDocs, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Prompt } from '../types';
import PromptCard from '../components/PromptCard';
import { Search, SlidersHorizontal, ChevronDown, Filter } from 'lucide-react';
import { motion } from 'motion/react';

import { MOCK_PROMPTS } from '../constants/mocks';

export default function ExplorePage() {
  const [prompts, setPrompts] = useState<Prompt[]>(MOCK_PROMPTS); // Placeholder mock data
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeModel, setActiveModel] = useState('All');

  useEffect(() => {
    async function fetchPrompts() {
      try {
        const q = query(collection(db, 'prompts'), limit(25));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const fetchedItems = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt));
          // Merge mock with items just for diversity in demo if needed, but let's prefer DB
          setPrompts(fetchedItems);
        } else {
          // If empty, keep mocks
          setPrompts(MOCK_PROMPTS);
        }
      } catch (error) {
        console.warn("Firestore fetch error, using mocks:", error);
        setPrompts(MOCK_PROMPTS);
      } finally {
        setLoading(false);
      }
    }
    fetchPrompts();
  }, []);

  const filteredPrompts = prompts.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModel = activeModel === 'All' || p.model === activeModel;
    return matchesSearch && matchesModel;
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="max-w-xl flex-grow">
          <h1 className="text-4xl font-bold mb-4 tracking-tight">Explore Prompts</h1>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by keyword, role, or task..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-xl min-w-max">
            {['All', 'GPT-4', 'Claude-3', 'Gemini Pro'].map(model => (
              <button
                key={model}
                onClick={() => setActiveModel(model)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeModel === model 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {model}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && prompts.length === 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-slate-100 animate-pulse rounded-2xl h-64" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPrompts.length > 0 ? (
            filteredPrompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))
          ) : (
            <div className="col-span-full text-center py-24">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">No prompts found</h3>
              <p className="text-slate-500">Try adjusting your keywords or filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
