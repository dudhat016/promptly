import { ImagePlus, UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '../../primitives';

interface ImageUploaderProps {
  onImageUpload: (files: File[]) => void;
  onImageRemove: (index: number) => void;
  previews: string[];
  files: File[];
  maxImages: number;
}

export default function ImageUploader({ onImageUpload, onImageRemove, previews, files, maxImages }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const canUploadMore = files.length < maxImages;

  const openFilePicker = () => {
    if (canUploadMore) fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    onImageUpload(Array.from(event.target.files));
    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (!canUploadMore) return;
    const droppedFiles = Array.from(event.dataTransfer.files || []);
    if (droppedFiles.length === 0) return;

    onImageUpload(droppedFiles);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Source Photos</h2>
        <span className="text-[11px] font-bold text-muted-foreground">
          {files.length}/{maxImages}
        </span>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        multiple
        disabled={!canUploadMore}
      />

      <div
        onClick={openFilePicker}
        onDragOver={(event) => {
          event.preventDefault();
          if (canUploadMore) setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={[
          'relative min-h-40 rounded-xl border-2 border-dashed p-6 transition-all',
          canUploadMore ? 'cursor-pointer' : 'cursor-not-allowed opacity-75',
          isDragging && canUploadMore
            ? 'border-primary bg-primary/5'
            : 'border-border bg-muted/20 hover:border-primary/30 hover:bg-muted/30',
        ].join(' ')}
      >
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="mb-3 rounded-2xl bg-card p-3 shadow-sm border border-border">
            <UploadCloud className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-bold text-foreground">Drop images here or click to browse</p>
          <p className="mt-1 text-[11px] text-muted-foreground">PNG, JPG, WEBP. More reference photos improve likeness.</p>

          <div className="mt-4">
            <Button
              type="button"
              variant="soft"
              size="sm"
              leftIcon={ImagePlus}
              disabled={!canUploadMore}
              onClick={(event) => {
                event.stopPropagation();
                openFilePicker();
              }}
            >
              Add Photos
            </Button>
          </div>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {previews.map((src, index) => (
            <div key={`${src}-${index}`} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-card">
              <img src={src} alt={`Source ${index + 1}`} className="h-full w-full object-cover" />
              <button
                onClick={() => onImageRemove(index)}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove source image"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
