import type { CSSProperties, ElementType } from 'react';
import { Loader2, Palette, RefreshCw, Save, Shirt, Sparkles } from 'lucide-react';
import { Button, Card } from '../../primitives';
import type { TwinStudioCardAction, TwinStudioGalleryItem, TwinStudioLoadingState } from './types';

const getAspectRatioStyle = (ratio: string): CSSProperties => {
  if (!ratio) return { aspectRatio: '9 / 16' };
  const [w, h] = ratio.split(':').map(Number);
  if (!w || !h) return { aspectRatio: '9 / 16' };
  return { aspectRatio: `${w} / ${h}` };
};

function ActionButton(props: {
  icon?: ElementType;
  label: string;
  onClick: () => void;
  disabled: boolean;
  variant?: 'outline' | 'primary';
}) {
  const { icon, label, onClick, disabled, variant = 'outline' } = props;
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      leftIcon={icon}
      onClick={onClick}
      disabled={disabled}
      className="h-8 px-2 text-[10px]"
    >
      {label}
    </Button>
  );
}

export default function ResultDisplay(props: {
  title: string;
  isLoading?: boolean;
  items: TwinStudioGalleryItem[];
  onAction: (item: TwinStudioGalleryItem, action: TwinStudioCardAction) => void;
  itemIsLoading: Record<string, TwinStudioLoadingState>;
  placeholderCount?: number;
  onSave?: (item: TwinStudioGalleryItem) => void;
}) {
  const { title, isLoading = false, items, onAction, itemIsLoading, placeholderCount = 0, onSave } = props;

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">{title}</h2>
        <span className="text-[11px] font-bold text-muted-foreground">{items.length}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {isLoading &&
          Array.from({ length: placeholderCount }).map((_, index) => (
            <div key={`placeholder-${index}`} style={getAspectRatioStyle('9:16')} className="w-full animate-pulse rounded-xl border border-border bg-muted/20" />
          ))}

        {!isLoading && (!items || items.length === 0) && (
          <div className="col-span-full flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
            <p className="text-sm font-bold">Creations will appear here</p>
            <p className="mt-1 text-[11px]">Upload source photos and generate your first twin.</p>
          </div>
        )}

        {!isLoading &&
          items.map((item) => {
            const currentItemLoadingState = itemIsLoading[item.id] || false;
            const isDisabled = !!currentItemLoadingState;
            const imgSrc = item.imageUrl || (item.imageSrc ? `data:image/jpeg;base64,${item.imageSrc}` : '');

            return (
              <Card key={item.id} variant="flat" padding="none" className="overflow-hidden">
                <div style={getAspectRatioStyle(item.aspectRatio)} className="relative w-full bg-muted/10">
                  {imgSrc ? (
                    <img src={imgSrc} alt={`Generated twin: ${item.prompt}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                      No image
                    </div>
                  )}

                  {isDisabled && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs font-semibold capitalize">{currentItemLoadingState}...</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 p-3">
                  <p className="truncate text-[11px] text-muted-foreground">{item.prompt}</p>

                  <div className="grid grid-cols-2 gap-2">
                    {onSave && (
                      <ActionButton
                        label="Save"
                        icon={Save}
                        variant="primary"
                        onClick={() => onSave(item)}
                        disabled={isDisabled}
                      />
                    )}
                    <ActionButton
                      label="Regenerate"
                      icon={RefreshCw}
                      onClick={() => onAction(item, 'regenerate')}
                      disabled={isDisabled}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <ActionButton
                      label="Outfit"
                      icon={Shirt}
                      onClick={() => onAction(item, 'change_outfit')}
                      disabled={isDisabled}
                    />
                    <ActionButton
                      label="Hair"
                      icon={Sparkles}
                      onClick={() => onAction(item, 'change_hair_color')}
                      disabled={isDisabled}
                    />
                    <ActionButton
                      label="Color"
                      icon={Palette}
                      onClick={() => onAction(item, 'change_outfit_color')}
                      disabled={isDisabled}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
      </div>
    </section>
  );
}
