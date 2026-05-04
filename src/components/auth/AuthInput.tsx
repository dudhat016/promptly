import { LucideIcon } from 'lucide-react';
import React from 'react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  error?: string;
}

export default function AuthInput({ label, icon: Icon, error, ...props }: AuthInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
        {label}
      </label>
      <div className="relative group">
        <Icon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
        <input
          {...props}
          className={`w-full bg-slate-50 border-2 ${error ? 'border-red-100 focus:border-red-500' : 'border-transparent focus:border-indigo-600'} rounded-2xl py-4 pl-14 pr-6 text-sm font-bold placeholder:text-slate-300 focus:bg-white focus:outline-none transition-all`}
        />
      </div>
      {error && (
        <p className="text-[10px] font-bold text-red-500 ml-4 animate-pulse uppercase tracking-wider">
          {error}
        </p>
      )}
    </div>
  );
}
