export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <span className="w-5 h-5 block text-white font-bold leading-none">P</span>
            </div>
            <span className="font-bold text-xl">Promptly</span>
          </div>
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} Promptly SaaS. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
