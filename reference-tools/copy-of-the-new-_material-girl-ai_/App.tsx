import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ControlPanel } from './components/ControlPanel';
import { ResultDisplay } from './components/ResultDisplay';
import { ApiKeyModal } from './components/ApiKeyModal';
import { editImage, generateVideo } from './services/geminiService';
import { AppState, Tab } from './types';

const VEO_ERROR_NOT_FOUND = "Requested entity was not found";

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    originalImages: [],
    editedImages: null,
    generatedVideoUrl: null,
    prompt: '',
    videoPrompt: '',
    aspectRatio: '16:9',
    isLoading: false,
    loadingMessage: '',
    error: null,
    activeTab: 'edit',
    apiKeySelected: false,
    showApiKeyModal: false,
    identityControl: 'exact',
    theme: 'solo',
    batchSize: 1,
  });

  const checkApiKey = useCallback(async () => {
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setAppState(prev => ({ ...prev, apiKeySelected: hasKey, showApiKeyModal: !hasKey }));
    } else {
       // Mock for local dev when aistudio is not present
      console.warn("window.aistudio not found. Assuming API key is selected for development.");
      setAppState(prev => ({...prev, apiKeySelected: true, showApiKeyModal: false}));
    }
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const handleImageUpload = (file: File) => {
    if (appState.originalImages.length < 2) {
        setAppState(prev => ({
          ...prev,
          originalImages: [...prev.originalImages, file],
          editedImages: null,
          generatedVideoUrl: null,
          error: null,
        }));
    }
  };
  
  const handleRemoveImage = (index: number) => {
      const newImages = index === -1 ? [] : appState.originalImages.filter((_, i) => i !== index);
      setAppState(prev => ({
          ...prev,
          originalImages: newImages,
          editedImages: null,
          generatedVideoUrl: null,
          error: null,
      }))
  }

  const handleImageEdit = async () => {
    if (appState.originalImages.length === 0 || !appState.prompt.trim()) return;

    setAppState(prev => ({ ...prev, isLoading: true, loadingMessage: `Generating ${appState.batchSize} image(s)...`, error: null, editedImages: null, generatedVideoUrl: null }));
    try {
      const promises = Array.from({ length: appState.batchSize }).map(() => 
        editImage(appState.prompt, appState.originalImages, appState.identityControl)
      );
      const results = await Promise.all(promises);
      setAppState(prev => ({ ...prev, editedImages: results, isLoading: false }));
    } catch (e: any) {
      console.error(e);
      setAppState(prev => ({ ...prev, error: `Image editing failed: ${e.message}`, isLoading: false }));
    }
  };

  const handleVideoGeneration = async () => {
    if (appState.originalImages.length === 0 || !appState.videoPrompt.trim()) return;

    if (!appState.apiKeySelected) {
      setAppState(prev => ({ ...prev, showApiKeyModal: true }));
      return;
    }
    
    setAppState(prev => ({ ...prev, isLoading: true, loadingMessage: "Warming up the video studio...", error: null, editedImages: null, generatedVideoUrl: null }));
    try {
      // For video, we only use the first image as the reference
      const primaryImage = appState.originalImages[0];
      const onProgress = (message: string) => setAppState(prev => ({ ...prev, loadingMessage: message }));
      const result = await generateVideo(appState.videoPrompt, primaryImage, appState.aspectRatio, appState.identityControl, onProgress);
      setAppState(prev => ({ ...prev, generatedVideoUrl: result, isLoading: false }));
    } catch (e: any) {
      console.error(e);
       if (e.message?.includes(VEO_ERROR_NOT_FOUND)) {
        setAppState(prev => ({...prev, error: "API Key not found. Please select your key.", isLoading: false, apiKeySelected: false, showApiKeyModal: true}));
       } else {
        setAppState(prev => ({ ...prev, error: `Video generation failed: ${e.message}`, isLoading: false }));
       }
    }
  };
  
  const handleUseImageAsInput = async (imageUrl: string) => {
    try {
        setAppState(prev => ({ ...prev, isLoading: true, loadingMessage: "Setting new reference image...", error: null }));
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], "new_base_image.png", { type: blob.type });
        setAppState(prev => ({
            ...prev,
            originalImages: [file],
            editedImages: null,
            generatedVideoUrl: null,
            prompt: '',
            videoPrompt: '',
            error: null,
            isLoading: false,
        }));
    } catch (e) {
        console.error("Failed to use image as input", e);
        setAppState(prev => ({ ...prev, error: "Failed to use the generated image as a new input.", isLoading: false }));
    }
  };


  return (
    <div className="bg-[#101010] min-h-screen text-white p-4 sm:p-8 selection:bg-pink-500 selection:text-white">
      <div className="max-w-screen-2xl mx-auto">
        <Header />

        <main className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main content area */}
          <div className="lg:col-span-8 flex flex-col justify-center items-center bg-black/20 rounded-2xl p-4 min-h-[calc(100vh-200px)]">
            {appState.originalImages.length === 0 ? (
                 <ImageUploader 
                    onImageUpload={handleImageUpload} 
                    originalImages={appState.originalImages}
                    onRemoveImage={handleRemoveImage}
                 />
            ) : (
                <ResultDisplay {...appState} onUseAsInput={handleUseImageAsInput} />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
              <div className="sticky top-8 flex flex-col gap-8">
                {appState.originalImages.length > 0 && (
                  <ImageUploader
                    onImageUpload={handleImageUpload} 
                    originalImages={appState.originalImages}
                    onRemoveImage={handleRemoveImage}
                  />
                )}
                <ControlPanel
                    appState={appState}
                    setAppState={setAppState}
                    onImageEdit={handleImageEdit}
                    onVideoGenerate={handleVideoGeneration}
                />
              </div>
          </div>
        </main>
      </div>
      {appState.showApiKeyModal && (
        <ApiKeyModal 
          onClose={() => setAppState(prev => ({...prev, showApiKeyModal: false}))}
          onKeySelected={() => {
            setAppState(prev => ({...prev, apiKeySelected: true, showApiKeyModal: false}));
          }}
        />
      )}
    </div>
  );
};

export default App;
