import { Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import AdvancedSettings from '../../components/ai/twinStudio/AdvancedSettings';
import GenerateButton from '../../components/ai/twinStudio/GenerateButton';
import GenerationSettings from '../../components/ai/twinStudio/GenerationSettings';
import ImageUploader from '../../components/ai/twinStudio/ImageUploader';
import PromptInput from '../../components/ai/twinStudio/PromptInput';
import ResultDisplay from '../../components/ai/twinStudio/ResultDisplay';
import type { TwinStudioCardAction, TwinStudioGalleryItem, TwinStudioLoadingState } from '../../components/ai/twinStudio/types';
import Alert from '../../components/feedback/Alert';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { uploadToHostinger } from '../../lib/storage';
import { GeminiQuotaError, generateTwinImage, generateTwinMagicPrompt, listTwinCreations, saveTwinCreation } from '../../services/aiTwinStudioService';

const MAX_IMAGES = 8;
const GALLERY_STORAGE_LIMIT = 24;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapCreationToGalleryItem(item: any): TwinStudioGalleryItem {
  return {
    id: item.id,
    imageUrl: item.imageUrl,
    prompt: String(item.prompt || ''),
    aspectRatio: String(item.aspectRatio || '9:16'),
    ...(item.options || {}),
  };
}

export default function AITwinStudioPage() {
  const { profile } = useAuth();
  const { prefix } = usePath();

  const geminiKey = profile?.aiKeys?.gemini;
  const geminiModel = profile?.aiModels?.gemini?.image || 'gemini-2.5-flash-image';

  const [originalImages, setOriginalImages] = useState<File[]>([]);
  const [originalImagePreviews, setOriginalImagePreviews] = useState<string[]>([]);

  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('9:16');
  const [numberOfImages, setNumberOfImages] = useState<number>(2);
  const [matchOriginalFace, setMatchOriginalFace] = useState<boolean>(true);
  const [matchSkinTone, setMatchSkinTone] = useState<boolean>(true);

  const [hairstyle, setHairstyle] = useState('Default');
  const [nails, setNails] = useState('Default');
  const [outfit, setOutfit] = useState('Default');
  const [skinComplexion, setSkinComplexion] = useState('Default');

  const [latestCreations, setLatestCreations] = useState<TwinStudioGalleryItem[]>([]);
  const [gallery, setGallery] = useState<TwinStudioGalleryItem[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMagicPromptLoading, setIsMagicPromptLoading] = useState<boolean>(false);
  const [itemIsLoading, setItemIsLoading] = useState<Record<string, TwinStudioLoadingState>>({});
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntilMs, setCooldownUntilMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const cooldownSeconds = useMemo(() => {
    if (!cooldownUntilMs) return 0;
    return Math.max(0, Math.ceil((cooldownUntilMs - nowMs) / 1000));
  }, [cooldownUntilMs, nowMs]);

  const generationOptions = useMemo(
    () => ({ hairstyle, nails, outfit, skinComplexion }),
    [hairstyle, nails, outfit, skinComplexion]
  );

  const errorWithCountdown = useMemo(() => {
    if (!error) return null;
    if (cooldownSeconds > 0 && error.includes('Rate limited')) {
      return `Rate limited. Auto-retrying in ${cooldownSeconds}s...`;
    }
    return error;
  }, [error, cooldownSeconds]);

  useEffect(() => {
    if (!cooldownUntilMs) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [cooldownUntilMs]);

  useEffect(() => {
    if (cooldownUntilMs && cooldownUntilMs <= nowMs) setCooldownUntilMs(null);
  }, [cooldownUntilMs, nowMs]);

  useEffect(() => {
    return () => {
      originalImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [originalImagePreviews]);

  useEffect(() => {
    let cancelled = false;

    listTwinCreations(GALLERY_STORAGE_LIMIT)
      .then((items) => {
        if (cancelled) return;
        setGallery(items.map(mapCreationToGalleryItem));
      })
      .catch(() => {
        // ignore API errors silently here
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleImageUpload = useCallback(
    (newFiles: File[]) => {
      const imageOnly = newFiles.filter((file) => file.type.startsWith('image/'));
      if (imageOnly.length === 0) {
        setError('Only image files are supported.');
        return;
      }

      const combined = [...originalImages, ...imageOnly].slice(0, MAX_IMAGES);
      if (combined.length === originalImages.length) return;

      originalImagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setOriginalImages(combined);
      setOriginalImagePreviews(combined.map((file) => URL.createObjectURL(file)));
      setError(null);
    },
    [originalImages, originalImagePreviews]
  );

  const handleImageRemove = useCallback(
    (indexToRemove: number) => {
      const newImages = originalImages.filter((_, index) => index !== indexToRemove);
      const newPreviews = originalImagePreviews.filter((_, index) => index !== indexToRemove);

      if (originalImagePreviews[indexToRemove]) {
        URL.revokeObjectURL(originalImagePreviews[indexToRemove]);
      }

      setOriginalImages(newImages);
      setOriginalImagePreviews(newPreviews);
    },
    [originalImages, originalImagePreviews]
  );

  const handleMagicPrompt = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsMagicPromptLoading(true);
    setError(null);

    try {
      const magicPrompt = await generateTwinMagicPrompt({
        description: prompt,
        apiKey: geminiKey,
        model: profile?.aiModels?.gemini?.text || 'gemini-1.5-flash',
      });
      setPrompt(magicPrompt.trim());
    } catch (e) {
      if (e instanceof GeminiQuotaError) {
        if (e.retryAfterSeconds && e.retryAfterSeconds > 0) {
          setCooldownUntilMs(Date.now() + e.retryAfterSeconds * 1000);
          setError(`Rate limited. Please retry in ${e.retryAfterSeconds}s.`);
        } else {
          setError(e.message || 'Quota exceeded. Please check your Gemini plan/billing.');
        }
      } else {
        setError('Failed to generate magic prompt. Please try again.');
      }
    } finally {
      setIsMagicPromptLoading(false);
    }
  }, [prompt]);

  const handleGenerate = useCallback(async () => {
    if (originalImages.length === 0) {
      setError('Please upload at least one image to begin.');
      return;
    }

    if (cooldownSeconds > 0) {
      setError(`Rate limited. Please retry in ${cooldownSeconds}s.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setLatestCreations([]);

    const effectivePrompt = prompt.trim() || 'A beautiful, photorealistic studio shot.';

    try {
      const results: string[] = [];

      for (let i = 0; i < numberOfImages; i++) {
        let attempt = 0;

        while (true) {
          try {
            const generated = await generateTwinImage({
              imageFiles: originalImages,
              prompt: effectivePrompt,
              aspectRatio,
              options: generationOptions,
              matchOriginalFace,
              matchSkinTone,
              apiKey: geminiKey,
              model: geminiModel,
            });

            results.push(generated);
            
            // Show partial results immediately
            const latestItem: TwinStudioGalleryItem = {
              id: crypto.randomUUID(),
              imageSrc: generated,
              prompt: effectivePrompt,
              aspectRatio,
              ...generationOptions,
            };
            setLatestCreations(prev => [...prev, latestItem]);
            setGallery(prev => [latestItem, ...prev]);
            
            break;
          } catch (err: any) {
            if (err instanceof GeminiQuotaError) {
              const retry = err.retryAfterSeconds || 60; // Default to 60 if not provided
              if (retry > 0 && attempt < 2) {
                setCooldownUntilMs(Date.now() + (retry + 1) * 1000); // Add 1s buffer
                setError(`Rate limited. Waiting ${retry}s then retrying...`);
                await sleep(retry * 1000 + 500);
                attempt += 1;
                continue;
              }
            }

            throw err;
          }
        }

        if (i < numberOfImages - 1) {
          await sleep(1000); // Slightly longer gap between images to avoid rapid-fire 429s
        }
      }

      toast.success('Twins created!');
    } catch (e: any) {
      if (e instanceof GeminiQuotaError) {
        const retry = e.retryAfterSeconds || 0;
        if (retry > 0) setCooldownUntilMs(Date.now() + retry * 1000);
        setError(e.message || (retry > 0 ? `Quota exceeded. Retry in ${retry}s.` : 'Quota exceeded. Please check billing/plan.'));
      } else {
        setError(e?.message || 'Generation failed. Please try again.');
      }

      toast.error('Generation failed.');
    } finally {
      setIsLoading(false);
    }
  }, [
    originalImages,
    prompt,
    cooldownSeconds,
    numberOfImages,
    aspectRatio,
    generationOptions,
    matchOriginalFace,
    matchSkinTone,
    geminiKey,
    geminiModel,
    profile,
  ]);

  const handleAction = useCallback(
    async (item: TwinStudioGalleryItem, action: TwinStudioCardAction) => {
      if (cooldownSeconds > 0) {
        setError(`Rate limited. Please retry in ${cooldownSeconds}s.`);
        return;
      }

      if (originalImages.length === 0) {
        setError('Please re-select your source image(s) to perform this action.');
        return;
      }

      let loadingState: TwinStudioLoadingState = 'regenerating';
      if (action === 'change_outfit') loadingState = 'changing outfit';
      if (action === 'change_hair_color') loadingState = 'changing hair color';
      if (action === 'change_outfit_color') loadingState = 'changing outfit color';

      setItemIsLoading((prev) => ({ ...prev, [item.id]: loadingState }));
      setError(null);

      const options = {
        hairstyle: item.hairstyle,
        nails: item.nails,
        outfit: item.outfit,
        skinComplexion: item.skinComplexion,
        action: action === 'regenerate' ? undefined : action,
      };

      try {
        const result = await generateTwinImage({
          imageFiles: originalImages,
          prompt: item.prompt,
          aspectRatio: item.aspectRatio,
          options,
          matchOriginalFace,
          matchSkinTone,
          apiKey: geminiKey,
          model: geminiModel,
        });

        const newItem: TwinStudioGalleryItem = {
          id: crypto.randomUUID(),
          imageSrc: result,
          prompt: item.prompt,
          aspectRatio: item.aspectRatio,
          hairstyle: item.hairstyle,
          nails: item.nails,
          outfit: item.outfit,
          skinComplexion: item.skinComplexion,
        };

        setGallery((prev) => [newItem, ...prev.filter((existing) => existing.id !== item.id)]);
        toast.success('Updated!');
      } catch (e) {
        if (e instanceof GeminiQuotaError) {
          const retry = e.retryAfterSeconds || 0;
          if (retry > 0) setCooldownUntilMs(Date.now() + retry * 1000);
          setError(e.message || (retry > 0 ? `Rate limited. Retry in ${retry}s.` : 'Quota exceeded. Please check billing/plan.'));
        } else {
          setError(`Failed to ${action}. Please try again.`);
        }

        toast.error('Update failed.');
      } finally {
        setItemIsLoading((prev) => ({ ...prev, [item.id]: false }));
      }
    },
    [cooldownSeconds, originalImages, matchOriginalFace, matchSkinTone, geminiKey, geminiModel]
  );

  const handleSave = useCallback(async (item: TwinStudioGalleryItem) => {
    if (!item.imageSrc) {
      toast.error('No image data to save.');
      return;
    }

    try {
      const safePrompt = item.prompt.replace(/[^a-z0-9\s]/gi, '').trim().replace(/\s+/g, '_');
      const blob = await (await fetch(`data:image/jpeg;base64,${item.imageSrc}`)).blob();
      const file = new File([blob], `ai_twin_${safePrompt.slice(0, 40) || 'image'}.jpeg`, {
        type: blob.type || 'image/jpeg',
      });

      const url = await uploadToHostinger(file, 'ai_twin_studio');
      await saveTwinCreation({
        imageUrl: url,
        prompt: item.prompt,
        aspectRatio: item.aspectRatio,
        options: {
          hairstyle: item.hairstyle,
          nails: item.nails,
          outfit: item.outfit,
          skinComplexion: item.skinComplexion,
        },
      });

      const refreshed = await listTwinCreations(GALLERY_STORAGE_LIMIT);
      setGallery(refreshed.map(mapCreationToGalleryItem));

      toast.success('Saved to your gallery!');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save.');
    }
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-4 w-4" />
            AI Labs
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">AI Twin Studio</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Upload a few reference photos and generate photorealistic twin images with your connected Gemini profile settings.
          </p>
        </div>
      </div>


      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <ImageUploader
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
            previews={originalImagePreviews}
            files={originalImages}
            maxImages={MAX_IMAGES}
          />

          <div className="flex flex-col gap-6">
            <PromptInput value={prompt} onChange={setPrompt} onMagicPrompt={handleMagicPrompt} isMagicLoading={isMagicPromptLoading} />
            <GenerationSettings
              numberOfImages={numberOfImages}
              onNumberOfImagesChange={setNumberOfImages}
              aspectRatio={aspectRatio}
              onRatioChange={setAspectRatio}
              matchOriginalFace={matchOriginalFace}
              onMatchOriginalFaceChange={setMatchOriginalFace}
              matchSkinTone={matchSkinTone}
              onMatchSkinToneChange={setMatchSkinTone}
            />
            <AdvancedSettings
              hairstyle={hairstyle}
              setHairstyle={setHairstyle}
              nails={nails}
              setNails={setNails}
              outfit={outfit}
              setOutfit={setOutfit}
              skinComplexion={skinComplexion}
              setSkinComplexion={setSkinComplexion}
            />
          </div>
        </div>

        <div className="mt-8">
          <GenerateButton
            onClick={handleGenerate}
            isLoading={isLoading}
            isDisabled={originalImages.length === 0 || isMagicPromptLoading || cooldownSeconds > 0}
            numberOfImages={numberOfImages}
          />

          {cooldownSeconds > 0 && !errorWithCountdown?.includes('Auto-retrying') && (
            <p className="mt-3 text-center text-sm font-semibold text-amber-500">
              Rate limited - retry in {cooldownSeconds}s.
            </p>
          )}

          {errorWithCountdown && <p className="mt-4 text-center text-sm font-semibold text-rose-500">{errorWithCountdown}</p>}
        </div>
      </section>

      {(isLoading || latestCreations.length > 0) && (
        <ResultDisplay
          title="Latest Creations"
          isLoading={isLoading}
          items={latestCreations}
          onAction={handleAction}
          itemIsLoading={itemIsLoading}
          placeholderCount={numberOfImages}
          onSave={handleSave}
        />
      )}

      {gallery.length > 0 && (
        <ResultDisplay title="Studio Gallery" items={gallery} onAction={handleAction} itemIsLoading={itemIsLoading} />
      )}
    </div>
  );
}
