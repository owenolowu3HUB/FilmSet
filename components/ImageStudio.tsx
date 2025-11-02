import React, { useState, useCallback, useRef } from 'react';
import { EyeIcon, MagicWandIcon, SparklesIcon, SpinnerIcon, UploadIcon, PlusIcon, XIcon } from './icons';
import { analyzeImage, editImage, generateImageFromText } from '../services/geminiService';
import { Project, Stage2Result } from '../types';

type Mode = 'generate' | 'edit' | 'analyze';

interface SourceImage {
    file: File;
    base64: string;
    dataUrl: string;
}

interface ImageStudioProps {
    project: Project | null;
    onUpdateStage2Data: (newData: Stage2Result) => void;
    onUpdateConfig: (config: Project['imageStudioConfig']) => void;
}

const genres = [
    'Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy', 
    'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 
    'Thriller', 'Western', 'Film Noir'
];

const artisticStyles = [
    'Cinematic Realism', 'Film Noir', 'Anime / Manga', 'Studio Ghibli Style',
    'Pixar Animation Style', 'Classic Disney Animation', 'Lo-Fi Anime', 'Cyberpunk / Neon-Noir',
    'Steampunk', 'Impressionistic Painting', 'Graphic Novel / Comic Book', 'Black and White Sketch',
];

const shotTypes = [
    'Establishing Shot', 'Extreme Wide Shot', 'Wide Shot', 'Full Shot', 'Medium Wide Shot', 
    'Cowboy Shot', 'Medium Shot', 'Medium Close-Up', 'Close-Up', 'Extreme Close-Up', 
    'Insert Shot', 'Dutch Angle', 'Over-the-Shoulder Shot', 'Point of View (POV)', 
    'Low-Angle Shot', 'High-Angle Shot', "Bird's-Eye View", "Worm's-Eye View"
];

const aspectRatios: { [key: string]: string } = {
    '16:9': '16:9 (Widescreen)',
    '1:1': '1:1 (Square)',
    '3:4': '3:4 (Portrait)',
    '4:3': '4:3 (Standard)',
    '9:16': '9:16 (Vertical)'
};

const races = [
    'Unspecified', 'African', 'Asian', 'Caucasian', 'Hispanic/Latin', 
    'Middle Eastern', 'Native American', 'Pacific Islander'
];

const skinTones = [
    'Unspecified', 'Very Light', 'Light', 'Medium', 'Tan', 
    'Brown', 'Dark Brown', 'Very Dark'
];


const fileToBase64 = (file: File): Promise<{ base64: string; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1];
            resolve({ base64, dataUrl });
        };
        reader.onerror = error => reject(error);
    });
};

