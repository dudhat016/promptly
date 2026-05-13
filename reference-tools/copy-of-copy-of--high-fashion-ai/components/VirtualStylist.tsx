import React, { useState, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { fileToBase64 } from '../utils/file';
import { UploadIcon, SparklesIcon, PhotoIcon } from './icons';

const VirtualStylist: React.FC = () => {
  const [twinImage, setTwinImage] = useState<File | null>(null);
  const [twinImagePreview, setTwinImagePreview] = useState<string | null>(null);
  const [outfitImage, setOutfitImage] = useState<File | null>(null);
  const [outfitImagePreview, setOutfitImagePreview] = useState<string | null>(null);
  
  const [hairColor, setHairColor] = useState<string>('As in photo');
  const [hairStyle, setHairStyle] = useState<string>('As in photo');
  const [makeupStyle, setMakeupStyle] = useState<string>('As in photo');
  const [bustSize, setBustSize] = useState<string>('Natural');
  const [hipScale, setHipScale] = useState<string>('Natural');
  const [outfitAccuracyPrompt, setOutfitAccuracyPrompt] = useState<string>('');
  
  const [shotType, setShotType] = useState<string>('full body shot');
  const [enhanceBeauty, setEnhanceBeauty] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<string>('9:16');

  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const twinFileInputRef = useRef<HTMLInputElement>(null);
  const outfitFileInputRef = useRef<HTMLInputElement>(null);

  const shotTypes = ['head shot', 'upper body shot', 'mid body shot', 'full body shot'];
  const aspectRatios = ['9:16', '16:9', '1:1', '4:3', '3:4', '3:2', '2:3'];
  const hairColorOptions = ['As in photo', 'Jet Black', 'Chocolate Brown', 'Platinum Blonde', 'Fiery Red', 'Silver Gray', 'Pastel Pink', 'Vibrant Blue'];
  const hairStyleOptions = ['As in photo', 'Long & Wavy', 'Sleek High Ponytail', 'Short Bob', 'Pixie Cut', 'Intricate Braids', 'Curly Afro'];
  const makeupStyleOptions = ['As in photo', 'Natural Look', 'Smokey Eye', 'Full Glam', 'Bold Red Lip', 'Graphic Eyeliner'];
  const bustSizeOptions = ['Natural', 'DD', 'F', 'HHH'];
  const hipScaleOptions = ['Slimmer', 'Natural', 'Wider', 'Extra Wide'];


  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>, 
    setImage: (file: File | null) => void, 
    setPreview: (url: string | null) => void
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTransferOutfit = async () => {
    if (!twinImage || !outfitImage) {
      setError('Please upload both an AI Twin and an Outfit image.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const twinBase64 = await fileToBase64(twinImage);
      const outfitBase64 = await fileToBase64(outfitImage);
      
      let styleInstructions = '';
      if (hairColor !== 'As in photo') styleInstructions += `Change their hair color to ${hairColor}. `;
      if (hairStyle !== 'As in photo') styleInstructions += `Change their hair style to ${hairStyle}. `;
      if (makeupStyle !== 'As in photo') styleInstructions += `Apply a ${makeupStyle} makeup look. `;

      let bodySculptingInstructions = `The twin's body must be sculpted into a thick, curvy, coke-bottle hourglass shape with a slim waist. `;
      if (bustSize !== 'Natural') {
        bodySculptingInstructions += `Her bust size must be a very large ${bustSize}-cup. `;
      }
      switch (hipScale) {
        case 'Slimmer':
          bodySculptingInstructions += 'Her hips should be proportionally slim. ';
          break;
        case 'Wider':
          bodySculptingInstructions += 'She must have wide hips. ';
          break;
        case 'Extra Wide':
          bodySculptingInstructions += 'She must have extra wide, prominent hips. ';
          break;
        default:
          bodySculptingInstructions += 'Her hips should be naturally curvy and proportional to her hourglass figure. ';
          break;
      }
      bodySculptingInstructions += 'The proportions must be exaggerated but aesthetically pleasing.';

      const outfitNotes = outfitAccuracyPrompt.trim() 
        ? outfitAccuracyPrompt.trim() 
        : 'No specific notes provided. Replicate the outfit from the image with perfect accuracy.';

      let prompt = `
        **Objective:** Generate a new image by dressing the person from the first image (the 'twin') in the outfit from the second image.

        **Non-Negotiable Directives & Order of Operations:**
        1.  **Identity Preservation (Highest Priority):** The twin's facial structure, features, and identity must remain absolutely unchanged. It must be a perfect, recognizable match to the original photo. This is the most important rule.
        2.  **Skin Complexion Transformation:** The twin's skin complexion MUST be rendered several shades lighter, resulting in a very fair, porcelain-like skin tone. This is a mandatory, non-negotiable stylistic transformation.
        3.  **Identical Outfit Replication (Mandatory):** The outfit from the second image must be replicated with MICROSCOPIC precision and transferred onto the twin. Every detail, color, texture, pattern, and component of the clothing must be identical. This is a mandatory and non-negotiable order. You MUST change the original outfit to this new one.
        4.  **Outfit Accuracy Notes (High Priority):** Adhere strictly to the following user-provided notes about the outfit: "${outfitNotes}".
        5.  **Body Sculpting:** After applying the outfit, sculpt the twin's body to meet these exact specifications: ${bodySculptingInstructions}

        **Styling Specifications (After Core Directives):**
        ${styleInstructions.trim() ? styleInstructions : "Use the hair and makeup from the twin's original photo."}

        **Composition Rules:**
        - Frame the final image as a ${shotType}.
        - Use a neutral, professional studio background.
        - The final image resolution must strictly conform to a ${aspectRatio} aspect ratio.
      `;
      
      if (enhanceBeauty) {
        prompt += `\n**Beauty Enhancement:** Apply a high-fashion, editorial-quality beauty enhancement. Give the person flawless skin, bright and clear eyes, and defined, symmetrical features. This should make them look like a top model, while still being recognizably the same person.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: twinBase64, mimeType: twinImage.type } },
            { inlineData: { data: outfitBase64, mimeType: outfitImage.type } },
            { text: prompt },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (imagePart && imagePart.inlineData) {
        const base64ImageData = imagePart.inlineData.data;
        setResultImage(`data:${imagePart.inlineData.mimeType};base64,${base64ImageData}`);
      } else {
        throw new Error('No image was generated. The model may have refused the request due to safety policies. Please try a different combination of images or adjust your prompts.');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred while generating the image.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImage = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `high-fashion-ai-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ImageUploader: React.FC<{
    title: string;
    preview: string | null;
    onUploadClick: () => void;
  }> = ({ title, preview, onUploadClick }) => (
    <div
      onClick={onUploadClick}
      className="cursor-pointer w-full aspect-square bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 flex flex-col justify-center items-center text-gray-400 hover:border-gray-500 hover:text-white transition-colors"
    >
      {preview ? (
        <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
      ) : (
        <div className="text-center">
          <UploadIcon className="w-12 h-12 mb-2 mx-auto" />
          <span className="font-semibold">{title}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 bg-gray-900/50 rounded-2xl border border-gray-800 backdrop-blur-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Column 1: Twin & Customization */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-gray-300 text-center">1. AI Twin & Style</h3>
          <ImageUploader title="Upload AI Twin" preview={twinImagePreview} onUploadClick={() => twinFileInputRef.current?.click()} />
          <input type="file" ref={twinFileInputRef} onChange={(e) => handleFileChange(e, setTwinImage, setTwinImagePreview)} className="hidden" accept="image/*" />
          
          <div className="space-y-3 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
              <div>
                  <label htmlFor="hairColor" className="block text-xs font-medium text-gray-400 mb-1">Hair Color</label>
                  <select id="hairColor" value={hairColor} onChange={(e) => setHairColor(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500">
                      {hairColorOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
              </div>
              <div>
                  <label htmlFor="hairStyle" className="block text-xs font-medium text-gray-400 mb-1">Hair Style</label>
                  <select id="hairStyle" value={hairStyle} onChange={(e) => setHairStyle(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500">
                      {hairStyleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
              </div>
              <div>
                  <label htmlFor="makeupStyle" className="block text-xs font-medium text-gray-400 mb-1">Makeup Style</label>
                  <select id="makeupStyle" value={makeupStyle} onChange={(e) => setMakeupStyle(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500">
                      {makeupStyleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
              </div>
              <div>
                  <label htmlFor="bustSize" className="block text-xs font-medium text-gray-400 mb-1">Bust Size</label>
                  <select id="bustSize" value={bustSize} onChange={(e) => setBustSize(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500">
                      {bustSizeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
              </div>
              <div>
                  <label htmlFor="hipScale" className="block text-xs font-medium text-gray-400 mb-1">Hip Scale</label>
                  <select id="hipScale" value={hipScale} onChange={(e) => setHipScale(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500">
                      {hipScaleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
              </div>
          </div>

          <div className="flex items-center justify-center gap-2 p-2 bg-gray-800 rounded-md">
            <input
              id="enhanceBeauty"
              type="checkbox"
              checked={enhanceBeauty}
              onChange={(e) => setEnhanceBeauty(e.target.checked)}
              className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-gray-200 focus:ring-gray-500 cursor-pointer"
            />
            <label htmlFor="enhanceBeauty" className="text-sm text-gray-300 font-medium cursor-pointer">Enhance Beauty</label>
          </div>
        </div>

        {/* Column 2: Outfit & Framing */}
        <div className="space-y-4">
           <h3 className="font-semibold text-lg text-gray-300 text-center">2. Outfit & Framing</h3>
           <ImageUploader title="Upload Outfit" preview={outfitImagePreview} onUploadClick={() => outfitFileInputRef.current?.click()} />
           <input type="file" ref={outfitFileInputRef} onChange={(e) => handleFileChange(e, setOutfitImage, setOutfitImagePreview)} className="hidden" accept="image/*" />
          
          <div>
            <label htmlFor="outfitAccuracy" className="block text-xs font-medium text-gray-400 mb-1">Outfit Accuracy Notes (Optional)</label>
            <textarea
                id="outfitAccuracy"
                value={outfitAccuracyPrompt}
                onChange={(e) => setOutfitAccuracyPrompt(e.target.value)}
                placeholder="e.g., 'The dress is silk with intricate lace details on the sleeves...'"
                className="w-full h-24 bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Shot Type</label>
            <div className="grid grid-cols-2 gap-2">
              {shotTypes.map(type => (
                <button key={type} onClick={() => setShotType(type)} className={`px-3 py-2 text-sm rounded-md transition-colors ${shotType === type ? 'bg-gray-200 text-black font-semibold' : 'bg-gray-800 hover:bg-gray-700'}`}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-400 mb-2">Aspect Ratio</label>
            <select
              id="aspectRatio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              {aspectRatios.map(ar => <option key={ar} value={ar}>{ar}</option>)}
            </select>
          </div>
        </div>

        {/* Column 3: Output */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-gray-300 text-center">3. Your New Look</h3>
          <div className="w-full aspect-[9/16] bg-gray-800 rounded-lg flex justify-center items-center overflow-hidden border border-gray-700">
             {loading ? (
              <div className="text-center text-gray-400">
                <SparklesIcon className="w-16 h-16 animate-pulse mx-auto mb-4"/>
                <p>Dressing your twin...</p>
              </div>
            ) : resultImage ? (
              <img src={resultImage} alt="Generated result" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center text-gray-500 p-8">
                <PhotoIcon className="w-16 h-16 mx-auto mb-4"/>
                <p>Your generated image will appear here.</p>
              </div>
            )}
          </div>
          {resultImage && !loading && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleTransferOutfit}
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Regenerate
              </button>
              <button
                onClick={handleSaveImage}
                className="w-full flex justify-center items-center gap-2 bg-gray-200 text-black font-bold py-2 px-4 rounded-lg hover:bg-white transition-colors"
              >
                Save Image
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center">
        {!resultImage && (
          <button
            onClick={handleTransferOutfit}
            disabled={loading || !twinImage || !outfitImage}
            className="w-full md:w-1/3 flex justify-center items-center gap-2 bg-gray-200 text-black font-bold py-3 px-4 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Generating...' : 'Transfer Outfit'}
            <SparklesIcon className="w-5 h-5"/>
          </button>
        )}
        {error && <p className="mt-4 text-red-400 text-sm text-center">{error}</p>}
      </div>
    </div>
  );
};

export default VirtualStylist;