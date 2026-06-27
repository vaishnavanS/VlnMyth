import { ShieldAlert, Terminal, Activity } from 'lucide-react';

const Header = ({ mockMode }) => {
  return (
    <header className="glass-panel sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/20 blur-lg rounded-lg"></div>
            <div className="relative bg-zinc-900 p-2 rounded-lg border border-cyan-500/30">
              <ShieldAlert className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-outfit font-black text-xl tracking-tight text-white">
                VULN<span className="text-cyan-400">MYTH</span>
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-tighter">Live</span>
              </div>
            </div>
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest -mt-0.5">
              Multi-Agent Security Matrix
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {mockMode && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/5 border border-amber-500/20">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-tight">Demo Mode</span>
            </div>
          )}
          <div className="h-8 w-[1px] bg-white/5 mx-2 hidden sm:block"></div>
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noreferrer" 
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-zinc-400 hover:text-white"
          >
            <Terminal className="w-5 h-5" />
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
