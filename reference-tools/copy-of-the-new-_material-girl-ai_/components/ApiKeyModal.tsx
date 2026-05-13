import React from 'react';

interface ApiKeyModalProps {
  onClose: () => void;
  onKeySelected: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose, onKeySelected }) => {
  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        onKeySelected();
      } catch (error) {
        console.error("Error opening API key selection:", error);
      }
    } else {
      alert("API key selection is not available in this environment. Continuing for development.");
      onKeySelected();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6 border border-pink-500/30">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-fancy font-bold text-pink-400">API Key Required for Video</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
        </div>
        <p className="text-gray-300 mb-4">
          Video generation with Veo requires a Google AI Studio API key. Please select your key to continue.
        </p>
        <p className="text-sm text-gray-400 mb-6">
          For more information on billing and setup, please visit the{' '}
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">
            official documentation
          </a>.
        </p>
        <div className="flex flex-col gap-3">
            <button
                onClick={handleSelectKey}
                className="w-full bg-pink-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-pink-700 transition-all duration-300"
            >
                Select API Key
            </button>
            <button
                onClick={onClose}
                className="w-full bg-gray-700 text-gray-300 font-bold py-3 px-4 rounded-lg hover:bg-gray-600 transition-all duration-300"
            >
                Cancel
            </button>
        </div>
      </div>
    </div>
  );
};