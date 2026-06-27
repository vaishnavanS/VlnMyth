import { useState } from 'react';
import { Info, CheckCircle, ShieldAlert, FileCode, Layers, Wrench, AlertCircle, ExternalLink } from 'lucide-react';

const FindingsTab = ({ summary, findings, error, sessionId }) => {
  const [filter, setFilter] = useState('all');

  if (error) {
    return (
      <div className="p-6 bg-rose-500/5 border border-rose-500/20 rounded-2xl text-rose-300 flex items-start gap-4">
        <div className="p-2 rounded-lg bg-rose-500/10">
          <AlertCircle className="w-5 h-5 text-rose-400" />
        </div>
        <div>
          <h4 className="font-outfit font-bold text-lg text-white">Security Audit Halted</h4>
          <p className="text-sm text-zinc-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // Calculate stats for the banner
  const secretsCount = findings.filter(f => f.type === 'secret' || f.pattern_type).length;
  const cvesCount = findings.filter(f => f.type === 'cve' || f.cve_id).length;
  const codeIssuesCount = findings.filter(f => f.source === 'agent' || (!f.type && f.source !== 'scanner')).length;

  // Filter findings based on selected tab
  const filteredFindings = findings.filter(f => {
    if (filter === 'agent') {
      return f.source === 'agent' || (!f.type && f.source !== 'scanner');
    }
    if (filter === 'cve') {
      return f.type === 'cve' || f.cve_id;
    }
    if (filter === 'secret') {
      return f.type === 'secret' || f.pattern_type;
    }
    return true; // 'all'
  });

  return (
    <div className="space-y-8">
      {/* Executive Summary Section */}
      {summary && (
        <div className="card-panel p-6 rounded-2xl border-l-4 border-l-cyan-500 overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Info className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-outfit font-bold text-lg text-white tracking-tight">Executive Summary</h3>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{summary}</p>
            </div>
          </div>
        </div>
      )}

      {findings.length > 0 && (
        <>
          {/* Summary Banner */}
          <div className="card-panel py-4 px-6 rounded-xl border border-white/10 bg-gradient-to-r from-zinc-900 via-black to-zinc-900 text-center font-outfit font-black text-xs md:text-sm tracking-widest text-zinc-300 flex flex-wrap items-center justify-center gap-2 md:gap-4 shadow-md">
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="text-white bg-rose-500/10 px-2 py-0.5 rounded font-mono font-bold border border-rose-500/10">{secretsCount}</span> Secrets Found 🔑
            </span>
            <span className="text-zinc-700 select-none">|</span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="text-white bg-amber-500/10 px-2 py-0.5 rounded font-mono font-bold border border-amber-500/10">{cvesCount}</span> CVEs Found 📦
            </span>
            <span className="text-zinc-700 select-none">|</span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="text-white bg-cyan-500/10 px-2 py-0.5 rounded font-mono font-bold border border-cyan-500/10">{codeIssuesCount}</span> Code Issues 🛡️
            </span>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all duration-300 border cursor-pointer ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-cyan-600 to-violet-600 text-white border-white/10 shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-105'
                  : 'text-zinc-500 hover:text-white bg-white/5 border-transparent hover:border-white/10'
              }`}
            >
              All ({findings.length})
            </button>
            <button
              onClick={() => setFilter('agent')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all duration-300 border cursor-pointer ${
                filter === 'agent'
                  ? 'bg-gradient-to-r from-cyan-600 to-violet-600 text-white border-white/10 shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-105'
                  : 'text-zinc-500 hover:text-white bg-white/5 border-transparent hover:border-white/10'
              }`}
            >
              Agent Findings ({codeIssuesCount})
            </button>
            <button
              onClick={() => setFilter('cve')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all duration-300 border cursor-pointer ${
                filter === 'cve'
                  ? 'bg-gradient-to-r from-cyan-600 to-violet-600 text-white border-white/10 shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-105'
                  : 'text-zinc-500 hover:text-white bg-white/5 border-transparent hover:border-white/10'
              }`}
            >
              CVE Scan ({cvesCount})
            </button>
            <button
              onClick={() => setFilter('secret')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all duration-300 border cursor-pointer ${
                filter === 'secret'
                  ? 'bg-gradient-to-r from-cyan-600 to-violet-600 text-white border-white/10 shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-105'
                  : 'text-zinc-500 hover:text-white bg-white/5 border-transparent hover:border-white/10'
              }`}
            >
              Secrets ({secretsCount})
            </button>
          </div>
        </>
      )}

      {/* Findings Grid */}
      {findings.length > 0 ? (
        filteredFindings.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {filteredFindings.map((f, i) => {
              const sevStyles = {
                critical: 'border-l-rose-500 bg-rose-500/[0.02] text-rose-400',
                high: 'border-l-orange-500 bg-orange-500/[0.02] text-orange-400',
                medium: 'border-l-amber-500 bg-amber-500/[0.02] text-amber-400',
                low: 'border-l-cyan-500 bg-cyan-500/[0.02] text-cyan-400'
              };
              
              const badgeStyles = {
                critical: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                low: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
              };

              const style = sevStyles[f.severity.toLowerCase()] || sevStyles.medium;
              const badge = badgeStyles[f.severity.toLowerCase()] || badgeStyles.medium;
              const isSecret = f.type === 'secret' || f.pattern_type;
              const isCve = f.type === 'cve' || f.cve_id;

              return (
                <div key={i} className={`card-panel border-l-4 p-6 rounded-2xl flex flex-col md:flex-row gap-6 ${style}`}>
                  {/* Meta Info */}
                  <div className="md:w-64 shrink-0 space-y-4">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${badge}`}>
                      {f.severity}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 bg-black/20 p-2 rounded-lg border border-white/5">
                      <FileCode className="w-4 h-4 text-zinc-400" />
                      <span className="truncate font-mono" title={f.file}>{f.file.split('/').pop()}:{f.line_number}</span>
                    </div>

                    {isCve && f.cve_id && (
                      <div className="pt-2 border-t border-white/5">
                        <a
                          href={`https://osv.dev/vulnerability/${f.cve_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                        >
                          <span>{f.cve_id}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-6">
                    <div>
                      <h3 className="text-xl font-outfit font-bold text-white tracking-tight mb-2 flex items-center gap-2">
                        {isSecret && <span>🔑</span>}
                        {f.title}
                      </h3>
                      <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <Layers className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Analysis</span>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed mb-2">{f.plain_explanation}</p>
                        
                        {isSecret && f.masked_value && (
                          <div className="mt-4 text-xs font-mono text-zinc-400 bg-black/50 px-3 py-2 rounded-lg border border-white/5 flex items-center gap-2 w-fit">
                            <span className="text-zinc-500 uppercase text-[9px] font-black tracking-widest">Masked Secret:</span>
                            <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded font-mono select-all border border-rose-500/10">
                              {f.masked_value}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Remediation</span>
                      </div>
                      <p className="text-sm text-cyan-100/80 leading-relaxed font-medium">{f.fix_suggestion}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card-panel p-16 rounded-3xl text-center flex flex-col items-center border-dashed border-white/10">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-xl font-outfit font-bold text-white mb-2">No Matching Findings</h3>
            <p className="text-zinc-500 text-sm max-w-sm">No issues found matching the selected filter criteria.</p>
          </div>
        )
      ) : (
        <div className="card-panel p-16 rounded-3xl text-center flex flex-col items-center border-dashed border-white/10">
          {sessionId ? (
            <>
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-outfit font-bold text-white mb-2">Clean Audit Report</h3>
              <p className="text-zinc-500 max-w-sm">No critical vulnerabilities or security flaws detected in the target vector.</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <ShieldAlert className="w-10 h-10 text-zinc-600" />
              </div>
              <h3 className="text-2xl font-outfit font-bold text-white mb-2">Audit Pipeline Ready</h3>
              <p className="text-zinc-500 max-w-sm">Initiate a security scan to populate this matrix with AI specialist findings.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FindingsTab;
