import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AnalysisStatus, Stage1Result, Stage2Result, Stage3Result, Project, StoryboardData, ShotIdea, SceneOverview, CharacterDesign } from './types';
import { analyzeStage1, analyzeStage2, analyzeStage3, generateAllVisuals } from './services/geminiService';
import ScriptInput from './components/ScriptInput';
import AnalysisInProgress from './components/AnalysisInProgress';
import AnalysisResult from './components/AnalysisResult';
import ImageStudio from './components/ImageStudio';
import StoryboardStudio from './components/StoryboardStudio';
import ScriptGenerator from './components/ScriptGenerator';
import ShotIdeaStudio from './components/ShotIdeaStudio';
import { FilmIcon, ImageIcon, LayoutGridIcon, FolderIcon, LightbulbIcon, ClapperboardIcon } from './components/icons';
import { initDB, saveProject, getProject, getAllProjects, deleteProject } from './db';
import ProjectManager from './components/ProjectManager';
import SaveProjectModal from './components/SaveProjectModal';

const createNewProject = (): Project => ({
  name: "Untitled Project",
  script: "",
  stage1Result: null,
  stage2Result: null,
  stage3Result: null,
  storyboardData: null,
  shotIdeasList: null,
  // Fix: Corrected typo `new new Date()` to `new Date()`.
  createdAt: new Date(),
  updatedAt: new Date(),
  scriptGeneratorIdea: '',
  shotIdeaStudioConfig: { genre: '', location: '', characterRace: '', skinTone: '', artisticStyle: '' },
  imageStudioConfig: { genre: '', artisticStyle: '', shotType: '', location: '', characterRace: '', skinTone: '', aspectRatio: '16:9' },
  storyboardSceneDescription: '',
  storyboardRequestFromShots: undefined,
});

