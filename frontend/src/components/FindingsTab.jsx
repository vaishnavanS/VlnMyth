import { Info, CheckCircle, ShieldAlert, FileCode, Layers, Wrench, AlertCircle } from 'lucide-react';

const FindingsTab = ({ summary, findings, error, sessionId }) => {
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

  return (
    <div className="space-y-8">
      {/* Summary Section */}
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

      {/* Findings Grid */}
      {findings.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {findings.map((f, i) => {
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
                </div>

                {/* Content */}
                <div className="flex-1 space-y-6">
                  <div>
                    <h3 className="text-xl font-outfit font-bold text-white tracking-tight mb-2">{f.title}</h3>
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Analysis</span>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed">{f.plain_explanation}</p>
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
