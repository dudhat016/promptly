
import React, { useState, useRef, useEffect } from 'react';
import { chatWithAI } from '../services/geminiService';
import { ChatMessage } from '../types';
import Spinner from './Spinner';
import Icon from './Icon';

const Chatbot: React.FC = () => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
    setHistory((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAI(input);
      const modelMessage: ChatMessage = { role: 'model', parts: [{ text: response }] };
      setHistory((prev) => [...prev, modelMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = { role: 'model', parts: [{ text: "Sorry, I'm having trouble connecting right now." }] };
      setHistory((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg shadow-xl overflow-hidden">
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {history.length === 0 && (
          <div className="text-center text-gray-400">
            <h2 className="text-2xl font-bold text-white mb-2">Hey gorgeous!</h2>
            <p>I'm Baddie Bot, your personal AI stylist. Ask me anything about fashion, outfits, or how to slay your next look.</p>
          </div>
        )}
        {history.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-2xl px-5 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-pink-600 text-white rounded-br-none' : 'bg-gray-700 text-white rounded-bl-none'}`}>
              <p className="whitespace-pre-wrap">{msg.parts[0].text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="max-w-xs md:max-w-md lg:max-w-2xl px-5 py-3 rounded-2xl bg-gray-700 text-white rounded-bl-none">
               <Spinner />
             </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="p-4 bg-gray-900 border-t border-gray-700">
        <div className="flex items-center bg-gray-700 rounded-full">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for style advice..."
            className="w-full bg-transparent px-5 py-3 text-white placeholder-gray-400 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 text-white bg-pink-600 rounded-full m-1 hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            <Icon name="send" className="w-6 h-6" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chatbot;
