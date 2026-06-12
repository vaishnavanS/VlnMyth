import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Terminal, 
  Upload, 
  Play, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  HelpCircle, 
  Code,
  Layers,
  Cpu,
  FileCode,
  Server,
  Wrench,
  ChevronRight,
  Settings,
  Sparkles
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState('');
  const [categorization, setCategorization] = useState(null);
  const [findings, setFindings] = useState([]);
  const [mockMode, setMockMode] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('findings'); // findings, structure, logs
  const [apiKeysStatus, setApiKeysStatus] = useState(null);

  // Fetch health and API Key Configuration on Load
  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then(res => res.json())
      .then(data => {
        setMockMode(data.mock_mode_active);
        setApiKeysStatus(data.api_keys_configured);
      })
      .catch(() => {
        // Assume backend is off or default to mock mode if check fails
        setMockMode(true);
      });
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setRepoUrl(''); // Clear URL if file selected
    }
  };

  const handleStartAnalysis = async (e) => {
    e.preventDefault();
    if (!repoUrl && !selectedFile) {
      setError("Please specify a GitHub URL or select a source code ZIP file.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setFindings([]);
    setCategorization(null);
    setSummary('');
    setLogs(["Client: Packaging request...", "Client: Dispatching to VulnLens Pro backend..."]);
    setActiveTab('logs');

    const formData = new FormData();
    if (repoUrl) {
      formData.append('repo_url', repoUrl);
    } else if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      // Setup a periodic check of logs since graph takes time (simulated via local status messages append,
      // and we display actual real-time agent output returned at the end).
      const mockLogInterval = setInterval(() => {
        setLogs(prev => {
          if (prev.length < 3) {
            return [...prev, "System: Analyzing repository index...", "Orchestrator Agent: Starting codebase structure analysis..."];
          }
          return prev;
        });
      }, 2000);

      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(mockLogInterval);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Analysis failed.");
      }

      const data = await response.json();
      setSummary(data.summary);
      setCategorization(data.categorization);
      setLogs(data.logs);
      setFindings(data.findings);
      setMockMode(data.mock_mode);
      setActiveTab('findings');
    } catch (err) {
      setError(err.message || "An unexpected error occurred during codebase scanning.");
      setActiveTab('findings');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper to count findings by severity
  const getSeverityCount = (severity) => {
    return findings.filter(f => f.severity.toLowerCase() === severity.toLowerCase()).length;
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden text-gray-200">
      {/* Background Decorative Glow Spots */}
      <div className="glow-bg top-[-100px] left-[-100px]"></div>
      <div className="glow-bg bottom-[-100px] right-[-100px] bg-indigo-950 opacity-40"></div>

      {/* Navigation Header */}
      <header className="glass-panel border-b border-gray-800/80 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/30">
              <ShieldAlert className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                VulnLens Pro
              </span>
              <span className="ml-2 px-2 py-0.5 text-[10px] uppercase font-bold bg-gray-800 rounded-full text-indigo-300 border border-gray-700">
                Multi-Agent Security
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {mockMode && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                Demo fallback mode
              </span>
            )}
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer" 
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Terminal className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Intro Hero banner */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
            Spot Code Security Issues <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Using Multi-Agent AI</span>
          </h1>
          <p className="max-w-2xl mx-auto text-gray-400 text-base md:text-lg">
            Upload your ZIP code packages or drop a GitHub Repository link. Our AI specialists will audit the security of your app, with explanations written in simple, plain English.
          </p>
        </div>

        {/* Action Panel: Scan Forms & Config */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Main Input Form Panel */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl relative overflow-hidden">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Play className="w-4 h-4 text-indigo-400" /> Start Repository Scanning
            </h2>

            <form onSubmit={handleStartAnalysis} className="space-y-6">
              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-2">
                  GitHub Repository URL
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Terminal className="h-5 w-5 text-gray-500" />
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
                    className="block w-full pl-10 pr-3 py-3 border border-gray-800 rounded-xl bg-gray-950/70 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-all"
                  />
                </div>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-800/80"></div>
                <span className="flex-shrink mx-4 text-xs font-bold text-gray-500 uppercase tracking-widest">OR</span>
                <div className="flex-grow border-t border-gray-800/80"></div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-2">
                  Upload Codebase Archive (ZIP)
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${selectedFile ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-gray-800 hover:border-gray-700 bg-gray-950/40 hover:bg-gray-950/60'}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className={`w-8 h-8 mb-2 ${selectedFile ? 'text-indigo-400' : 'text-gray-500'}`} />
                      <p className="text-xs text-gray-400">
                        {selectedFile ? (
                          <span className="font-semibold text-indigo-300">{selectedFile.name}</span>
                        ) : (
                          <span>Drag and drop file here, or click to browse</span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">ZIP archives only, max 50 files total</p>
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
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing Codebase...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-5 h-5" /> Execute Security Audit
                  </>
                )}
              </button>
            </form>
          </div>

          {/* AI Team & API Key Config Status Panel */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" /> Active AI Specialist Agents
              </h2>
              
              <div className="space-y-4">
                <div className="flex gap-3 items-start p-2.5 rounded-xl bg-gray-900/40 border border-gray-800/80">
                  <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Orchestrator Agent (Gemini)</h3>
                    <p className="text-[11px] text-gray-400">Map codebase structure, splits focus files.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-2.5 rounded-xl bg-gray-900/40 border border-gray-800/80">
                  <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 mt-0.5">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Vuln Hunter (Llama 3.3 Groq)</h3>
                    <p className="text-[11px] text-gray-400">Detects OWASP top 10 flaws like SQLi and XSS.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-2.5 rounded-xl bg-gray-900/40 border border-gray-800/80">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Bug Detector (Nemotron Nvidia NIM)</h3>
                    <p className="text-[11px] text-gray-400">Tracks unhandled crashes and logical loops.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-2.5 rounded-xl bg-gray-900/40 border border-gray-800/80">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 mt-0.5">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Misconfig Agent (Mixtral Together)</h3>
                    <p className="text-[11px] text-gray-400">Detects credentials in code & bad CORS policy.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-2.5 rounded-xl bg-gray-900/40 border border-gray-800/80">
                  <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Explainer Agent (Claude Haiku)</h3>
                    <p className="text-[11px] text-gray-400">Translates findings into plain jargon-free English.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Config warning details */}
            <div className="mt-6 pt-4 border-t border-gray-800/80">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">API Keys Config status</span>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {apiKeysStatus ? (
                  Object.entries(apiKeysStatus).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${config ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                      <span className="text-[10px] text-gray-400 truncate">{key.replace('_API_KEY', '')}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[10px] text-gray-500">Checking API configuration status...</span>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Loading / Agent status logger while scanning */}
        {isAnalyzing && (
          <div className="glass-panel p-6 rounded-2xl mb-8 border border-indigo-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400 animate-pulse" /> Scanning Codebase Progress
              </h3>
              <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                Running LangGraph Flow
              </span>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              {/* Agent nodes step graph visual */}
              <div className="flex-1 grid grid-cols-4 gap-2">
                <div className="p-3 bg-gray-900 border border-indigo-500/30 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-indigo-300">1. Orchestrate</div>
                  <div className="text-[9px] text-gray-400 mt-1">Gemini</div>
                </div>
                <div className="p-3 bg-gray-900 border border-indigo-500/20 rounded-xl text-center animate-pulse">
                  <div className="text-[10px] uppercase font-bold text-indigo-300">2. Inspect</div>
                  <div className="text-[9px] text-gray-400 mt-1">Parallel Agents</div>
                </div>
                <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-gray-400">3. Translate</div>
                  <div className="text-[9px] text-gray-400 mt-1">Claude</div>
                </div>
                <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-gray-400">4. Structure</div>
                  <div className="text-[9px] text-gray-400 mt-1">Llama 3.3</div>
                </div>
              </div>
            </div>

            {/* Terminal logs list */}
            <div className="bg-gray-950 p-4 rounded-xl font-mono text-xs border border-gray-900 text-indigo-400 max-h-40 overflow-y-auto space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-gray-600">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
              <div className="flex gap-2 text-indigo-300/60 animate-pulse">
                <span>&gt;</span>
                <span>Agent waiting for process completion...</span>
              </div>
            </div>
          </div>
        )}

        {/* Results Showcase Section */}
        {(summary || findings.length > 0 || error) && (
          <div className="space-y-6">
            
            {/* Tab Selectors */}
            <div className="flex justify-between items-center border-b border-gray-800/80 pb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('findings')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${activeTab === 'findings' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Scan Report ({findings.length})
                </button>
                {categorization && (
                  <button
                    onClick={() => setActiveTab('structure')}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${activeTab === 'structure' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    System Mapping
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Agent Logs
                </button>
              </div>

              {/* Status statistics counters */}
              {findings.length > 0 && activeTab === 'findings' && (
                <div className="hidden sm:flex gap-2 text-xs font-bold">
                  <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">
                    Critical: {getSeverityCount('critical')}
                  </span>
                  <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded">
                    High: {getSeverityCount('high')}
                  </span>
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                    Medium: {getSeverityCount('medium')}
                  </span>
                  <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded">
                    Low: {getSeverityCount('low')}
                  </span>
                </div>
              )}
            </div>

            {/* Error alerts */}
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Security Audit Terminated</h4>
                  <p className="text-xs text-rose-300/80 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Content Tabs */}
            {activeTab === 'findings' && (
              <div className="space-y-6">
                
                {/* Summary box */}
                {summary && (
                  <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-indigo-500 flex items-start gap-3">
                    <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-sm text-white">Application Analysis Summary</h3>
                      <p className="text-xs text-gray-400 mt-1">{summary}</p>
                    </div>
                  </div>
                )}

                {/* Findings cards display grid */}
                {findings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {findings.map((f, i) => {
                      const sevColors = {
                        critical: 'border-l-rose-500 bg-rose-950/10 text-rose-400 border-rose-500/20',
                        high: 'border-l-orange-500 bg-orange-950/10 text-orange-400 border-orange-500/20',
                        medium: 'border-l-amber-500 bg-amber-950/10 text-amber-400 border-amber-500/20',
                        low: 'border-l-sky-500 bg-sky-950/10 text-sky-400 border-sky-500/20'
                      };
                      const badgColors = {
                        critical: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                        high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
                        medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                        low: 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                      };

                      const currentColors = sevColors[f.severity.toLowerCase()] || sevColors['medium'];
                      const badgeColors = badgColors[f.severity.toLowerCase()] || badgColors['medium'];

                      return (
                        <div key={i} className={`glass-panel border-l-4 rounded-xl overflow-hidden hover:scale-[1.01] hover:border-gray-700 transition-all ${currentColors}`}>
                          <div className="p-5 space-y-4">
                            
                            {/* Card badge & path line */}
                            <div className="flex justify-between items-center gap-2">
                              <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full border ${badgeColors}`}>
                                {f.severity}
                              </span>
                              <div className="flex items-center gap-1.5 text-xs text-gray-400 max-w-[70%]">
                                <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate" title={f.file}>{f.file}:{f.line_number}</span>
                              </div>
                            </div>

                            {/* Card title */}
                            <h3 className="font-extrabold text-md text-white">{f.title}</h3>

                            {/* Plain English explanation */}
                            <div className="space-y-1.5 bg-gray-950/50 p-3.5 rounded-xl border border-gray-900">
                              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1">
                                <Layers className="w-3 h-3" /> Simply Explained
                              </span>
                              <p className="text-xs text-gray-300 leading-relaxed font-sans">{f.plain_explanation}</p>
                            </div>

                            {/* Suggested remediation fix */}
                            <div className="space-y-1.5 bg-indigo-950/10 p-3.5 rounded-xl border border-indigo-950/30">
                              <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1">
                                <Wrench className="w-3 h-3" /> Recommended Action
                              </span>
                              <p className="text-xs text-indigo-200/90 leading-relaxed">{f.fix_suggestion}</p>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  !error && (
                    <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
                      <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                      <h3 className="font-bold text-lg text-white">No Security Vulnerabilities Detected</h3>
                      <p className="text-xs text-gray-400 max-w-sm mx-auto">Our AI agents audited the submitted files and found no glaring issues or code execution security bugs.</p>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Structure Mapping Tab */}
            {activeTab === 'structure' && categorization && (
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="font-bold text-md text-white mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" /> Codebase Structure Breakdown
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {Object.entries(categorization).map(([cat, fList]) => (
                    <div key={cat} className="bg-gray-950/40 p-4 rounded-xl border border-gray-800">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">{cat}</span>
                        <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded-full text-gray-400">{fList.length}</span>
                      </div>
                      {fList.length > 0 ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {fList.map((file, idx) => (
                            <div key={idx} className="text-xs text-gray-400 truncate flex items-center gap-1.5">
                              <span className="w-1 h-1 bg-indigo-500 rounded-full"></span>
                              {file}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 italic">No files in category</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <div className="glass-panel p-6 rounded-2xl bg-gray-950 font-mono border border-gray-800">
                <h3 className="font-bold text-sm text-indigo-400 mb-4 flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> LangGraph Process Logs
                </h3>
                <div className="space-y-2 text-xs text-gray-300">
                  {logs.map((log, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="text-gray-600">&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </main>
      
      {/* Footer information */}
      <footer className="mt-24 border-t border-gray-800/80 py-8 text-center text-xs text-gray-500 relative z-10">
        <p>&copy; 2026 VulnLens Pro. Powered by Multi-Agent LangGraph Architectures.</p>
      </footer>
    </div>
  );
}

export default App;
