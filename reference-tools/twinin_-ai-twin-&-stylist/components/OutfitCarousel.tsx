
import React from 'react';
import { PRESET_OUTFITS } from '../constants';

interface OutfitCarouselProps {
  onSelect: (description: string) => void;
  selectedOutfit: string | null;
}

export const OutfitCarousel: React.FC<OutfitCarouselProps> = ({ onSelect, selectedOutfit }) => {
  return (
    <div className="mt-4">
        <h3 className="text-lg font-bold text-[#D4007F] mb-3">Or Choose a Preset Outfit</h3>
        <div className="flex overflow-x-auto space-x-4 p-2 -mx-2">
            {PRESET_OUTFITS.map((outfit, index) => (
                <div 
                    key={index}
                    onClick={() => onSelect(outfit.description)}
                    className={`cursor-pointer rounded-lg overflow-hidden border-4 flex-shrink-0 w-32 h-48 transition-all duration-200
                        ${selectedOutfit === outfit.description ? 'border-[#FF4FA3] shadow-lg' : 'border-transparent hover:border-pink-200'}`
                    }
                >
                    <img src={outfit.image} alt={outfit.description} className="w-full h-full object-cover" />
                </div>
            ))}
        </div>
    </div>
  );
};
