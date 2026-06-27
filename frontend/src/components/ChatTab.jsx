import { Sparkles } from 'lucide-react';

const ChatTab = ({ 
  sessionId, 
  chatHistory, 
  isChatting, 
  chatError, 
  chatInput, 
  setChatInput, 
  handleSendMessage 
}) => {
  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col h-[600px] relative overflow-hidden">
      <h3 className="font-bold text-md text-white mb-4 flex items-center gap-2 border-b border-gray-800 pb-3">
        <Sparkles className="w-5 h-5 text-indigo-400" />
        Chat with AI Security Mentor
      </h3>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scrollbar-thin scrollbar-thumb-gray-850 scrollbar-track-transparent">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <h4 className="font-bold text-sm text-white">Ask your Security Mentor</h4>
            <p className="text-xs text-gray-400 max-w-sm">
              I can explain the detected security issues, suggest secure code implementations, or answer general security questions about this project.
            </p>
          </div>
        ) : (
          chatHistory.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 max-w-[85%] ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/10'
                    : 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                }`}
              >
                {msg.role === 'user' ? 'U' : 'AI'}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-indigo-600/90 text-white rounded-tr-none shadow-md'
                    : 'bg-gray-950/70 border border-gray-800 text-gray-200 rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}

        {/* Thinking Indicator */}
        {isChatting && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 shrink-0 animate-pulse">
              AI
            </div>
            <div className="bg-gray-950/70 border border-gray-800 text-gray-400 p-3.5 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
              <div className="flex space-x-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="italic text-gray-500">thinking...</span>
            </div>
          </div>
        )}

        {/* Chat Error */}
        {chatError && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs mt-2">
            {chatError}
          </div>
        )}
      </div>

      {/* Input Form at bottom */}
      <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-gray-800/80 pt-4">
        <input
          type="text"
          placeholder={sessionId ? "Ask a question about the findings..." : "Run a codebase scan first to enable chat"}
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          disabled={!sessionId || isChatting}
          className="flex-1 px-4 py-3 border border-gray-850 rounded-xl bg-gray-950/70 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 text-xs"
        />
        <button
          type="submit"
          disabled={!sessionId || isChatting || !chatInput.trim()}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatTab;
