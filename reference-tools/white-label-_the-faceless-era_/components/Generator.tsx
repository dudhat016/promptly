import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Sparkles, Wand2, ChevronDown, AlertTriangle, BookOpen, Download, RefreshCw } from 'lucide-react';
import { generateImage, generateCaption } from '../services/geminiService';
import Loader from './ui/Loader';
import { SCENE_PRESETS, ETHNICITY_OPTIONS, OUTPUT_MODES, ASPECT_RATIOS } from '../constants';
import { AESTHETIC_PROMPTS } from '../prompts';
import type { PromptTemplate, ScenePreset, CaptionOutput } from '../types';

const Generator: React.FC = () => {
    const [prompt, setPrompt] = useState<PromptTemplate>(SCENE_PRESETS[0].template as PromptTemplate);
    const [selectedCategory, setSelectedCategory] = useState<string>(AESTHETIC_PROMPTS[0].name);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [captionOutput, setCaptionOutput] = useState<CaptionOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        handlePresetChange(SCENE_PRESETS[0].name);
    }, []);

    const handlePresetChange = (presetName: string) => {
        const preset = SCENE_PRESETS.find(p => p.name === presetName) as ScenePreset;
        setPrompt(prev => ({
            ...prev,
            ...preset.template,
            // Retain user's previous high-level choices if they exist
            mode: prev.mode,
            ethnicity: prev.ethnicity,
            custom_prompt: prev.custom_prompt || ''
        }));
    };
    
    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        setCaptionOutput(null);

        try {
            const images = await generateImage(prompt);
            setGeneratedImages(images);

            if (prompt.mode === 'image_plus_caption') {
                const captionData = await generateCaption(JSON.stringify(prompt));
                setCaptionOutput(captionData);
            }
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate. ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = (imageUrl: string, index: number) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `faceless-era-image-${index + 1}.jpeg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const InputField = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
        <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
            <input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-md text-gray-200 focus:ring-1 focus:ring-pink-500 transition" />
        </div>
    );
    
    const TextareaField = ({ label, value, onChange, rows = 3 }: { label: string, value: string | string[], onChange: (val: string) => void, rows?: number }) => (
        <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
            <textarea value={Array.isArray(value) ? value.join(', ') : value} onChange={e => onChange(e.target.value)} rows={rows} className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-md text-gray-200 focus:ring-1 focus:ring-pink-500 transition" />
        </div>
    );

    // FIX: Correctly apply the 'readonly' modifier to the 'options' prop type.
    const SelectField = ({ label, value, onChange, options, placeholder }: { label: string, value: string, onChange: (val: any) => void, options: readonly (string | {value: string, label: string})[], placeholder?: string }) => (
        <div className="flex-1 min-w-[120px]">
             <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
             <select value={value} onChange={e => onChange(e.target.value)} className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-md text-gray-200 focus:ring-1 focus:ring-pink-500 transition">
                {placeholder && <option value="">{placeholder}</option>}
                {options.map(opt => {
                    if (typeof opt === 'string') {
                        return <option key={opt} value={opt}>{opt.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>;
                    }
                    return <option key={opt.value} value={opt.value}>{opt.label}</option>;
                })}
            </select>
        </div>
    );


    const currentInspirationPrompts = AESTHETIC_PROMPTS.find(c => c.name === selectedCategory)?.prompts || [];

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">AI Prompt Generator</h2>
                <p className="text-gray-400 mt-2">Design your "Vogue x Ebony Incline" aesthetic with precision.</p>
            </div>

            <div className="p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl space-y-6">
                {/* --- TOP CONTROLS --- */}
                <div className="flex flex-wrap gap-4 border-b border-gray-700 pb-6">
                    <SelectField label="Scene Preset" value={SCENE_PRESETS.find(p => p.template.scene === prompt.scene)?.name || SCENE_PRESETS[0].name} onChange={(val: string) => handlePresetChange(val)} options={SCENE_PRESETS.map(p => p.name)} />
                    <SelectField label="Output Mode" value={prompt.mode} onChange={val => setPrompt(p => ({ ...p, mode: val }))} options={OUTPUT_MODES} />
                    <SelectField label="Aspect Ratio" value={prompt.aspect_ratio} onChange={val => setPrompt(p => ({ ...p, aspect_ratio: val }))} options={ASPECT_RATIOS} />
                    <SelectField label="Ethnicity" value={prompt.ethnicity || ETHNICITY_OPTIONS[0]} onChange={val => setPrompt(p => ({ ...p, ethnicity: val }))} options={ETHNICITY_OPTIONS} />
                </div>
                
                {/* --- INSPIRATION CONTROLS --- */}
                <div className="flex flex-col sm:flex-row gap-4 border-b border-gray-700 pb-6">
                    <SelectField
                        label="Inspiration Category"
                        value={selectedCategory}
                        onChange={(val: string) => setSelectedCategory(val)}
                        options={AESTHETIC_PROMPTS.map(c => ({ value: c.name, label: `${c.emoji} ${c.name}` }))}
                    />
                    <SelectField
                        label="Inspiration Prompt"
                        value={prompt.custom_prompt || ''}
                        onChange={(val: string) => setPrompt(p => ({ ...p, custom_prompt: val }))}
                        options={currentInspirationPrompts}
                        placeholder="Select an idea..."
                    />
                </div>

                {/* --- DETAILED CONTROLS --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <TextareaField label="Scene Description" value={prompt.scene} onChange={val => setPrompt(p => ({ ...p, scene: val }))} />
                    <TextareaField label="Surface" value={prompt.surface} onChange={val => setPrompt(p => ({ ...p, surface: val }))} />
                    <TextareaField label="Lighting" value={prompt.lighting} onChange={val => setPrompt(p => ({ ...p, lighting: val }))} />
                    <TextareaField label="Hero Objects" value={prompt.hero_objects} onChange={val => setPrompt(p => ({ ...p, hero_objects: val.split(', ') }))} rows={4}/>
                    <TextareaField label="Supporting Props" value={prompt.supporting_props} onChange={val => setPrompt(p => ({ ...p, supporting_props: val.split(', ') }))} rows={4}/>
                    <TextareaField label="Hand / Pose" value={prompt.hand_pose} onChange={val => setPrompt(p => ({ ...p, hand_pose: val }))} rows={4}/>
                    <TextareaField label="Style Tags" value={prompt.style_tags} onChange={val => setPrompt(p => ({ ...p, style_tags: val.split(', ') }))} />
                    <TextareaField label="Color Palette" value={prompt.palette} onChange={val => setPrompt(p => ({ ...p, palette: val.split(', ') }))} />
                     <TextareaField label="Custom Details" value={prompt.custom_prompt || ''} onChange={val => setPrompt(p => ({ ...p, custom_prompt: val }))} />
                </div>

                <div className="pt-4 border-t border-gray-700">
                     <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-pink-600 text-white font-bold py-3 px-6 rounded-md hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
                    >
                        {isLoading ? <><div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> Generating...</> : <><Wand2 className="w-5 h-5" /> Generate</>}
                    </button>
                </div>
            </div>

            {/* --- RESULTS --- */}
            <div className="mt-6 space-y-6">
                {isLoading && <Loader text={prompt.mode === 'moodboard_set' ? "Generating your moodboard..." : "Generating your masterpiece..."} />}
                {error && <div className="max-w-xl mx-auto flex items-center justify-center gap-2 text-red-400 bg-red-900/50 border border-red-700 p-4 rounded-lg"><AlertTriangle className="w-5 h-5" />{error}</div>}
                
                {generatedImages.length > 0 && (
                    <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-300">{prompt.mode === 'moodboard_set' ? "Your Moodboard" : "Your Generated Image"}</h3>
                            <button
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-2 bg-gray-700 text-white font-medium py-2 px-4 rounded-md hover:bg-gray-600 disabled:bg-gray-500 disabled:cursor-not-allowed transition"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span>Regenerate</span>
                            </button>
                        </div>
                        <div className={`grid gap-4 ${generatedImages.length > 1 ? 'grid-cols-1 md:grid-cols-3' : 'max-w-xl mx-auto'}`}>
                            {generatedImages.map((image, index) => (
                                <div key={index} className="relative group rounded-lg overflow-hidden">
                                    <img src={image} alt={`Generated by AI ${index + 1}`} className="rounded-lg w-full" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                        <button onClick={() => handleDownload(image, index)} className="flex items-center gap-2 py-2 px-4 bg-white/10 backdrop-blur-sm rounded-md text-white hover:bg-white/20 transition">
                                            <Download className="w-4 h-4" /> Download
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {captionOutput && (
                    <div className="max-w-xl mx-auto bg-gray-800/30 border border-gray-700 rounded-xl p-4 space-y-4">
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
        </div>
    );
};

export default Generator;