const App: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'script' | 'image' | 'storyboard' | 'scriptGenerator' | 'shotIdea'>('script');

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const debounceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const initialize = async () => {
      await initDB();
      await refreshProjectList();
      setCurrentProject(createNewProject());
    };
    initialize();
  }, []);

  // Auto-save current project on change
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (currentProject?.id) { // Only auto-save if it's a saved project
      debounceTimeoutRef.current = window.setTimeout(() => {
        const updatedProject = { ...currentProject, updatedAt: new Date() };
        saveProject(updatedProject);
        refreshProjectList(); // Refresh list to update timestamp
      }, 1500); // Debounce for 1.5 seconds
    }
  }, [currentProject]);

  const refreshProjectList = async () => {
    const allProjects = await getAllProjects();
    setProjects(allProjects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
  };
  
  const handleNewProject = () => {
    setCurrentProject(createNewProject());
    setStatus(AnalysisStatus.IDLE);
    setError(null);
    setActiveTool('script');
  };

  const handleAnalysis = useCallback(async (scriptText: string) => {
    if (!scriptText.trim()) {
      setError('Script content cannot be empty.');
      return;
    }
    
    // If the script text is different from the current project, treat it as a new analysis
    const projectToAnalyze = currentProject?.script === scriptText && !currentProject.stage1Result
      ? { ...currentProject }
      : { ...createNewProject(), script: scriptText };
    
    setCurrentProject(projectToAnalyze);


    setError(null);
    setStatus(AnalysisStatus.ANALYZING_STAGE_1);

    let result1: Stage1Result, result2: Stage2Result, result3: Stage3Result;

    try {
      result1 = await analyzeStage1(scriptText);
      setCurrentProject(p => p ? { ...p, stage1Result: result1 } : null);

      setStatus(AnalysisStatus.ANALYZING_STAGE_2);
      result2 = await analyzeStage2(scriptText, result1.logline, result1.synopsis.extended);
      setCurrentProject(p => p ? { ...p, stage2Result: result2 } : null);

      setStatus(AnalysisStatus.ANALYZING_STAGE_2_VISUALS);
      const visuals = await generateAllVisuals(result2);
      
      const updatedResult2: Stage2Result = { ...result2 };
      
      if (visuals.concept_art_base64) updatedResult2.concept_art_base64 = visuals.concept_art_base64;
      if (visuals.character_portraits.length > 0) {
          updatedResult2.character_profiles = result2.character_profiles.map(profile => {
              const portrait = visuals.character_portraits.find(p => p.name === profile.name);
              return portrait ? { ...profile, image_base64: portrait.image_base64 } : profile;
          });
      }
      if (visuals.comparable_titles_visuals.length > 0) updatedResult2.comparable_titles_visuals = visuals.comparable_titles_visuals;
      if (visuals.visual_style_images_base64.length > 0) updatedResult2.visual_style_images_base64 = visuals.visual_style_images_base64;
      
      setCurrentProject(p => p ? { ...p, stage2Result: updatedResult2 } : null);
      result2 = updatedResult2;

      setStatus(AnalysisStatus.ANALYZING_STAGE_3);
      result3 = await analyzeStage3(scriptText);
      setCurrentProject(p => p ? { ...p, stage3Result: result3 } : null);
      
      setStatus(AnalysisStatus.COMPLETE);

    } catch (err) {
      console.error(err);
      let errorMessage = 'An unknown error occurred during analysis.';
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
      setStatus(AnalysisStatus.ERROR);
    }
  }, [currentProject]);
  
  const handleUpdateStage2Data = (newData: Stage2Result) => {
    setCurrentProject(p => p ? { ...p, stage2Result: newData } : null);
  };

  const handleUpdateStoryboardData = (newData: StoryboardData | null) => {
    setCurrentProject(p => p ? { ...p, storyboardData: newData } : null);
  };
  
  const handleUpdateShotIdeas = (shots: ShotIdea[] | null, context?: { sceneOverview: SceneOverview; characterDesigns: CharacterDesign[]; }) => {
    setCurrentProject(p => p ? { ...p, shotIdeasList: shots, shotIdeasListContext: context } : null);
  };

  const handleUpdateScript = (newScript: string) => {
    setCurrentProject(p => p ? { ...p, script: newScript } : null);
  };
  
  const handleUpdateScriptGeneratorIdea = (idea: string) => {
    setCurrentProject(p => p ? { ...p, scriptGeneratorIdea: idea } : null);
  };

  const handleUpdateShotIdeaConfig = (config: Project['shotIdeaStudioConfig']) => {
    setCurrentProject(p => p ? { ...p, shotIdeaStudioConfig: config } : null);
  };
  
  const handleUpdateImageStudioConfig = (config: Project['imageStudioConfig']) => {
    setCurrentProject(p => p ? { ...p, imageStudioConfig: config } : null);
  };

  const handleUpdateStoryboardDescription = (desc: string) => {
    setCurrentProject(p => p ? { ...p, storyboardSceneDescription: desc } : null);
  };

  const handleGenerateStoryboardFromShots = (shots: ShotIdea[], context: { sceneOverview: SceneOverview; characterDesigns: CharacterDesign[]; }) => {
    setCurrentProject(p => p ? { ...p, storyboardRequestFromShots: shots, storyboardRequestContext: context, storyboardData: null } : null);
    setActiveTool('storyboard');
  };
  
  const handleClearStoryboardRequest = () => {
    setCurrentProject(p => p ? { ...p, storyboardRequestFromShots: undefined, storyboardRequestContext: undefined } : null);
  };


  const handleSaveProject = async () => {
    if (!currentProject) return;
    if (currentProject.id) {
      // It's an existing project, just save
      const updatedProject = { ...currentProject, updatedAt: new Date() };
      await saveProject(updatedProject);
      setCurrentProject(updatedProject);
      await refreshProjectList();
    } else {
      // It's a new project, need a name
      setIsSaveModalOpen(true);
    }
  };

  const handleConfirmSave = async (name: string) => {
    if (!currentProject) return;
    const newProject = { ...currentProject, name, updatedAt: new Date(), createdAt: new Date() };
    const newId = await saveProject(newProject);
    setCurrentProject({ ...newProject, id: newId });
    setIsSaveModalOpen(false);
    await refreshProjectList();
  };

  const handleLoadProject = async (id: number) => {
    const project = await getProject(id);
    if (project) {
      setCurrentProject(project);
      setStatus(project.stage3Result ? AnalysisStatus.COMPLETE : AnalysisStatus.IDLE);
      setActiveTool('script');
      setIsProjectManagerOpen(false);
    }
  };

  const handleDeleteProject = async (id: number) => {
    await deleteProject(id);
    await refreshProjectList();
    // If the deleted project was the current one, start a new one
    if(currentProject?.id === id) {
      handleNewProject();
    }
  };
  
  const handleUseGeneratedScript = (scriptText: string) => {
      const newProj = {
          ...createNewProject(),
          script: scriptText,
          scriptGeneratorIdea: currentProject?.scriptGeneratorIdea || ''
      };
      setCurrentProject(newProj);
      setStatus(AnalysisStatus.IDLE);
      setError(null);
      setActiveTool('script');
  };

  const handleGetShotIdeas = (scriptText: string) => {
    const newProj = {
        ...createNewProject(),
        script: scriptText,
        scriptGeneratorIdea: currentProject?.scriptGeneratorIdea || ''
    };
    setCurrentProject(newProj);
    setStatus(AnalysisStatus.IDLE);
    setError(null);
    setActiveTool('shotIdea');
  };

  const renderScriptContent = () => {
    if (!currentProject) return null;

    switch (status) {
      case AnalysisStatus.IDLE:
      case AnalysisStatus.ERROR:
        return <ScriptInput onAnalyze={handleAnalysis} isLoading={false} error={error} initialScript={currentProject.script} />;
      case AnalysisStatus.ANALYZING_STAGE_1:
      case AnalysisStatus.ANALYZING_STAGE_2:
      case AnalysisStatus.ANALYZING_STAGE_2_VISUALS:
      case AnalysisStatus.ANALYZING_STAGE_3:
        return <AnalysisInProgress status={status} />;
      case AnalysisStatus.COMPLETE:
        if (currentProject.stage1Result && currentProject.stage2Result && currentProject.stage3Result) {
          return <AnalysisResult 
            project={currentProject}
            onNewProject={handleNewProject} 
            onUpdateStage2Data={handleUpdateStage2Data}
            onSave={handleSaveProject}
            onSaveAs={() => setIsSaveModalOpen(true)}
          />;
        }
        handleNewProject(); // Fallback
        return null;
      default:
        return <ScriptInput onAnalyze={handleAnalysis} isLoading={false} error={error} initialScript={currentProject.script} />;
    }
  };

  return (
    <div className="min-h-screen font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8 relative">
          <div className="inline-flex items-center gap-4 mb-2">
            <FilmIcon className="w-10 h-10 text-brand-primary" />
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-brand-primary to-brand-secondary text-transparent bg-clip-text">
              FilmSet
            </h1>
          </div>
          <p className="text-brand-text-secondary text-lg">
            End-to-End AI Script Analysis & Visual Pre-Production
          </p>
          <div className="absolute top-0 right-0">
            <button
              onClick={() => setIsProjectManagerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-surface hover:bg-brand-surface/70 border border-gray-700 text-brand-text-secondary font-semibold rounded-lg transition-colors duration-200"
            >
              <FolderIcon className="w-5 h-5"/>
              My Projects
            </button>
          </div>
          <nav className="mt-6 border-b border-gray-700">
            <div className="-mb-px flex flex-wrap justify-center space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTool('script')}
                className={`${
                  activeTool === 'script'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                } flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors`}
              >
                <FilmIcon className="w-5 h-5" />
                Script Analysis
              </button>
               <button
                onClick={() => setActiveTool('scriptGenerator')}
                className={`${
                  activeTool === 'scriptGenerator'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                } flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors`}
              >
                <LightbulbIcon className="w-5 h-5" />
                Script Generator
              </button>
               <button
                onClick={() => setActiveTool('shotIdea')}
                className={`${
                  activeTool === 'shotIdea'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                } flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors`}
              >
                <ClapperboardIcon className="w-5 h-5" />
                Shot Idea Studio
              </button>
              <button
                onClick={() => setActiveTool('image')}
                className={`${
                  activeTool === 'image'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                } flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors`}
              >
                <ImageIcon className="w-5 h-5" />
                Image Studio
              </button>
              <button
                onClick={() => setActiveTool('storyboard')}
                className={`${
                  activeTool === 'storyboard'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                } flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors`}
              >
                <LayoutGridIcon className="w-5 h-5" />
                Storyboard Studio
              </button>
            </div>
          </nav>
        </header>
        <main className="bg-brand-surface rounded-xl shadow-2xl shadow-brand-primary/10 p-4 sm:p-8">
          {activeTool === 'script' && renderScriptContent()}
          {activeTool === 'scriptGenerator' && <ScriptGenerator onUseScript={handleUseGeneratedScript} onGetShotIdeas={handleGetShotIdeas} idea={currentProject?.scriptGeneratorIdea || ''} onUpdateIdea={handleUpdateScriptGeneratorIdea} />}
          {activeTool === 'shotIdea' && <ShotIdeaStudio project={currentProject} onUpdateShotIdeas={handleUpdateShotIdeas} onUpdateScript={handleUpdateScript} onUpdateConfig={handleUpdateShotIdeaConfig} onGenerateStoryboard={handleGenerateStoryboardFromShots} />}
          {activeTool === 'image' && <ImageStudio project={currentProject} onUpdateStage2Data={handleUpdateStage2Data} onUpdateConfig={handleUpdateImageStudioConfig} />}
          {activeTool === 'storyboard' && <StoryboardStudio project={currentProject} onUpdateStoryboardData={handleUpdateStoryboardData} onUpdateSceneDescription={handleUpdateStoryboardDescription} onClearStoryboardRequest={handleClearStoryboardRequest} />}
        </main>
        <footer className="text-center mt-8 text-brand-text-secondary text-sm">
          <p>&copy; {new Date().getFullYear()} FilmSet. All rights reserved.</p>
        </footer>
      </div>
      {isProjectManagerOpen && (
        <ProjectManager
          projects={projects}
          onLoad={handleLoadProject}
          onDelete={handleDeleteProject}
          onClose={() => setIsProjectManagerOpen(false)}
        />
      )}
      {isSaveModalOpen && (
          <SaveProjectModal 
            onSave={handleConfirmSave}
            onClose={() => setIsSaveModalOpen(false)}
            currentName={currentProject?.name}
          />
      )}
    </div>
  );
};

export default App;