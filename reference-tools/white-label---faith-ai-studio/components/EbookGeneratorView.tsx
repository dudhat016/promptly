
import React, { useState } from 'react';
import { generateEbookContent } from '../services/geminiService';
import Spinner from './common/Spinner';
import { Icon } from './common/Icons';

const EbookGeneratorView: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    
    setIsLoading(true);
    
    try {
      const result = await generateEbookContent(topic);
      setContent(result);
    } catch (error) {
      console.error("Error generating ebook content:", error);
      setContent("Failed to generate content. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-slate-800/50 p-8 rounded-xl shadow-2xl border border-slate-700">
        <div className="flex items-center gap-4 mb-6">
           <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
             <Icon name="book" className="w-7 h-7 text-white" />
           </div>
           <div>
             <h2 className="text-2xl font-bold text-white">Faith Ebook Creator</h2>
             <p className="text-gray-400">Create faith-based chapters and articles instantly.</p>
           </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-2">
              What would you like to write about?
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., The Power of Prayer, Walking in Faith, Finding Peace"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <button
                onClick={handleGenerate}
                disabled={isLoading || !topic.trim()}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition shadow-lg flex items-center gap-2 min-w-[160px] justify-center"
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" />
                    <span>Writing...</span>
                  </>
                ) : (
                  <>
                    <Icon name="magic" className="w-5 h-5" />
                    <span>Generate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 p-6 rounded-xl shadow-2xl border border-slate-700 h-[600px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
             <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Icon name="create" className="w-4 h-4 text-blue-400"/>
                Generated Content
             </label>
             {content && (
                 <button 
                    onClick={() => navigator.clipboard.writeText(content)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                 >
                     Copy to Clipboard
                 </button>
             )}
        </div>
        <textarea
            readOnly
            value={content}
            className="flex-1 w-full p-4 bg-slate-900/50 border border-slate-600 rounded-lg text-gray-300 focus:outline-none font-mono text-sm leading-relaxed resize-none"
            placeholder="Your ebook content will be generated here..."
        />
      </div>
    </div>
  );
};

export default EbookGeneratorView;