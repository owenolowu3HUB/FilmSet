import React, { useState } from 'react';
import { LightbulbIcon, SpinnerIcon } from './icons';
import { generateScriptFromIdea } from '../services/geminiService';

interface ScriptGeneratorProps {
  onUseScript: (scriptText: string) => void;
  onGetShotIdeas: (scriptText: string) => void;
  idea: string;
  onUpdateIdea: (idea: string) => void;
}

const ScriptGenerator: React.FC<ScriptGeneratorProps> = ({ onUseScript, onGetShotIdeas, idea, onUpdateIdea }) => {
    const [generatedScript, setGeneratedScript] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState<string>('');

    const handleGenerate = async () => {
        if (!idea.trim()) {
            setError('Please enter an idea or concept.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setGeneratedScript(null);
        setCopySuccess('');

        try {
            const script = await generateScriptFromIdea(idea);
            setGeneratedScript(script);
        } catch (err) {
            console.error(err);
             let errorMessage = 'An unknown error occurred during script generation.';
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

    const handleCopyToClipboard = () => {
        if (!generatedScript) return;
        navigator.clipboard.writeText(generatedScript).then(() => {
            setCopySuccess('Copied to clipboard!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
            setCopySuccess('Failed to copy.');
             setTimeout(() => setCopySuccess(''), 2000);
        });
    };
    
    const handleUseForAnalysis = () => {
        if (!generatedScript) return;
        onUseScript(generatedScript);
    };

    const handleGetShotIdeasClick = () => {
        if (!generatedScript) return;
        onGetShotIdeas(generatedScript);
    }

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

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-2xl font-semibold mb-2">Script Idea Generator</h2>
                <p className="text-brand-text-secondary">
                    Transform your concept into a properly formatted script scene.
                </p>
            </div>
            
            {renderClickableError(error)}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Panel */}
                <div className="flex flex-col gap-4">
                    <textarea
                        value={idea}
                        onChange={(e) => onUpdateIdea(e.target.value)}
                        placeholder={'e.g., A grizzled space marine, stranded on a hostile alien planet, discovers a mysterious, glowing artifact that seems to communicate with her through memories of her lost daughter.'}
                        className="w-full h-48 p-4 bg-brand-bg border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors duration-200 resize-y"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold rounded-lg shadow-lg hover:shadow-brand-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                    >
                        {isLoading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <LightbulbIcon className="w-5 h-5" />}
                        <span>{isLoading ? 'Generating...' : 'Generate Script'}</span>
                    </button>
                </div>

                {/* Output Panel */}
                <div className="flex flex-col gap-4 items-center justify-center bg-brand-bg rounded-lg p-4 min-h-[300px] relative">
                    {isLoading && <SpinnerIcon className="w-12 h-12 text-brand-primary animate-spin" />}
                    
                    {!isLoading && generatedScript && (
                        <>
                            <textarea
                                readOnly
                                value={generatedScript}
                                className="w-full h-96 p-4 bg-brand-surface font-mono text-sm border border-gray-700 rounded-lg resize-none"
                                aria-label="Generated Script"
                            />
                            <div className="w-full flex flex-col sm:flex-row gap-2">
                                <button onClick={handleCopyToClipboard} className="flex-1 text-sm bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-md transition-colors">
                                    {copySuccess || 'Copy to Clipboard'}
                                </button>
                                <button onClick={handleUseForAnalysis} className="flex-1 text-sm bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-3 rounded-md transition-colors">
                                    Use for Analysis
                                </button>
                                <button onClick={handleGetShotIdeasClick} className="flex-1 text-sm bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-3 rounded-md transition-colors">
                                    Get Shot Ideas
                                </button>
                            </div>
                        </>
                    )}
                    
                    {!isLoading && !generatedScript && (
                        <div className="text-center text-brand-text-secondary">
                            <p className="font-semibold text-lg">Your generated script will appear here.</p>
                            <p>Enter your idea on the left and click "Generate Script".</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScriptGenerator;