import React, { useState, useEffect } from 'react';
import { ClapperboardIcon, SpinnerIcon, LayoutGridIcon } from './icons';
import { generateShotIdeasAndImages } from '../services/geminiService';
import { Project, ShotIdea, SceneOverview, CharacterDesign } from '../types';

interface ShotIdeaStudioProps {
    project: Project | null;
    onUpdateShotIdeas: (data: ShotIdea[] | null, context?: { sceneOverview: SceneOverview; characterDesigns: CharacterDesign[]; }) => void;
    onUpdateScript: (script: string) => void;
    onUpdateConfig: (config: Project['shotIdeaStudioConfig']) => void;
    onGenerateStoryboard: (shots: ShotIdea[], context: { sceneOverview: SceneOverview; characterDesigns: CharacterDesign[]; }) => void;
}

const genres = [
    'Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy', 
    'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 
    'Thriller', 'Western', 'Film Noir'
];

const artisticStyles = [
    'Cinematic Realism',
    'Film Noir',
    'Anime / Manga',
    'Studio Ghibli Style',
    'Pixar Animation Style',
    'Classic Disney Animation',
    'Lo-Fi Anime',
    'Cyberpunk / Neon-Noir',
    'Steampunk',
    'Impressionistic Painting',
    'Graphic Novel / Comic Book',
    'Black and White Sketch',
];

const races = [
    'Unspecified', 'African', 'Asian', 'Caucasian', 'Hispanic/Latin', 
    'Middle Eastern', 'Native American', 'Pacific Islander'
];

const skinTones = [
    'Unspecified', 'Very Light', 'Light', 'Medium', 'Tan', 
    'Brown', 'Dark Brown', 'Very Dark'
];

