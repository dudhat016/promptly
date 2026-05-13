import React, { useState, useCallback } from 'react';
import { OptionsPanel } from './components/OptionsPanel';
import { ImageDisplay } from './components/ImageDisplay';
import { Header } from './components/Header';
import { generateLuxeImage } from './services/geminiService';

const App: React.FC = () => {
  const [selectedEthnicity, setSelectedEthnicity] = useState<string>('Random');
  const [complexion, setComplexion] = useState<string>('Match Reference (if uploaded)');
  const [makeupStyle, setMakeupStyle] = useState<string>('Natural Glow');
  const [hairstyle, setHairstyle] = useState<string>('Sleek Ponytail');
  const [nailStyle, setNailStyle] = useState<string>('Nude');
  const [clothingStyle, setClothingStyle] = useState<string>('Elegant black tie gown');
  const [setting, setSetting] = useState<string>('Modern Loft');
  const [photographyStyle, setPhotographyStyle] = useState<string>('Cinematic Lifestyle');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateClick = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageB64 = await generateLuxeImage({
        ethnicity: selectedEthnicity,
        complexion,
        makeupStyle,
        hairstyle,
        nailStyle,
        clothingStyle,
        setting,
        photographyStyle,
        customPrompt,
        uploadedImage,
      });
      setGeneratedImage(`data:image/jpeg;base64,${imageB64}`);
    } catch (e) {
      console.error(e);
      setError('Failed to generate image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedEthnicity, complexion, makeupStyle, hairstyle, nailStyle, clothingStyle, setting, photographyStyle, customPrompt, uploadedImage]);

  return (
    <div className="min-h-screen bg-pink-50 text-pink-900 font-sans">
      <Header />
      <main className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
        <OptionsPanel
          selectedEthnicity={selectedEthnicity}
          setSelectedEthnicity={setSelectedEthnicity}
          complexion={complexion}
          setComplexion={setComplexion}
          makeupStyle={makeupStyle}
          setMakeupStyle={setMakeupStyle}
          hairstyle={hairstyle}
          setHairstyle={setHairstyle}
          nailStyle={nailStyle}
          setNailStyle={setNailStyle}
          clothingStyle={clothingStyle}
          setClothingStyle={setClothingStyle}
          setting={setting}
          setSetting={setSetting}
          photographyStyle={photographyStyle}
          setPhotographyStyle={setPhotographyStyle}
          customPrompt={customPrompt}
          setCustomPrompt={setCustomPrompt}
          isLoading={isLoading}
          onGenerateClick={handleGenerateClick}
          uploadedImage={uploadedImage}
          setUploadedImage={setUploadedImage}
        />
        <ImageDisplay
          generatedImage={generatedImage}
          isLoading={isLoading}
          error={error}
        />
      </main>
    </div>
  );
};

export default App;