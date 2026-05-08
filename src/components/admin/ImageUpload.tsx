import { Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { useImageUpload } from '../../hooks/useImageUpload';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  helpText?: string;
  aspectRatio?: 'square' | 'video' | 'any';
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  folder = 'general',
  label = 'Upload Image',
  helpText,
  aspectRatio = 'video',
  className = ''
}: ImageUploadProps) {
  const { uploadImage, isUploading } = useImageUpload();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const res = await uploadImage(file, folder);
      if (res?.success) onChange(res.url);
    }
  };

  const ratioClass = {
    square: 'aspect-square w-48',
    video: 'aspect-video w-full max-w-md',
    any: 'h-48 w-full max-w-md'
  }[aspectRatio];

  return (
    <div className={className}>
      <div className="flex items-start gap-6">
        {value ? (
          <div className={`relative group rounded-xl overflow-hidden border border-border shadow-md ${ratioClass}`}>
            <img src={value} className="w-full h-full object-cover" alt="Preview" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                type="button"
                onClick={() => onChange('')}
                className="bg-rose-500 text-white p-2 rounded-lg shadow-lg hover:scale-110 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <label className={`rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 hover:border-primary/40 transition-all text-muted-foreground hover:text-primary ${ratioClass}`}>
            <input 
              type="file" className="hidden" accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : (
              <>
                <div className="p-3 bg-card rounded-full shadow-sm border border-border">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest mt-1">{label}</span>
              </>
            )}
          </label>
        )}
        <div className="flex-grow pt-2">
          {helpText ? (
            <p className="text-xs text-muted-foreground font-medium leading-relaxed mb-3">{helpText}</p>
          ) : (
            <p className="text-xs text-muted-foreground font-medium leading-relaxed mb-3">
              {aspectRatio === 'video' ? 'Recommended: 1200x630px (16:9 Aspect Ratio).' : 
               aspectRatio === 'square' ? 'Recommended: 800x800px (1:1 Aspect Ratio).' : 
               'High resolution images recommended.'}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded">PNG, JPG, WEBP</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded">Max 5MB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