const ImageStudio: React.FC<ImageStudioProps> = ({ project, onUpdateStage2Data, onUpdateConfig }) => {
    const [sourceImage, setSourceImage] = useState<SourceImage | null>(null);
    const [characterReferenceImage, setCharacterReferenceImage] = useState<SourceImage | null>(null);
    const [locationReferenceImage, setLocationReferenceImage] = useState<SourceImage | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [mode, setMode] = useState<Mode>('generate');
    const [resultImageBase64, setResultImageBase64] = useState<string | null>(null);
    const [analysisText, setAnalysisText] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const characterFileInputRef = useRef<HTMLInputElement>(null);
    const locationFileInputRef = useRef<HTMLInputElement>(null);
    const [characterSelect, setCharacterSelect] = useState<string>('');
    
    // State for scene continuation
    const [isContinuation, setIsContinuation] = useState<boolean>(false);
    const [continuationSourceImage, setContinuationSourceImage] = useState<string | null>(null);

    const config = project?.imageStudioConfig || { genre: '', artisticStyle: '', shotType: '', location: '', characterRace: '', skinTone: '', aspectRatio: '16:9' };
    const stage2Data = project?.stage2Result;

    const handleConfigChange = (field: keyof typeof config, value: string) => {
        if (onUpdateConfig) {
            onUpdateConfig({ ...config, [field]: value });
        }
    };


    const handleFile = useCallback(async (file: File | null) => {
        if (!file) return;
        setError(null);
        setSourceImage(null);
        setCharacterReferenceImage(null);
        setLocationReferenceImage(null);
        setResultImageBase64(null);
        setAnalysisText(null);
        
        // Reset continuation state when a new file is uploaded
        setIsContinuation(false);
        setContinuationSourceImage(null);
        
        try {
            const { base64, dataUrl } = await fileToBase64(file);
            setSourceImage({ file, base64, dataUrl });
            setMode('edit'); // Switch to edit mode when a file is uploaded
        } catch (err) {
            console.error(err);
            setError('Failed to read the image file.');
        }
    }, []);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFile(e.target.files?.[0] ?? null);
    };

    const handleReferenceFile = useCallback(async (file: File | null, type: 'character' | 'location') => {
        if (!file) return;
        setError(null);
        try {
            const { base64, dataUrl } = await fileToBase64(file);
            if (type === 'character') {
                setCharacterReferenceImage({ file, base64, dataUrl });
            } else {
                setLocationReferenceImage({ file, base64, dataUrl });
            }
        } catch (err) {
            console.error(err);
            setError(`Failed to read the ${type} reference image.`);
        }
    }, []);

    const handleCharacterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleReferenceFile(e.target.files?.[0] ?? null, 'character');
    };

    const handleLocationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleReferenceFile(e.target.files?.[0] ?? null, 'location');
    };


    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
            handleFile(file);
        } else {
            setError("Invalid file type. Please drop an image file.");
        }
    };

    const handleModeChange = (newMode: Mode) => {
        setMode(newMode);
        // If we switch away from generate mode, the continuation chain is broken.
        if (newMode !== 'generate') {
            setIsContinuation(false);
            setContinuationSourceImage(null);
            setCharacterReferenceImage(null);
            setLocationReferenceImage(null);
        }
    };


    const handleSubmit = async () => {
        if (mode !== 'generate' && !sourceImage) {
            setError('Please upload an image first for Edit or Analyze mode.');
            return;
        }
        if (!prompt) {
             setError('Please enter a prompt.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResultImageBase64(null);
        setAnalysisText(null);

        try {
            if (mode === 'generate') {
                const userPrompt = prompt;
                let newImageBase64;
                const hasReferenceImages = !!characterReferenceImage || !!locationReferenceImage;

                if (hasReferenceImages) {
                    newImageBase64 = await generateImageFromText(
                        userPrompt,
                        characterReferenceImage ? { base64: characterReferenceImage.base64, mimeType: characterReferenceImage.file.type } : undefined,
                        locationReferenceImage ? { base64: locationReferenceImage.base64, mimeType: locationReferenceImage.file.type } : undefined,
                    );
                    setContinuationSourceImage(null);
                    setIsContinuation(false);
                } else {
                    // Text-only generation, can use continuation
                    let finalPrompt = '';
                    if (isContinuation && continuationSourceImage) {
                        const analysisPrompt = `Analyze the visual characteristics of the primary subjects (people, objects, creatures) AND the environment in this image. Provide a detailed, concise description for:
1.  **Costume Anchor Log (CAL):** List each character and their exact costume.
2.  **Environment Log:** Describe the location, lighting, and key props.
Format the output exactly like this, using the headings:
CAL (Costume Anchor Log):
- [Character 1: Costume details]
Environment (Locked 360°):
- Description: [Location details]
- Lighting & Time: [Lighting details]`;
                        const continuitySource = await analyzeImage(continuationSourceImage, 'image/jpeg', analysisPrompt);
                        finalPrompt = `
SYSTEM: CineSight–EnviroLock MAX (Unified Protocol, Camera Freedom Clarified)
Scene Focus: ${userPrompt}
${continuitySource}
Environment Lockdown with Camera Freedom:
- The environment is locked in design, counts, and layout once generated. Camera freedom is unlimited. Each new shot must recompose the background logically.
Panel Outline:
- Panel (New Scene) – [Shot Type: ${config.shotType || 'As appropriate'} | Subject Focus: ${userPrompt} | Beat Purpose: To continue the story from the previous image]
Rendering Protocol (Per Panel):
1. Continuity Check: Verify costumes, props, environment design consistent with CAL and Environment logs.
2. Camera Freedom: Recompose via horizon, parallax, occlusion, lighting direction, DoF based on the shot type.
3. Anatomy & Framing: Enforce realism and ${config.aspectRatio || '16:9'} aspect ratio.
Final Instruction: Generate a single ${config.aspectRatio || '16:9'} image for this new panel. CRITICAL: Subjects from the CAL and Environment logs MUST be perfectly recreated with 100% visual consistency. The action should follow the new 'Scene Focus'. Adhere strictly to all protocols. Do not include any text, logos, or borders.
`;
                    } else {
                        setContinuationSourceImage(null);
                        const characterDirectives = [];
                        if (config.characterRace && config.characterRace !== 'Unspecified') characterDirectives.push(`Race: ${config.characterRace}`);
                        if (config.skinTone && config.skinTone !== 'Unspecified') characterDirectives.push(`Skin Tone: ${config.skinTone}`);
                        finalPrompt = `
SYSTEM: CineSight–EnviroLock MAX (Unified Protocol, Camera Freedom Clarified)
Scene Focus: ${userPrompt}
CAL (Costume Anchor Log):
- Establish character designs based on the Scene Focus. ${characterDirectives.length > 0 ? `Adhere to these details: ${characterDirectives.join(', ')}.` : ''}
Environment (Locked 360°):
- Description: Establish an environment based on the Scene Focus. ${config.location ? `The location is ${config.location}.` : ''}
- Lighting & Time: Establish lighting based on the Scene Focus, Genre, and Artistic Style.
- Style: The overall artistic style MUST be ${config.artisticStyle || 'Cinematic Realism'}.
- Genre: The overall genre is ${config.genre || 'Not specified'}.
Panel Outline:
- Panel 1 – [Shot Type: ${config.shotType || 'As appropriate'} | Subject Focus: ${userPrompt} | Beat Purpose: To establish the scene]
Rendering Protocol (Per Panel):
- Enforce realism, ${config.aspectRatio || '16:9'} aspect ratio, and adherence to style and genre.
Final Instruction: Generate a single ${config.aspectRatio || '16:9'} image for this panel. Adhere strictly to all protocols. Do not include any text, logos, or borders.
`;
                    }
                    newImageBase64 = await generateImageFromText(finalPrompt, undefined, undefined, config.aspectRatio);
                    setContinuationSourceImage(newImageBase64);
                }
                setResultImageBase64(newImageBase64);
            } else {
                 // If we're not in generate mode, continuation is irrelevant.
                setIsContinuation(false);
                setContinuationSourceImage(null);

                if (mode === 'edit' && sourceImage) {
                    const newImageBase64 = await editImage(sourceImage.base64, sourceImage.file.type, prompt);
                    setResultImageBase64(newImageBase64);
                } else if (mode === 'analyze' && sourceImage) {
                    const analysisResult = await analyzeImage(sourceImage.base64, sourceImage.file.type, prompt);
                    setAnalysisText(analysisResult);
                }
            }
        } catch (err) {
            console.error(err);
            let errorMessage = 'An unknown error occurred.';
            if (err instanceof Error) {
                if (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')) {
                    errorMessage = "API quota exceeded. Please check your plan and billing details. For more information, see https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your usage, visit https://ai.dev/usage?tab=rate-limit.";
                } else if (err.message.includes('503') || err.message.includes('UNAVAILABLE') || err.message.includes('overloaded')) {
                    errorMessage = "The AI model is currently experiencing high demand. Please wait a few moments and try again.";
                } else {
                    errorMessage = err.message;
                }
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleUseAsConceptArt = () => {
        if (!resultImageBase64 || !stage2Data) return;
        onUpdateStage2Data({ ...stage2Data, concept_art_base64: resultImageBase64 });
    };

    const handleUseForCharacter = () => {
        if (!resultImageBase64 || !stage2Data || !characterSelect) return;
        const updatedProfiles = stage2Data.character_profiles.map(p => 
            p.name === characterSelect ? { ...p, image_base64: resultImageBase64 } : p
        );
        onUpdateStage2Data({ ...stage2Data, character_profiles: updatedProfiles });
    };
    
    const handleAddToVisualStyle = () => {
        if (!resultImageBase64 || !stage2Data) return;
        const currentImages = stage2Data.visual_style_images_base64 || [];
        onUpdateStage2Data({
            ...stage2Data,
            visual_style_images_base64: [...currentImages, resultImageBase64]
        });
    };

    const renderInputArea = () => {
        const hasReferenceImages = !!characterReferenceImage || !!locationReferenceImage;

        if (mode === 'generate' && !sourceImage) {
            return (
                <div className="flex flex-col gap-4">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={'e.g., A lone detective in a rain-soaked, neon-lit alley...'}
                        className="w-full h-24 p-4 bg-brand-bg border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors duration-200 resize-y"
                        disabled={isLoading}
                    />

                    {/* Reference Image Uploaders */}
                    <div className="flex flex-wrap gap-4">
                        {/* Character/Object Reference Uploader */}
                        <div>
                            <label className="block text-sm font-medium text-brand-text-secondary mb-1">Character/Object Reference</label>
                            {characterReferenceImage ? (
                                <div className="relative w-28 h-auto sm:w-40">
                                    <img src={characterReferenceImage.dataUrl} alt="Character Reference" className="rounded-lg w-full h-auto" />
                                    <button
                                        onClick={() => { setCharacterReferenceImage(null); if (characterFileInputRef.current) characterFileInputRef.current.value = ''; }}
                                        className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors"
                                        aria-label="Remove character reference"
                                    >
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => characterFileInputRef.current?.click()}
                                    className="flex items-center justify-center w-28 h-28 sm:w-40 sm:h-40 bg-brand-bg border-2 border-dashed border-gray-600 rounded-lg text-brand-text-secondary hover:border-brand-primary hover:text-brand-primary transition-colors"
                                    aria-label="Add character or object reference image"
                                >
                                    <PlusIcon className="w-8 h-8"/>
                                </button>
                            )}
                            <input ref={characterFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCharacterFileChange} />
                        </div>

                        {/* Location & Background Uploader */}
                        <div>
                            <label className="block text-sm font-medium text-brand-text-secondary mb-1">Location & Background</label>
                            {locationReferenceImage ? (
                                <div className="relative w-28 h-auto sm:w-40">
                                    <img src={locationReferenceImage.dataUrl} alt="Location Reference" className="rounded-lg w-full h-auto" />
                                    <button
                                        onClick={() => { setLocationReferenceImage(null); if (locationFileInputRef.current) locationFileInputRef.current.value = ''; }}
                                        className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors"
                                        aria-label="Remove location reference"
                                    >
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => locationFileInputRef.current?.click()}
                                    className="flex items-center justify-center w-28 h-28 sm:w-40 sm:h-40 bg-brand-bg border-2 border-dashed border-gray-600 rounded-lg text-brand-text-secondary hover:border-brand-primary hover:text-brand-primary transition-colors"
                                    aria-label="Add location and background reference image"
                                >
                                    <PlusIcon className="w-8 h-8"/>
                                </button>
                            )}
                            <input ref={locationFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLocationFileChange} />
                        </div>
                    </div>


                    {/* NEW CONFIG SECTION */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                         <div>
                            <label htmlFor="aspect-ratio-select" className="block text-sm font-medium text-brand-text-secondary mb-1">Aspect Ratio</label>
                            <select
                                id="aspect-ratio-select"
                                value={config.aspectRatio || '16:9'}
                                onChange={(e) => handleConfigChange('aspectRatio', e.target.value)}
                                className="w-full p-2 bg-brand-bg border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoading || hasReferenceImages}
                            >
                                {Object.entries(aspectRatios).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="shot-type-select" className="block text-sm font-medium text-brand-text-secondary mb-1">Shot Type</label>
                            <select id="shot-type-select" value={config.shotType} onChange={(e) => handleConfigChange('shotType', e.target.value)} className="w-full p-2 bg-brand-bg border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary" disabled={isLoading}>
                                <option value="">Default</option>
                                {shotTypes.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="genre-select" className="block text-sm font-medium text-brand-text-secondary mb-1">Genre</label>
                            <select id="genre-select" value={config.genre} onChange={(e) => handleConfigChange('genre', e.target.value)} className="w-full p-2 bg-brand-bg border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary" disabled={isLoading}>
                                <option value="">Default</option>
                                {genres.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="style-select" className="block text-sm font-medium text-brand-text-secondary mb-1">Artistic Style</label>
                            <select id="style-select" value={config.artisticStyle} onChange={(e) => handleConfigChange('artisticStyle', e.target.value)} className="w-full p-2 bg-brand-bg border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary" disabled={isLoading}>
                                <option value="">Default</option>
                                {artisticStyles.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="location-input" className="block text-sm font-medium text-brand-text-secondary mb-1">Location / Region</label>
                            <input id="location-input" type="text" value={config.location} onChange={(e) => handleConfigChange('location', e.target.value)} placeholder="e.g., Tokyo, Japan" className="w-full p-2 bg-brand-bg border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary" disabled={isLoading} />
                        </div>
                        <div>
                            <label htmlFor="race-select" className="block text-sm font-medium text-brand-text-secondary mb-1">Character Race</label>
                            <select id="race-select" value={config.characterRace} onChange={(e) => handleConfigChange('characterRace', e.target.value)} className="w-full p-2 bg-brand-bg border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary" disabled={isLoading}>
                                {races.map(r => <option key={r} value={r === 'Unspecified' ? '' : r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="skin-tone-select" className="block text-sm font-medium text-brand-text-secondary mb-1">Skin Tone</label>
                            <select id="skin-tone-select" value={config.skinTone} onChange={(e) => handleConfigChange('skinTone', e.target.value)} className="w-full p-2 bg-brand-bg border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary" disabled={isLoading}>
                                {skinTones.map(s => <option key={s} value={s === 'Unspecified' ? '' : s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="text-center text-brand-text-secondary text-sm pt-2">
                        or <button onClick={() => fileInputRef.current?.click()} className="text-brand-primary font-semibold hover:underline">upload an image</button> to switch to Edit/Analyze mode.
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </div>
                </div>
            );
        }

        if (sourceImage) {
            return (
                <div className="relative">
                    <img src={sourceImage.dataUrl} alt="Source" className="rounded-lg w-full h-auto" />
                    <button
                        onClick={() => { setSourceImage(null); handleModeChange('generate'); if (fileInputRef.current) { fileInputRef.current.value = ''; } }}
                        className="absolute top-2 right-2 flex items-center gap-2 px-3 py-1 bg-black/60 text-white text-sm font-semibold rounded-lg hover:bg-black/80 transition-colors"
                    >
                        <UploadIcon className="w-4 h-4" />
                        Change
                    </button>
                </div>
            );
        }

        // Fallback for edit/analyze with no image yet
        return (
             <div 
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${isDragging ? 'border-brand-primary bg-brand-primary/10' : 'border-gray-700 hover:border-gray-500'}`}
            >
                <UploadIcon className="w-12 h-12 text-gray-500 mb-4" />
                <p className="text-lg font-semibold text-brand-text">Drag & drop an image to edit/analyze</p>
                <p className="text-brand-text-secondary">or click to browse</p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
        );
    };

    const renderClickableError = (text: string | null) => {
        if (!text) return null;
        // Regex to find URLs, avoiding trailing punctuation.
        const urlRegex = /(https?:\/\/[^\s.,;?!()"'<>[\]{}]+)/g;
        const parts = text.split(urlRegex);
    
        return (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">
              {parts.map((part, index) => {
                if (part.match(urlRegex)) {
                  let linkText = 'Learn More';
                  if (part.includes('rate-limits')) {
                    linkText = 'About Rate Limits';
                  } else if (part.includes('usage')) {
                    linkText = 'Monitor Usage';
                  } else if (part.includes('billing')) {
                    linkText = 'Billing Information';
                  }
                  return (
                    <a href={part} key={index} target="_blank" rel="noopener noreferrer" className="underline hover:text-red-100 mx-1 font-semibold">
                      {linkText}
                    </a>
                  );
                }
                return part;
              })}
            </span>
          </div>
        );
    };

    const hasReferenceImages = !!characterReferenceImage || !!locationReferenceImage;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-2xl font-semibold mb-2">Image Studio</h2>
                <p className="text-brand-text-secondary">
                    Generate, edit, or analyze images for your project.
                </p>
            </div>
            
            {renderClickableError(error)}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Panel */}
                <div className="flex flex-col gap-4">
                    {renderInputArea()}

                    <div className="bg-brand-bg rounded-lg p-1 flex">
                        <button onClick={() => handleModeChange('generate')} className={`w-1/3 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'generate' ? 'bg-brand-primary text-white' : 'text-brand-text-secondary hover:bg-gray-700'}`}><SparklesIcon className="w-5 h-5" /> Generate</button>
                        <button onClick={() => handleModeChange('edit')} className={`w-1/3 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'edit' ? 'bg-brand-primary text-white' : 'text-brand-text-secondary hover:bg-gray-700'}`}><MagicWandIcon className="w-5 h-5" /> Edit</button>
                        <button onClick={() => handleModeChange('analyze')} className={`w-1/3 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'analyze' ? 'bg-brand-primary text-white' : 'text-brand-text-secondary hover:bg-gray-700'}`}><EyeIcon className="w-5 h-5"/> Analyze</button>
                    </div>
                    
                    {mode !== 'generate' && (
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={mode === 'edit' ? 'e.g., Add a retro filter, make it black and white...' : 'e.g., What is in this image? (optional)'}
                            className="w-full h-24 p-4 bg-brand-bg border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors duration-200 resize-y"
                            disabled={isLoading}
                        />
                    )}
                    
                    {mode === 'generate' && continuationSourceImage && !hasReferenceImages && (
                         <div className="flex items-center gap-2 p-2 bg-brand-bg rounded-lg">
                            <input
                                type="checkbox"
                                id="continuation-checkbox"
                                checked={isContinuation}
                                onChange={(e) => setIsContinuation(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-brand-primary focus:ring-brand-primary"
                            />
                            <label htmlFor="continuation-checkbox" className="text-sm font-medium text-brand-text-secondary">
                                Next Scene Continuation
                            </label>
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || (mode !== 'generate' && !sourceImage)}
                        className="w-full flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold rounded-lg shadow-lg hover:shadow-brand-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                    >
                        {isLoading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : (mode === 'generate' ? <SparklesIcon className="w-5 h-5" /> : mode === 'edit' ? <MagicWandIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />)}
                        <span>{isLoading ? 'Generating...' : (mode === 'generate' ? 'Generate Image' : mode === 'edit' ? 'Generate Edit' : 'Analyze Image')}</span>
                    </button>
                </div>

                {/* Output Panel */}
                <div className="flex flex-col gap-4 items-center justify-center bg-brand-bg rounded-lg p-4 min-h-[300px]">
                    {isLoading && <SpinnerIcon className="w-12 h-12 text-brand-primary animate-spin" />}
                    
                    {!isLoading && resultImageBase64 && (mode === 'edit' || mode === 'generate') && (
                        <>
                            <img src={`data:image/jpeg;base64,${resultImageBase64}`} alt="Generated" className="rounded-lg w-full h-auto" />
                            {stage2Data && (
                                <div className="w-full bg-brand-surface p-3 rounded-lg flex flex-col sm:flex-row gap-2">
                                    <button onClick={handleUseAsConceptArt} className="flex-1 text-sm bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-md transition-colors">Use as Concept Art</button>
                                    <div className="flex-1 flex gap-2">
                                        <select onChange={(e) => setCharacterSelect(e.target.value)} value={characterSelect} className="flex-grow bg-gray-700 text-white text-sm rounded-md border-0 focus:ring-2 focus:ring-brand-primary">
                                            <option value="">Select Character</option>
                                            {stage2Data.character_profiles.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                        </select>
                                        <button onClick={handleUseForCharacter} disabled={!characterSelect} className="text-sm bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-md transition-colors disabled:opacity-50">Set</button>
                                    </div>
                                    <button onClick={handleAddToVisualStyle} className="flex-1 text-sm bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-md transition-colors">Add to Visual Style</button>
                                </div>
                            )}
                        </>
                    )}
                    
                    {!isLoading && analysisText && mode === 'analyze' && (
                        <div className="text-brand-text-secondary whitespace-pre-wrap leading-relaxed self-start w-full">{analysisText}</div>
                    )}
                    
                    {!isLoading && !resultImageBase64 && !analysisText && (
                        <div className="text-center text-brand-text-secondary">
                            <p className="font-semibold text-lg">Your result will appear here.</p>
                            <p>Configure your options on the left and click Generate.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageStudio;