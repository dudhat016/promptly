import Button from '../../primitives/Button';
import Textarea from '../../primitives/Textarea';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onMagicPrompt: () => void;
  isMagicLoading: boolean;
}

export default function PromptInput({ value, onChange, onMagicPrompt, isMagicLoading }: PromptInputProps) {
  return (
    <div className="space-y-3">
      <Textarea
        label="Describe Your Vision"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Vintage 1950s photograph, warm sepia tones, classic blazer, studio lighting..."
        rows={6}
        variant="filled"
        helperText="Tip: Mention mood, lighting, outfit, and background for best results."
      />
      <div className="flex justify-end">
        <Button onClick={onMagicPrompt} isLoading={isMagicLoading} disabled={!value.trim()} variant="soft" size="sm" type="button">
          Magic Prompt
        </Button>
      </div>
    </div>
  );
}

