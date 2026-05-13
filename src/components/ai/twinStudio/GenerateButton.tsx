import { Sparkles } from 'lucide-react';
import { Button } from '../../primitives';

interface GenerateButtonProps {
  onClick: () => void;
  isLoading: boolean;
  isDisabled: boolean;
  numberOfImages: number;
}

export default function GenerateButton({ onClick, isLoading, isDisabled, numberOfImages }: GenerateButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      isLoading={isLoading}
      disabled={isDisabled}
      variant="gradient"
      size="lg"
      fullWidth
      leftIcon={Sparkles}
      className="rounded-xl"
    >
      {isLoading ? 'Creating...' : `Create ${numberOfImages} Twin${numberOfImages > 1 ? 's' : ''}`}
    </Button>
  );
}
