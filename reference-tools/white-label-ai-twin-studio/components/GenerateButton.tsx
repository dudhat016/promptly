import React from 'react';

interface GenerateButtonProps {
  onClick: () => void;
  isLoading: boolean;
  isDisabled: boolean;
  numberOfImages: number;
}

export const GenerateButton: React.FC<GenerateButtonProps> = ({ onClick, isLoading, isDisabled, numberOfImages }) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || isDisabled}
      className="w-full flex items-center justify-center text-xl font-bold py-4 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-lg hover:from-purple-700 hover:to-purple-900 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Creating...
        </>
      ) : (
        `Create ${numberOfImages} Twin${numberOfImages > 1 ? 's' : ''}`
      )}
    </button>
  );
};
