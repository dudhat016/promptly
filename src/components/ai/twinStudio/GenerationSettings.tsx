import { Button, Checkbox } from '../../primitives';

interface GenerationSettingsProps {
  numberOfImages: number;
  onNumberOfImagesChange: (n: number) => void;
  aspectRatio: string;
  onRatioChange: (ratio: string) => void;
  matchOriginalFace: boolean;
  onMatchOriginalFaceChange: (value: boolean) => void;
  matchSkinTone: boolean;
  onMatchSkinToneChange: (value: boolean) => void;
}

const NUMBER_OPTIONS = [1, 2, 4, 8];
const RATIO_OPTIONS = [
  { label: 'Portrait', value: '9:16' },
  { label: 'Social', value: '4:5' },
  { label: 'Classic', value: '2:3' },
  { label: 'Square', value: '1:1' },
  { label: 'Landscape', value: '16:9' },
];

export default function GenerationSettings({
  numberOfImages,
  onNumberOfImagesChange,
  aspectRatio,
  onRatioChange,
  matchOriginalFace,
  onMatchOriginalFaceChange,
  matchSkinTone,
  onMatchSkinToneChange,
}: GenerationSettingsProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Number of Images</label>
        <div className="grid grid-cols-4 gap-2">
          {NUMBER_OPTIONS.map((num) => (
            <Button
              key={num}
              type="button"
              size="sm"
              variant={numberOfImages === num ? 'primary' : 'outline'}
              className="h-9 px-0"
              onClick={() => onNumberOfImagesChange(num)}
            >
              {num}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Canvas Shape</label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {RATIO_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={aspectRatio === opt.value ? 'primary' : 'outline'}
              className="h-auto py-2 px-2 normal-case tracking-normal"
              onClick={() => onRatioChange(opt.value)}
            >
              <span className="flex flex-col leading-tight">
                <span className="text-xs font-bold">{opt.label}</span>
                <span className="text-[10px] opacity-80 font-mono">{opt.value}</span>
              </span>
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Identity Fidelity</label>
        <Checkbox
          checked={matchOriginalFace}
          onChange={(event) => onMatchOriginalFaceChange(event.target.checked)}
          label="Match Original Face"
          description={
            matchOriginalFace
              ? 'Preserves identity as the same person.'
              : 'Allows minor artistic variation.'
          }
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Skin Tone Fidelity</label>
        <Checkbox
          checked={matchSkinTone}
          onChange={(event) => onMatchSkinToneChange(event.target.checked)}
          label="Match Original Skin Tone"
          description={
            matchSkinTone
              ? 'Matches the skin tone from source photos.'
              : 'Allows subtle adjustments for lighting.'
          }
        />
      </div>
    </div>
  );
}
