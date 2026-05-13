import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Select } from '../../primitives';

interface AdvancedSettingsProps {
  hairstyle: string;
  setHairstyle: (s: string) => void;
  nails: string;
  setNails: (s: string) => void;
  outfit: string;
  setOutfit: (s: string) => void;
  skinComplexion: string;
  setSkinComplexion: (s: string) => void;
}

const COMPLEXION_OPTIONS = ['Default', 'Glowing', 'Matte', 'Dewy', 'Satin'] as const;
const HAIRSTYLE_OPTIONS = ['Default', 'Ponytail', 'Waves', 'Bob', 'Bun', 'Braids'] as const;
const NAIL_OPTIONS = ['Default', 'French', 'Nude', 'Red', 'Chrome', 'Black'] as const;
const OUTFIT_OPTIONS = ['Default', 'Gown', 'Blouse', 'Leather', 'Casual', 'Cocktail'] as const;

function toSelectOptions(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }));
}

export default function AdvancedSettings({
  hairstyle,
  setHairstyle,
  nails,
  setNails,
  outfit,
  setOutfit,
  skinComplexion,
  setSkinComplexion,
}: AdvancedSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const complexionOptions = useMemo(() => toSelectOptions(COMPLEXION_OPTIONS), []);
  const hairstyleOptions = useMemo(() => toSelectOptions(HAIRSTYLE_OPTIONS), []);
  const nailOptions = useMemo(() => toSelectOptions(NAIL_OPTIONS), []);
  const outfitOptions = useMemo(() => toSelectOptions(OUTFIT_OPTIONS), []);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto w-full justify-between rounded-none px-3 py-3 text-left text-xs uppercase tracking-widest text-foreground hover:bg-muted/30"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span>Advanced Customization</span>
        <ChevronDown className={['h-4 w-4 text-muted-foreground transition-transform duration-300', isOpen ? 'rotate-180' : ''].join(' ')} />
      </Button>

      <div className={['overflow-hidden transition-all duration-300 ease-in-out', isOpen ? 'max-h-[34rem] opacity-100' : 'max-h-0 opacity-0'].join(' ')}>
        <div className="space-y-4 border-t border-border p-4">
          <Select
            label="Skin Complexion"
            options={complexionOptions}
            value={skinComplexion}
            onChange={(value) => setSkinComplexion(String(value))}
            isSearchable={false}
          />
          <Select
            label="Hairstyle"
            options={hairstyleOptions}
            value={hairstyle}
            onChange={(value) => setHairstyle(String(value))}
            isSearchable={false}
          />
          <Select
            label="Nails"
            options={nailOptions}
            value={nails}
            onChange={(value) => setNails(String(value))}
            isSearchable={false}
          />
          <Select
            label="Outfit"
            options={outfitOptions}
            value={outfit}
            onChange={(value) => setOutfit(String(value))}
            isSearchable={false}
          />
        </div>
      </div>
    </div>
  );
}
