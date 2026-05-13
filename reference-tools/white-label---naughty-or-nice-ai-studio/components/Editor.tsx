import React, { useState, useRef } from 'react';
import { analyzeImage, editImage } from '../services/geminiService';
import Button from './Button';
import Spinner from './Spinner';
import { PhotoIcon, SparklesIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const Editor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [editPrompt, setEditPrompt] = useState<string>('Add a vintage film grain effect.');
  const [loading, setLoading] = useState<{ analysis: boolean; edit: boolean }>({ analysis: false, edit: false });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);
      setEditedImage(null);
      setAnalysis('');
      setOriginalImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!originalImage || !originalImageFile) return;
    setLoading(prev => ({ ...prev, analysis: true }));
    setError(null);
    try {
      const result = await analyzeImage(originalImage, originalImageFile.type);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setLoading(prev => ({ ...prev, analysis: false }));
    }
  };

  const handleEdit = async () => {
    if (!originalImage || !originalImageFile || !editPrompt) return;
    setLoading(prev => ({ ...prev, edit: true }));
    setError(null);
    try {
      const result = await editImage(originalImage, originalImageFile.type, editPrompt);
      setEditedImage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Editing failed.');
    } finally {
      setLoading(prev => ({ ...prev, edit: false }));
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-black/30 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-white/20">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          ref={fileInputRef}
        />
        <Button onClick={() => fileInputRef.current?.click()}>
          <PhotoIcon className="w-5 h-5 mr-2"/>
          {originalImage ? 'Upload New Image' : 'Upload an Image'}
        </Button>
        {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg mt-4 text-sm">{error}</p>}
      </div>

      {originalImage && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-red-400">Original Image</h3>
            <div className="aspect-square bg-black/20 rounded-lg overflow-hidden flex items-center justify-center">
                <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain" />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-red-400">Edited Image</h3>
            <div className="aspect-square bg-black/20 rounded-lg flex items-center justify-center p-4">
              {loading.edit ? <Spinner /> : editedImage ? (
                <img src={editedImage} alt="Edited" className="max-w-full max-h-full object-contain rounded-lg" />
              ) : <p className="text-gray-500">Your AI-edited image will appear here.</p>}
            </div>
          </div>
        </div>
      )}
      
      {originalImage && (
         <div className="bg-black/30 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-white/20 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-red-400 mb-3">AI Image Analysis</h3>
              <Button onClick={handleAnalyze} disabled={loading.analysis}>
                  <DocumentTextIcon className="w-5 h-5 mr-2" />
                  {loading.analysis ? 'Analyzing...' : 'Analyze Image'}
              </Button>
              {loading.analysis && !analysis ? <Spinner className="mt-4" /> : analysis && (
                 <div className="mt-4 p-4 bg-black/20 rounded-lg text-gray-300 whitespace-pre-wrap">{analysis}</div>
              )}
            </div>

            <div className="border-t border-gray-600 pt-6">
               <h3 className="text-xl font-bold text-red-400 mb-3">AI Image Editing</h3>
                <div>
                  <label htmlFor="editPrompt" className="block text-sm font-medium text-gray-300 mb-1">
                    Editing Prompt
                  </label>
                  <textarea
                    id="editPrompt"
                    rows={3}
                    value={editPrompt}
                    onChange={e => setEditPrompt(e.target.value)}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., Make the background snowy"
                  />
                </div>
                <Button onClick={handleEdit} disabled={loading.edit} className="mt-3">
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    {loading.edit ? 'Editing...' : 'Apply Edit'}
                </Button>
            </div>
         </div>
      )}
    </div>
  );
};

export default Editor;