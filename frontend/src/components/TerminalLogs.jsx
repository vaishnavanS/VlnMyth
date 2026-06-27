import { Cpu, Terminal as TerminalIcon } from 'lucide-react';

const TerminalLogs = ({ logs, isAnalyzing }) => {
  if (!isAnalyzing && logs.length === 0) return null;

  const steps = [
    { id: 1, label: "Orchestrate", model: "Gemini 1.5" },
    { id: 2, label: "Inspect", model: "Llama/Nemotron" },
    { id: 3, label: "Translate", model: "Llama 3.3" },
    { id: 4, label: "Structure", model: "Mixtral" }
  ];

  return (
    <div className="card-panel p-6 rounded-2xl mb-12 border-white/5 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <h3 className="font-outfit font-bold text-lg text-white tracking-tight">
            Audit Pipeline Status
          </h3>
        </div>
        <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-white/5 border border-white/10">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Protocol:</span>
          <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">LangGraph Multi-Agent</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {steps.map((step, i) => (
          <div key={i} className={`p-4 rounded-xl border transition-all ${isAnalyzing && i === 1 ? 'border-cyan-500/50 bg-cyan-500/5 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'border-white/5 bg-black/40'}`}>
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">
              Step {step.id}
            </div>
            <div className={`text-sm font-outfit font-bold ${isAnalyzing && i === 1 ? 'text-cyan-400' : 'text-white'}`}>
              {step.label}
            </div>
            <div className="text-[9px] font-medium text-zinc-600 mt-1 uppercase tracking-tighter">
              {step.model}
            </div>
          </div>
        ))}
      </div>

      {/* Terminal logs list */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-b from-cyan-500/20 to-transparent blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative bg-black/60 p-5 rounded-xl font-mono text-xs border border-white/5 text-cyan-400/80 max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
            <TerminalIcon className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Live Output Stream</span>
          </div>
          {logs.map((log, index) => (
            <div key={index} className="flex gap-3">
              <span className="text-zinc-700 shrink-0 select-none">[{index.toString().padStart(2, '0')}]</span>
              <span className="text-zinc-300 tracking-tight">{log}</span>
            </div>
          ))}
          {isAnalyzing && (
            <div className="flex gap-3 animate-pulse">
              <span className="text-zinc-700 shrink-0 select-none">--</span>
              <span className="text-cyan-500/60 italic tracking-tight">Agent processing next instruction set...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TerminalLogs;
