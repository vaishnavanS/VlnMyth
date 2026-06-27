import { Play, Terminal, Upload, ShieldAlert } from 'lucide-react';

const ScanForm = ({ 
  repoUrl, 
  setRepoUrl, 
  setSelectedFile, 
  selectedFile, 
  isAnalyzing, 
  handleStartAnalysis 
}) => {
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setRepoUrl(''); // Clear URL if file selected
    }
  };

  return (
    <div className="lg:col-span-2 card-panel p-8 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Play className="w-4 h-4 text-cyan-400" />
        </div>
        <h2 className="text-xl font-outfit font-bold text-white tracking-tight">
          Initiate Code Scan
        </h2>
      </div>

      <form onSubmit={handleStartAnalysis} className="space-y-8">
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em] ml-1">
            GitHub Repository Vector
          </label>
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Terminal className="h-5 w-5 text-zinc-600 group-focus-within:text-cyan-400 transition-colors" />
            </span>
            <input
              type="url"
              placeholder="https://github.com/username/repository"
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value);
                setSelectedFile(null); // Reset file if URL typed
              }}
              disabled={isAnalyzing}
              className="block w-full pl-12 pr-4 py-4 border border-white/5 rounded-xl bg-black/40 text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 disabled:opacity-50 transition-all font-medium"
            />
          </div>
        </div>

        <div className="relative flex items-center gap-4">
          <div className="flex-grow h-[1px] bg-white/5"></div>
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">or</span>
          <div className="flex-grow h-[1px] bg-white/5"></div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em] ml-1">
            Local Archive Injection
          </label>
          <div className="flex items-center justify-center w-full">
            <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${selectedFile ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-white/5 hover:border-white/10 bg-black/20 hover:bg-black/40'}`}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <div className={`p-4 rounded-full mb-3 transition-colors ${selectedFile ? 'bg-cyan-500/10 text-cyan-400' : 'bg-white/5 text-zinc-600'}`}>
                  <Upload className="w-8 h-8" />
                </div>
                <p className="text-sm text-zinc-400">
                  {selectedFile ? (
                    <span className="font-bold text-cyan-400">{selectedFile.name}</span>
                  ) : (
                    <span>Drop your ZIP archive or <span className="text-cyan-400 font-bold">browse</span></span>
                  )}
                </p>
                <p className="text-[10px] text-zinc-600 mt-2 font-medium">ZIP files only • Maximum 50 source files</p>
              </div>
              <input 
                type="file" 
                accept=".zip" 
                onChange={handleFileChange}
                disabled={isAnalyzing}
                className="hidden" 
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isAnalyzing || (!repoUrl && !selectedFile)}
          className="relative w-full group overflow-hidden py-5 px-6 rounded-xl font-outfit font-black text-sm uppercase tracking-[0.1em] text-white shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-violet-600 transition-transform group-hover:scale-110"></div>
          <div className="relative flex items-center justify-center gap-3">
            {isAnalyzing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Analyzing Security...</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-5 h-5" />
                <span>Execute System Audit</span>
              </>
            )}
          </div>
        </button>
      </form>
    </div>
  );
};

export default ScanForm;
