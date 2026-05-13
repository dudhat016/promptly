import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, LoadingState } from '../types';
import { generateChatResponse } from '../services/gemini';

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hello! I'm your Nail Twin styling assistant. Ask me about the latest trends or nail care!", timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState<LoadingState>(LoadingState.IDLE);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(LoadingState.LOADING);

    try {
      // Convert chat format for API history (excluding last user message which is sent in call)
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await generateChatResponse(history, userMsg.text);
      
      setMessages(prev => [...prev, {
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      }]);
      setLoading(LoadingState.SUCCESS);
    } catch (error) {
      console.error(error);
      setLoading(LoadingState.ERROR);
      setMessages(prev => [...prev, {
        role: 'model',
        text: "Sorry, I'm having trouble connecting right now.",
        timestamp: Date.now()
      }]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto h-[600px] flex flex-col glass-panel rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-rose-500 p-4 text-white">
        <h3 className="font-bold text-lg">Nail Twin Assistant</h3>
        <p className="text-xs opacity-80">Powered by Gemini 3 Pro</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-rose-500 text-white rounded-tr-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
            }`}>
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
        {loading === LoadingState.LOADING && (
           <div className="flex justify-start">
             <div className="bg-gray-100 rounded-2xl p-3 text-gray-500 text-sm animate-pulse">
               Thinking...
             </div>
           </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about nail trends..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-rose-500"
          />
          <button 
            onClick={handleSend}
            disabled={loading === LoadingState.LOADING}
            className="bg-rose-500 text-white p-2 rounded-full hover:bg-rose-600 transition-colors w-10 h-10 flex items-center justify-center"
          >
            <span className="material-icons text-sm">send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
