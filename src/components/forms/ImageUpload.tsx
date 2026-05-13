import React, { useId } from 'react';
import { Camera, Image as ImageIcon, Loader2, X, UploadCloud, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useImageUpload } from '../../hooks/useImageUpload';
import Button from '../primitives/Button';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  variant?: 'circle' | 'square' | 'dropzone';
  label?: string;
  description?: string;
  folder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * A premium, multi-variant Image Upload component.
 * Features circle (avatar), square (card), and dropzone (hero) modes.
 */
export default function ImageUpload({
  value,
  onChange,
  variant = 'dropzone',
  label = 'Upload Image',
  description,
  folder = 'general',
  className,
  disabled = false
}: ImageUploadProps) {
  const { uploadImage, isUploading } = useImageUpload();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const inputId = `image-upload-${generatedId}`;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const res = await uploadImage(file, folder);
      if (res?.success) onChange(res.url);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Circular Variant (Perfect for User Avatars)
  if (variant === 'circle') {
    return (
      <div className={cn("flex flex-col items-center gap-4", className)}>
        <div className="relative group">
          <div 
            className={cn(
              "w-28 h-28 rounded-full border-4 border-background shadow-xl overflow-hidden bg-muted flex items-center justify-center transition-all",
              !disabled && "hover:border-primary/20 cursor-pointer"
            )}
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            {value ? (
              <img src={value} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-8 h-8 text-muted-foreground/40" />
            )}
            
            {!disabled && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </div>
            )}
          </div>
          
          {value && !disabled && (
            <Button
              onClick={handleClear}
              variant="danger"
              size="icon"
              className="absolute -top-1 -right-1 w-8 h-8 rounded-full shadow-lg z-20"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        
        {label && (
          <label 
            htmlFor={inputId}
            className="text-center cursor-pointer block"
          >
            <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">{label}</h4>
            {description && <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1">{description}</p>}
          </label>
        )}
        
        <input 
          id={inputId}
          ref={fileInputRef}
          type="file" 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange} 
          disabled={disabled || isUploading} 
        />
      </div>
    );
  }

  // Square Variant (Ideal for Prompts or Assets)
  if (variant === 'square') {
    return (
      <div className={cn("space-y-4", className)}>
        {label && (
          <label 
            htmlFor={inputId}
            className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground ml-1 cursor-pointer block"
          >
            {label}
          </label>
        )}
        
        <div 
          className={cn(
            "relative aspect-square w-full rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center transition-all",
            !value && !disabled && "hover:bg-muted/50 hover:border-primary/30 cursor-pointer",
            value && "border-solid border-border"
          )}
          onClick={() => !value && !disabled && fileInputRef.current?.click()}
        >
          {value ? (
            <>
              <img src={value} className="w-full h-full object-cover" alt="Preview" />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button 
                  onClick={handleClear}
                  variant="danger"
                  size="icon"
                  className="w-10 h-10 shadow-xl"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              {isUploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              ) : (
                <>
                  <div className="p-4 bg-card rounded-2xl shadow-sm border border-border group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/60" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Click to upload</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">SVG, PNG, JPG (Max 5MB)</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <input 
          id={inputId}
          ref={fileInputRef}
          type="file" className="hidden" accept="image/*"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
        />
      </div>
    );
  }

  // Dropzone Variant (Full width hero style)
  return (
    <div className={cn("w-full", className)}>
      <div 
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          "relative min-h-[240px] rounded-2xl border-2 border-dashed border-border bg-card/50 flex flex-col items-center justify-center transition-all p-10 group overflow-hidden",
          !disabled && "hover:border-primary/40 hover:bg-muted/30 cursor-pointer",
          value && "border-solid bg-card"
        )}
      >
        {value ? (
          <div className="absolute inset-0">
            <img src={value} className="w-full h-full object-cover" alt="Hero" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 right-6 flex gap-3">
              <Button 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                variant="white"
                size="sm"
                className="bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20 font-bold uppercase tracking-widest"
              >
                Change Image
              </Button>
              <Button 
                onClick={handleClear}
                variant="danger"
                size="icon"
                className="w-8 h-8 shadow-xl"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center max-w-sm">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <UploadCloud className="w-10 h-10" />}
            </div>
            {label && (
              <label 
                htmlFor={inputId}
                className="cursor-pointer"
              >
                <h4 className="text-xl font-bold text-foreground mb-2">{label}</h4>
              </label>
            )}
            <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-6">
              {description || "Drag and drop your high-resolution assets here, or click to browse your computer."}
            </p>
            <div className="flex items-center gap-6 py-2 px-6 bg-muted/50 rounded-full border border-border/50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Safe Storage</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Max 10MB</div>
            </div>
          </div>
        )}
        <input 
          id={inputId}
          ref={fileInputRef}
          type="file" className="hidden" accept="image/*"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
        />
      </div>
    </div>
  );
}
