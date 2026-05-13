import React from 'react';
import { GeneratedTwin } from '../types';

interface ResultDisplayProps {
  result: GeneratedTwin[];
}

const DetailSection: React.FC<{ title: string; content: string }> = ({ title, content }) => {
    const handleCopy = () => {
        navigator.clipboard.writeText(content);
    };

    return (
        <div>
            <div className="flex justify-between items-center">
                <h4 className="text-md font-semibold text-[#D4007F]">{title}</h4>
                <button onClick={handleCopy} className="text-sm text-pink-500 hover:text-pink-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
            </div>
            <p className="mt-1 text-sm text-pink-800 bg-pink-50 p-2 rounded-md whitespace-pre-wrap font-mono text-xs">{content}</p>
        </div>
    );
};


export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  return (
    <div className="w-full h-full">
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6 overflow-y-auto max-h-[80vh] p-1">
            {result.map((twin, index) => (
                <div key={index} className="flex flex-col items-center">
                    <h3 className="text-xl font-bold text-center text-[#D4007F] mb-1">{twin.complexion}</h3>
                    {twin.hairStyle && twin.aspectRatio && (
                         <p className="text-xs text-center text-pink-600 mb-2 capitalize">{twin.hairStyle} ({twin.aspectRatio.replace(' square','').replace(' vertical','')})</p>
                    )}
                    <div className="w-full max-w-sm bg-gray-200 rounded-xl overflow-hidden shadow-lg" style={{aspectRatio: twin.aspectRatio.startsWith('1:1') ? '1 / 1' : twin.aspectRatio.startsWith('3:4') ? '3 / 4' : twin.aspectRatio.startsWith('9:16') ? '9 / 16' : twin.aspectRatio.startsWith('4:3') ? '4 / 3' : '16 / 9'}}>
                        <img src={twin.image} alt={`Generated twin with ${twin.complexion} complexion`} className="w-full h-full object-cover" />
                    </div>
                    {twin.details && (
                        <div className="mt-4 w-full max-w-sm space-y-3">
                            <DetailSection title="Short Caption" content={twin.details.short_caption} />
                            <DetailSection title="Full Image Prompt" content={twin.details.final_prompt} />
                            <DetailSection title="Scene Notes" content={twin.details.scene_notes} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
  );
};