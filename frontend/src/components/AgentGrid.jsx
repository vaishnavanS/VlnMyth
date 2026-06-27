import { Cpu, Sparkles, ShieldAlert, Wrench, Settings, Layers } from 'lucide-react';

const AgentGrid = ({ apiKeysStatus }) => {
  const agents = [
    { 
      name: "Orchestrator", 
      model: "Gemini 1.5", 
      desc: "Codebase mapping & task distribution",
      icon: Sparkles,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10"
    },
    { 
      name: "Vuln Hunter", 
      model: "Llama 3.3", 
      desc: "OWASP Top 10 & security flaw detection",
      icon: ShieldAlert,
      color: "text-rose-400",
      bg: "bg-rose-500/10"
    },
    { 
      name: "Bug Detector", 
      model: "Nemotron", 
      desc: "Logic flows & unhandled exceptions",
      icon: Wrench,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10"
    },
    { 
      name: "Misconfig Agent", 
      model: "Mixtral", 
      desc: "Secret exposure & policy audit",
      icon: Settings,
      color: "text-violet-400",
      bg: "bg-violet-500/10"
    },
    { 
      name: "Explainer", 
      model: "Llama 3.3", 
      desc: "Jargon-free vulnerability translation",
      icon: Layers,
      color: "text-fuchsia-400",
      bg: "bg-fuchsia-500/10"
    }
  ];

  return (
    <div className="card-panel p-8 rounded-2xl flex flex-col justify-between border-white/5">
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-white/5">
            <Cpu className="w-4 h-4 text-zinc-400" />
          </div>
          <h2 className="text-xl font-outfit font-bold text-white tracking-tight">
            Security Matrix
          </h2>
        </div>
        
        <div className="space-y-4">
          {agents.map((agent, i) => (
            <div key={i} className="group flex gap-4 p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-all">
              <div className={`p-2.5 rounded-lg ${agent.bg} ${agent.color} border border-current/10 shrink-0`}>
                <agent.icon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">{agent.name}</h3>
                  <span className="text-[9px] font-bold text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                    {agent.model}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{agent.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] uppercase font-black text-zinc-600 tracking-[0.2em]">API Key Relay</span>
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {apiKeysStatus ? (
            Object.entries(apiKeysStatus).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-black/40 border border-white/5">
                <div className={`w-1 h-1 rounded-full ${config ? 'bg-emerald-400 status-glow-green' : 'bg-zinc-800'}`}></div>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter truncate">
                  {key.replace('_API_KEY', '')}
                </span>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-[9px] text-zinc-600 animate-pulse uppercase font-bold text-center py-2">
              Syncing keys...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentGrid;
