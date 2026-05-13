import React from 'react';
import type { GalleryItem, LoadingState } from '../App';

interface ResultDisplayProps {
  title: string;
  isLoading?: boolean;
  items: GalleryItem[];
  onAction: (item: GalleryItem, action: 'regenerate' | 'change_outfit' | 'change_hair_color' | 'change_outfit_color') => void;
  itemIsLoading: Record<string, LoadingState>;
  placeholderCount?: number;
}

const PlaceholderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

const getAspectRatioStyle = (ratio: string): React.CSSProperties => {
    if (!ratio) return { aspectRatio: '9 / 16' };
    const [w, h] = ratio.split(':').map(Number);
    if (!w || !h) return { aspectRatio: '9 / 16' };
    return { aspectRatio: `${w} / ${h}` };
};

const ActionButton: React.FC<{onClick: () => void, disabled: boolean, children: React.ReactNode, className?: string}> = ({ onClick, disabled, children, className = '' }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex-1 text-xs font-semibold py-2 px-2 rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-wait ${className}`}
    >
        {children}
    </button>
);

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ title, isLoading = false, items, onAction, itemIsLoading, placeholderCount = 0 }) => {

  const handleSave = (item: GalleryItem) => {
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${item.imageSrc}`;
    
    // Create a sanitized filename from the prompt
    const safePrompt = item.prompt.replace(/[^a-z0-9\s]/gi, '').trim().replace(/\s+/g, '_');
    const fileName = `ai_twin_${safePrompt.slice(0, 40) || 'image'}.jpeg`;
    
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderContent = () => {
    if (isLoading) {
      return Array.from({ length: placeholderCount }).map((_, index) => (
        <div key={index} style={getAspectRatioStyle('9:16')} className="w-full bg-gray-900 animate-pulse rounded-lg"></div>
      ));
    }

    if (!items || items.length === 0) {
      return (
        <div className="col-span-full h-64 flex flex-col items-center justify-center text-center text-gray-600">
          <PlaceholderIcon/>
          <p className="mt-4 font-medium">Creations will appear here</p>
        </div>
      );
    }

    return items.map((item) => {
      const currentItemLoadingState = itemIsLoading[item.id] || false;
      const isDisabled = !!currentItemLoadingState;
      
      return (
        <div key={item.id} className="bg-gray-900 rounded-lg overflow-hidden flex flex-col group">
          <div style={getAspectRatioStyle(item.aspectRatio)} className="w-full relative">
            <img src={`data:image/jpeg;base64,${item.imageSrc}`} alt={`Generated twin: ${item.prompt}`} className="w-full h-full object-cover" />
            
            {isDisabled && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                    <Spinner />
                    <span className="text-sm font-semibold text-white capitalize">{currentItemLoadingState}...</span>
                </div>
            )}
          </div>
          <div className="p-2 bg-gray-800/50">
            <p className="text-xs text-gray-400 truncate mb-2">{item.prompt}</p>
            <div className="flex items-center gap-2">
                <ActionButton onClick={() => handleSave(item)} disabled={isDisabled} className="bg-purple-600 hover:bg-purple-500">
                    Save
                </ActionButton>
                <ActionButton onClick={() => onAction(item, 'regenerate')} disabled={isDisabled}>
                    Regen
                </ActionButton>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <ActionButton onClick={() => onAction(item, 'change_outfit')} disabled={isDisabled}>
                Outfit
              </ActionButton>
              <ActionButton onClick={() => onAction(item, 'change_hair_color')} disabled={isDisabled}>
                Hair Color
              </ActionButton>
              <ActionButton onClick={() => onAction(item, 'change_outfit_color')} disabled={isDisabled}>
                Outfit Color
              </ActionButton>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <section className="bg-gray-950 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-4 text-purple-400">{title}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {renderContent()}
        </div>
    </section>
  );
};