const ShotIdeaStudio: React.FC<ShotIdeaStudioProps> = ({ project, onUpdateShotIdeas, onUpdateScript, onUpdateConfig, onGenerateStoryboard }) => {
    const [script, setScript] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const config = project?.shotIdeaStudioConfig || { genre: '', location: '', characterRace: '', skinTone: '', artisticStyle: '' };

    useEffect(() => {
        setScript(project?.script || '');
    }, [project]);

    const handleConfigChange = (field: keyof typeof config, value: string) => {
        if (onUpdateConfig) {
            onUpdateConfig({ ...config, [field]: value });
        }
    };

    const handleGenerate = async () => {
        if (!script.trim()) {
            setError('Please enter a script scene.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        onUpdateShotIdeas(null); // Clear previous results

        try {
            const { shots, context } = await generateShotIdeasAndImages(script, config);
            onUpdateShotIdeas(shots, context);
        } catch (err) {
            console.error(err);
            let errorMessage = 'An unknown error occurred during shot generation.';
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

    const renderClickableError = (text: string | null) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s.,;?!()"'<>[\]{}]+)/g;
        const parts = text.split(urlRegex);
    
        return (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">
              {parts.map((part, index) => {
                if (part.match(urlRegex)) {
                  let linkText = 'Learn More';
                  if (part.includes('rate-limits')) linkText = 'About Rate Limits';
                  else if (part.includes('usage')) linkText = 'Monitor Usage';
                  else if (part.includes('billing')) linkText = 'Billing Information';
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

    const ShotDetail: React.FC<{ label: string; content: string }> = ({ label, content }) => (
        <div>
            <h4 className="font-semibold text-brand-primary mb-1">{label}</h4>
            <p className="text-brand-text-secondary text-sm">{content}</p>
        </div>
    );

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-2xl font-semibold mb-2">Shot Idea Studio</h2>
                <p className="text-brand-text-secondary">
                    Generate a professional, visualized shot list from a script scene.
                </p>
            </div>
            
            {renderClickableError(error)}
            
            <div className="flex flex-col gap-4">
                 <textarea
                    value={script}
                    onChange={(e) => {
                        setScript(e.target.value);
                        onUpdateScript(e.target.value);
                    }}
                    placeholder={'Paste a script scene here...'}
                    className="w-full h-48 p-4 bg-brand-bg border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors duration-200 resize-y"
                    disabled={isLoading}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div>
                        <label htmlFor="genre-select" className="block text-sm font-medium text-brand-text-secondary mb-1">Genre</label>
                        <select
                            id="genre-select"
                            value={config.genre}
                            onChange={(e) => handleConfigChange('genre', e.target.value)}
                            className="w-full p-2 bg-brand-bg border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                            disabled={isLoading}
                        >
                            <option value="">Select a genre...</option>
                            {genres.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="style-select" className="block text-sm font-medium text-brand-text-secondary mb-1">Artistic Style</label>
                        <select
                            id="style-select"
                            value={config.artisticStyle}
                            onChange={(e) => handleConfigChange('artisticStyle', e.target.value)}
                            className="w-full p-2 bg-brand-bg border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                            disabled={isLoading}
                        >
                            <option value="">Default (AI choice)</option>
                            {artisticStyles.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="location-input" className="block text-sm font-medium text-brand-text-secondary mb-1">Location / Region</label>
                        <input
                            id="location-input"
                            type="text"
                            value={config.location}
                            onChange={(e) => handleConfigChange('location', e.target.value)}
                            placeholder="e.g., Tokyo, Japan"
                            className="w-full p-2 bg-brand-bg border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                            disabled={isLoading}
                        />
                    </div>
                     <div>
                        <label htmlFor="race-select" className="block text-sm font-medium text-brand-text-secondary mb-1">Character Race (Optional)</label>
                        <select
                            id="race-select"
                            value={config.characterRace}
                            onChange={(e) => handleConfigChange('characterRace', e.target.value)}
                            className="w-full p-2 bg-brand-bg border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary"
                            disabled={isLoading}
                        >
                            {races.map(r => <option key={r} value={r === 'Unspecified' ? '' : r}>{r}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="skin-tone-select" className="block text-sm font-medium text-brand-text-secondary mb-1">Character Skin Tone (Optional)</label>
                        <select
                            id="skin-tone-select"
                            value={config.skinTone}
                            onChange={(e) => handleConfigChange('skinTone', e.target.value)}
                            className="w-full p-2 bg-brand-bg border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary"
                            disabled={isLoading}
                        >
                             {skinTones.map(s => <option key={s} value={s === 'Unspecified' ? '' : s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
                    {project?.shotIdeasList && project.shotIdeasList.length > 0 && project.shotIdeasListContext && (
                        <button
                            onClick={() => onGenerateStoryboard(project.shotIdeasList!, project.shotIdeasListContext!)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg shadow-lg transition-all"
                        >
                            <LayoutGridIcon className="w-5 h-5" />
                            <span>Generate Storyboard in Storyboard Studio</span>
                        </button>
                    )}
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold rounded-lg shadow-lg hover:shadow-brand-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                    >
                        {isLoading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <ClapperboardIcon className="w-5 h-5" />}
                        <span>{isLoading ? 'Generating...' : 'Generate Shot List'}</span>
                    </button>
                </div>
            </div>

            {/* Output Panel */}
            <div className="flex flex-col gap-8 items-center justify-center bg-brand-bg rounded-lg p-4 min-h-[400px]">
                {isLoading && (
                    <div className="text-center">
                        <SpinnerIcon className="w-12 h-12 text-brand-primary animate-spin" />
                        <p className="mt-4 text-lg font-semibold">Generating cinematic ideas and visuals...</p>
                        <p className="text-brand-text-secondary">This may take a moment.</p>
                    </div>
                )}
                
                {!isLoading && project?.shotIdeasList && project.shotIdeasList.length > 0 && (
                    <div className="w-full space-y-8">
                        {project.shotIdeasList.map((shot) => (
                            <div key={shot.shot_number} className="bg-brand-surface p-4 sm:p-6 rounded-lg shadow-lg grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-4">
                                    <h3 className="text-xl font-bold text-brand-primary">{`Shot ${shot.shot_number}: ${shot.shot_type}`}</h3>
                                    <p className="text-brand-text-secondary italic text-sm">{shot.description}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <ShotDetail label="Composition & Framing" content={shot.composition_and_framing} />
                                        <ShotDetail label="Lighting" content={shot.lighting} />
                                        <ShotDetail label="Blocking" content={shot.blocking} />
                                        <ShotDetail label="Art Design" content={shot.art_design} />
                                        <ShotDetail label="Costume & Makeup" content={shot.costume_and_makeup} />
                                    </div>
                                </div>
                                <div>
                                    {shot.image_base64 ? (
                                        <img 
                                            src={`data:image/jpeg;base64,${shot.image_base64}`} 
                                            alt={`Visualization for shot ${shot.shot_number}`}
                                            className="w-full h-auto object-contain rounded-md aspect-video"
                                        />
                                    ) : (
                                        <div className="w-full aspect-video bg-brand-bg rounded-md flex items-center justify-center">
                                            <p className="text-brand-text-secondary">Image generation failed</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {!isLoading && (!project?.shotIdeasList || project.shotIdeasList.length === 0) && !error && (
                    <div className="text-center text-brand-text-secondary">
                        <p className="font-semibold text-lg">Your visualized shot list will appear here.</p>
                        <p>Paste a scene above and click Generate.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShotIdeaStudio;