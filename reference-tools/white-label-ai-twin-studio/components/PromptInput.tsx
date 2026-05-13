import React from 'react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onMagicPrompt: () => void;
  isMagicLoading: boolean;
}

const MagicWandIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17.674a2.25 2.25 0 01-3.416.52l-2.43-2.58a1.125 1.125 0 011.52-1.664l2.43 2.58a2.25 2.25 0 01-.52 3.416zM19.5 6a2.25 2.25 0 01-3.326.519l-2.6-2.5a1.125 1.125 0 011.54-1.634l2.6 2.5a2.25 2.25 0 01-.514 3.326zM18 9.75a.75.75 0 00.75-.75V7.5a.75.75 0 00-1.5 0v1.5a.75.75 0 00.75.75zM12 21a.75.75 0 00.75-.75v-1.5a.75.75 0 00-1.5 0v1.5A.75.75 0 0012 21zM6 9.75a.75.75 0 00.75-.75V7.5a.75.75 0 00-1.5 0v1.5A.75.75 0 006 9.75zM12 4.5a.75.75 0 00.75-.75V2.25a.75.75 0 00-1.5 0v1.5A.75.75 0 0012 4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75a.75.75 0 00.75-.75V9a.75.75 0 00-1.5 0v3a.75.75 0 00.75.75z" />
    </svg>
  );

export const PromptInput: React.FC<PromptInputProps> = ({ value, onChange, onMagicPrompt, isMagicLoading }) => {
  return (
    <div className="relative">
       <h2 className="text-xl font-bold mb-2 text-gray-200">2. Describe Your Vision</h2>
       <p className="text-sm text-gray-500 mb-3 italic">e.g., A vintage photograph from the 1950s, warm sepia tones, wearing a classic tweed blazer.</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="A regal oil painting, ornate golden background, clothed in velvet and silk with a silver crown..."
        rows={6}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 pb-12 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
      />
      <button
        onClick={onMagicPrompt}
        disabled={isMagicLoading || !value.trim()}
        className="absolute bottom-3 right-3 flex items-center justify-center text-sm font-semibold py-2 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-md hover:from-purple-600 hover:to-fuchsia-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
      >
        {isMagicLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Conjuring...
            </>
        ) : (
            <>
              <MagicWandIcon />
              Magic Prompt
            </>
        )}
      </button>
    </div>
  );
};