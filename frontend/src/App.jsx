import { useState, useEffect } from 'react';
import { Terminal, ShieldAlert } from 'lucide-react';
import Header from './components/Header';
import Hero from './components/Hero';
import ScanForm from './components/ScanForm';
import AgentGrid from './components/AgentGrid';
import TerminalLogs from './components/TerminalLogs';
import FindingsTab from './components/FindingsTab';
import StructureTab from './components/StructureTab';
import ChatTab from './components/ChatTab';

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
  const [activeTab, setActiveTab] = useState('findings'); // findings, structure, logs, chat
  const [apiKeysStatus, setApiKeysStatus] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatting, setIsChatting] = useState(false);
  const [chatError, setChatError] = useState(null);

  // Fetch health and API Key Configuration on Load
  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then(res => res.json())
      .then(data => {
        setMockMode(data.mock_mode_active);
        setApiKeysStatus(data.api_keys_configured);
      })
      .catch(() => {
        setMockMode(true);
      });
  }, []);

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
    setSessionId(null);
    setChatHistory([]);
    setChatInput('');
    setChatError(null);

    const formData = new FormData();
    if (repoUrl) {
      formData.append('repo_url', repoUrl);
    } else if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
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
      setSessionId(data.session_id);
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !sessionId || isChatting) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatError(null);

    const updatedHistory = [...chatHistory, { role: 'user', content: userMessage }];
    setChatHistory(updatedHistory);
    setIsChatting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage,
          conversation_history: chatHistory,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to get reply from AI mentor.");
      }

      const data = await response.json();
      setChatHistory([...updatedHistory, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setChatError(err.message || "An error occurred while chatting.");
    } finally {
      setIsChatting(false);
    }
  };

  const getSeverityCount = (severity) => {
    return findings.filter(f => f.severity.toLowerCase() === severity.toLowerCase()).length;
  };

  return (
    <div className="min-h-screen text-zinc-200 selection:bg-cyan-500/30">
      {/* Background Decorative Glow Spots */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%]-left-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full"></div>
      </div>

      <Header mockMode={mockMode} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <Hero />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <ScanForm 
            repoUrl={repoUrl}
            setRepoUrl={setRepoUrl}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            isAnalyzing={isAnalyzing}
            handleStartAnalysis={handleStartAnalysis}
          />
          <AgentGrid apiKeysStatus={apiKeysStatus} />
        </div>

        <TerminalLogs logs={logs} isAnalyzing={isAnalyzing} />

        {(summary || findings.length > 0 || error || sessionId) && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div className="flex gap-3 items-center">
                <button
                  onClick={() => setActiveTab('findings')}
                  className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all duration-300 cursor-pointer border ${activeTab === 'findings' ? 'bg-gradient-to-r from-cyan-600 to-violet-600 text-white border-white/10 shadow-[0_0_20px_rgba(6,182,212,0.2)] scale-105' : 'text-zinc-500 hover:text-white bg-white/5 border-transparent hover:border-white/10'}`}
                >
                  Reports ({findings.length})
                </button>
                {categorization && (
                  <button
                    onClick={() => setActiveTab('structure')}
                    className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all duration-300 cursor-pointer border ${activeTab === 'structure' ? 'bg-gradient-to-r from-cyan-600 to-violet-600 text-white border-white/10 shadow-[0_0_20px_rgba(6,182,212,0.2)] scale-105' : 'text-zinc-500 hover:text-white bg-white/5 border-transparent hover:border-white/10'}`}
                  >
                    Matrix Mapping
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all duration-300 cursor-pointer border ${activeTab === 'logs' ? 'bg-gradient-to-r from-cyan-600 to-violet-600 text-white border-white/10 shadow-[0_0_20px_rgba(6,182,212,0.2)] scale-105' : 'text-zinc-500 hover:text-white bg-white/5 border-transparent hover:border-white/10'}`}
                >
                  Live Logs
                </button>
                <div className="relative group flex items-center">
                  <button
                    type="button"
                    disabled={!sessionId}
                    onClick={() => sessionId && setActiveTab('chat')}
                    className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all duration-300 border ${
                      !sessionId
                        ? 'text-zinc-800 cursor-not-allowed opacity-30 bg-transparent border-transparent'
                        : activeTab === 'chat'
                        ? 'bg-gradient-to-r from-cyan-600 to-violet-600 text-white border-white/10 shadow-[0_0_20px_rgba(6,182,212,0.2)] scale-105 cursor-pointer'
                        : 'text-zinc-500 hover:text-white bg-white/5 border-transparent hover:border-white/10 cursor-pointer'
                    }`}
                  >
                    AI Mentor
                  </button>
                  {!sessionId && (
                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-900 border border-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-2xl">
                      Requires active session
                    </span>
                  )}
                </div>
              </div>

              {findings.length > 0 && activeTab === 'findings' && (
                <div className="hidden md:flex gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-rose-500/10 border border-rose-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-tighter">Critical: {getSeverityCount('critical')}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-orange-500/10 border border-orange-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-tighter">High: {getSeverityCount('high')}</span>
                  </div>
                </div>
              )}
            </div>

            {activeTab === 'findings' && (
              <FindingsTab 
                summary={summary}
                findings={findings}
                error={error}
                sessionId={sessionId}
              />
            )}

            {activeTab === 'structure' && (
              <StructureTab categorization={categorization} />
            )}

            {activeTab === 'logs' && (
              <div className="card-panel p-8 rounded-2xl bg-black/40 border border-white/5 font-mono">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-cyan-500/10">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                  </div>
                  <h3 className="font-outfit font-bold text-lg text-white tracking-tight">
                    Matrix Process Logs
                  </h3>
                </div>
                <div className="space-y-2.5 text-xs text-zinc-400 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                  {logs.map((log, index) => (
                    <div key={index} className="flex gap-4 group">
                      <span className="text-zinc-700 select-none font-black tracking-tighter">[{index.toString().padStart(3, '0')}]</span>
                      <span className="group-hover:text-cyan-400/80 transition-colors leading-relaxed">{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <ChatTab 
                sessionId={sessionId}
                chatHistory={chatHistory}
                isChatting={isChatting}
                chatError={chatError}
                chatInput={chatInput}
                setChatInput={setChatInput}
                handleSendMessage={handleSendMessage}
              />
            )}
          </div>
        )}
      </main>
      
      <footer className="mt-32 border-t border-white/5 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span className="font-outfit font-black text-sm tracking-widest text-white uppercase">
              VulnMyth Matrix
            </span>
          </div>
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">
            &copy; 2026 Architectural Singularity • Multi-Agent Security Layer
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
