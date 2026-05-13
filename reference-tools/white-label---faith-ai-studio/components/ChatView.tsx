import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { generateChatResponse } from '../services/geminiService';
import Spinner from './common/Spinner';
import { Icon } from './common/Icons';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Hello! I'm FaithAI. How can I inspire or help you today?" },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));
        const responseContent = await generateChatResponse(history, input);
        const modelMessage: ChatMessage = { role: 'model', content: responseContent };
        setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
        console.error(error);
        const errorMessage: ChatMessage = { role: 'model', content: 'Sorry, something went wrong.' };
        setMessages((prev) => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-120px)] bg-slate-800/50 rounded-lg shadow-2xl overflow-hidden border border-slate-700">
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center shadow-md">
                <Icon name="bot" className="w-6 h-6 text-white"/>
              </div>
            )}
            <div className={`max-w-lg p-4 rounded-xl shadow-md ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-slate-700 text-gray-200 rounded-bl-none'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
             {msg.role === 'user' && (
              <div className="w-10 h-10 rounded-full bg-slate-600 flex-shrink-0 flex items-center justify-center shadow-md">
                <Icon name="user" className="w-6 h-6 text-gray-300"/>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-4">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center shadow-md">
                <Icon name="bot" className="w-6 h-6 text-white"/>
              </div>
            <div className="bg-slate-700 p-4 rounded-xl rounded-bl-none flex items-center justify-center">
              <Spinner size="sm" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800">
        <form onSubmit={handleSendMessage} className="flex items-center gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something inspirational..."
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition flex items-center justify-center shadow-md"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatView;