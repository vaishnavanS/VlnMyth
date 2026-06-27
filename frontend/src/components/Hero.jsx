import { Sparkles } from 'lucide-react';

const Hero = () => {
  return (
    <div className="relative pt-12 pb-20 overflow-hidden">
      {/* Centered Typography */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-8 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Gen Security Matrix</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-outfit font-black text-white tracking-tight leading-[0.9] mb-6">
          DECODE YOUR <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 animate-gradient">CODE SECURITY</span>
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
          Unleash a swarm of specialist AI agents to audit your repository. 
          Get professional-grade vulnerability reports explained in plain, actionable English.
        </p>
      </div>

      {/* Visual Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-cyan-500/30 blur-[120px] rounded-full animate-pulse"></div>
      </div>
      
      <div className="scan-line-container absolute inset-0 pointer-events-none">
        <div className="scan-line"></div>
      </div>
    </div>
  );
};

export default Hero;
