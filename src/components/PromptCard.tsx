import { Link } from 'react-router-dom';
import { Prompt } from '../types';
import { Heart, Zap, Copy, ExternalLink, Tag, Eye, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PromptCardProps {
  prompt: Prompt;
  isUnlocked?: boolean;
}

export default function PromptCard({ prompt, isUnlocked = false }: PromptCardProps) {
  const { isFavorited, toggleFavorite, user } = useAuth();
  const favorited = prompt.id ? isFavorited(prompt.id) : false;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
            {prompt.model}
          </span>
          {prompt.isPaid && (
            <span className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ring-1 ring-amber-200">
              <Zap className="w-2.5 h-2.5" />
              Paid
            </span>
          )}
        </div>
        <button 
          onClick={() => prompt.id && toggleFavorite(prompt.id)}
          className={cn(
            "p-2 rounded-full transition-colors",
            favorited ? "text-rose-500 bg-rose-50" : "text-slate-300 hover:text-rose-500 hover:bg-slate-50"
          )}
        >
          <Heart className={cn("w-5 h-5", favorited && "fill-current")} />
        </button>
      </div>

      <Link to={`/prompt/${prompt.id}`} className="block flex-grow">
        <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {prompt.title}
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-3">
          {prompt.description}
        </p>
      </Link>

      <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-slate-400 group/item">
            <Heart className={cn("w-3 h-3", favorited && "fill-rose-500 text-rose-500")} />
            <span className={cn("text-[11px] font-bold", favorited && "text-rose-600")}>
              {prompt.likesCount || 0}
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Eye className="w-3 h-3" />
            <span className="text-[11px] font-bold">{prompt.viewsCount || 0}</span>
          </div>
        </div>
        <Link 
          to={`/prompt/${prompt.id}`}
          className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all font-bold text-xs flex items-center gap-1 border-b-2"
        >
          View
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </motion.div>
  );
}
