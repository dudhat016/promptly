
import React from 'react';

const scriptures = [
    { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1" },
    { text: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" },
    { text: "Let there be light.", reference: "Genesis 1:3" },
    { text: "A tree of life with healing in its leaves.", reference: "Revelation 22:2" },
    { text: "A crown of twelve stars.", reference: "Revelation 12:1" },
    { text: "The Good Shepherd giving his life for the sheep.", reference: "John 10:11" },
    { text: "A dove descending from heaven.", reference: "Matthew 3:16" },
];

interface ScriptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (scripture: string) => void;
}

const ScriptureModal: React.FC<ScriptureModalProps> = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;

    const handleSelect = (scripture: { text: string; reference: string }) => {
        onSelect(`${scripture.text} - ${scripture.reference}`);
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-xl shadow-2xl p-6 border border-slate-700 w-full max-w-md m-4 flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
                aria-modal="true"
                role="dialog"
            >
                <h2 className="text-xl font-bold text-white">Add a Scripture to Your Prompt</h2>
                <ul className="space-y-2 max-h-80 overflow-y-auto">
                    {scriptures.map((item, index) => (
                        <li key={index}>
                            <button 
                                onClick={() => handleSelect(item)}
                                className="w-full text-left p-3 rounded-lg bg-slate-700 hover:bg-blue-600 transition-colors duration-200"
                            >
                                <p className="font-semibold text-gray-100">{item.text}</p>
                                <p className="text-xs text-blue-300">{item.reference}</p>
                            </button>
                        </li>
                    ))}
                </ul>
                <button 
                    onClick={onClose}
                    className="mt-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition self-end"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default ScriptureModal;
