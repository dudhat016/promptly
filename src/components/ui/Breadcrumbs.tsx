import { ChevronRight, Home } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 py-3 px-3 bg-slate-200">
      <Link to="/dashboard" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
        <Home className="w-3 h-3" />
        Workspace
      </Link>
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;

        return (
          <React.Fragment key={to}>
            <ChevronRight className="w-3 h-3 opacity-30" />
            {last ? (
              <span className="text-slate-900">{value.replace(/-/g, ' ')}</span>
            ) : (
              <Link to={to} className="hover:text-indigo-600 transition-colors">
                {value.replace(/-/g, ' ')}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
