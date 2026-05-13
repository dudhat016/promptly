import React, { useState, useCallback, ChangeEvent } from 'react';
import { UploadCloud, Bot, AlertTriangle, Sparkles, BookOpen } from 'lucide-react';
import { fileToGenerativePart, analyzeImage, generateCaption } from '../services/geminiService';
import Loader from './ui/Loader';
import { CaptionOutput } from '../types';

const Analyzer: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [captionOutput, setCaptionOutput] = useState<CaptionOutput | null>(null);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setAnalysis(null);
            setError(null);
            setCaptionOutput(null);
        }
    };

    const handleAnalyze = useCallback(async () => {
        if (!imageFile) {
            setError("Please upload an image to analyze.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setAnalysis(null);
        setCaptionOutput(null);

        try {
            const imagePart = await fileToGenerativePart(imageFile);
            const result = await analyzeImage(imagePart);
            setAnalysis(result);
        } catch (err) {
            console.error(err);
            setError("Failed to analyze the image.");
        } finally {
            setIsLoading(false);
        }
    }, [imageFile]);

    const handleGenerateCaption = async () => {
        if (!analysis) return;
        setIsGeneratingCaption(true);
        setCaptionOutput(null);
        try {
            const result = await generateCaption(analysis);
            setCaptionOutput(result);
        } catch (err) {
            console.error(err);
        } finally {
            setIsGeneratingCaption(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">AI Image Analyzer</h2>
                <p className="text-gray-400 mt-2">Get an AI-powered analysis of your image's aesthetic and mood.</p>
            </div>

            <div className="max-w-md mx-auto p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl space-y-6">
                <label htmlFor="image-upload-analyzer" className="cursor-pointer block">
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-pink-500 transition">
                        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                        <span className="mt-2 block text-sm font-medium text-gray-300">
                            {imageFile ? `Selected: ${imageFile.name}` : 'Click to upload an image'}
                        </span>
                    </div>
                    <input id="image-upload-analyzer" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                </label>

                <button
                    onClick={handleAnalyze}
                    disabled={isLoading || !imageFile}
                    className="w-full flex items-center justify-center gap-2 bg-pink-600 text-white font-bold py-3 px-4 rounded-md hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
                >
                    {isLoading ? <><div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> Analyzing...</> : <><Bot className="w-5 h-5" /> Analyze Image</>}
                </button>
            </div>
            
             <div className="max-w-5xl mx-auto space-y-6">
                {(isLoading || analysis || error || imagePreview) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex flex-col items-center justify-center bg-gray-800/30 border border-gray-700 rounded-xl p-6 min-h-[300px]">
                            <h3 className="text-lg font-semibold text-gray-300 mb-2">Your Image</h3>
                            {imagePreview ? (
                                <img src={imagePreview} alt="To be analyzed" className="max-w-full max-h-96 object-contain rounded-lg"/>
                            ): <div className="text-gray-500">Upload an image to see it here.</div>}
                        </div>

                        <div className="flex flex-col items-center justify-center bg-gray-800/30 border border-gray-700 rounded-xl p-6 min-h-[300px]">
                            <h3 className="text-lg font-semibold text-gray-300 mb-4">AI Analysis</h3>
                            {isLoading && <Loader text="Analyzing..."/>}
                            {error && <div className="flex items-center gap-2 text-sm text-red-400"><AlertTriangle className="w-4 h-4" />{error}</div>}
                            {analysis && <div className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm max-h-96 overflow-y-auto">{analysis}</div>}
                            {!isLoading && !analysis && !error && <div className="text-gray-500 text-center">Analysis will appear here.</div>}
                        </div>
                    </div>
                )}

                {analysis && !isLoading && (
                    <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 space-y-3">
                        <button
                            onClick={handleGenerateCaption}
                            disabled={isGeneratingCaption}
                            className="w-full flex items-center justify-center gap-2 bg-gray-600/50 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700 disabled:bg-gray-600 transition"
                        >
                            <Sparkles className="w-5 h-5 text-pink-400" />
                            {isGeneratingCaption ? 'Generating Content...' : 'Generate Caption, Hooks & CTAs'}
                        </button>
                        {isGeneratingCaption && <div className="text-sm text-center text-gray-400">Writing something catchy...</div>}
                        {captionOutput && (
                             <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-2"><BookOpen className="w-5 h-5 text-pink-400"/> AI-Generated Content</h3>
                                <div>
                                    <h4 className="font-semibold text-gray-400 text-sm">Caption:</h4>
                                    <p className="mt-1 text-gray-200 p-3 bg-gray-900/50 rounded-md">{captionOutput.caption}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-400 text-sm">Hooks:</h4>
                                    <ul className="list-disc list-inside mt-1 text-gray-300 space-y-1 p-3 bg-gray-900/50 rounded-md">
                                        {captionOutput.hooks.map((h, i) => <li key={i}>{h}</li>)}
                                    </ul>
                                </div>
                                 <div>
                                    <h4 className="font-semibold text-gray-400 text-sm">Calls to Action:</h4>
                                    <ul className="list-disc list-inside mt-1 text-gray-300 space-y-1 p-3 bg-gray-900/50 rounded-md">
                                        {captionOutput.ctas.map((c, i) => <li key={i}>{c}</li>)}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Analyzer;
