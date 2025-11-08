import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AnalysisStatus, Stage1Result, Stage2Result, Stage3Result, Project, StoryboardData, ShotIdea, SceneOverview, CharacterDesign, FullScene } from './types';
import { analyzeStage1, analyzeStage2, analyzeStage3, generateAllVisuals, extractScenes } from './services/geminiService';
import ScriptInput from './components/ScriptInput';
import AnalysisInProgress from './components/AnalysisInProgress';
import AnalysisResult from './components/AnalysisResult';
import ImageStudio from './components/ImageStudio';
import StoryboardStudio from './components/StoryboardStudio';
import ScriptGenerator from './components/ScriptGenerator';
import ShotIdeaStudio from './components/ShotIdeaStudio';
import SceneSelect from './components/SceneSelect';
import { FilmIcon, ImageIcon, LayoutGridIcon, FolderIcon, LightbulbIcon, ClapperboardIcon, ClipboardCopyIcon } from './components/icons';
import { initDB, saveProject, getProject, getAllProjects, deleteProject } from './db';
import ProjectManager from './components/ProjectManager';
import SaveProjectModal from './components/SaveProjectModal';
import VisualsChoiceModal from './components/VisualsChoiceModal';
import ThemeSelector from './components/ThemeSelector';

// This function now correctly initializes all tool-specific states
const createNewProject = (): Project => ({
  name: "Untitled Project",
  script: "",
  stage1Result: null,
  stage2Result: null,
  stage3Result: null,
  storyboardData: null,
  shotIdeasList: null,
  fullScenes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  scriptGeneratorIdea: '',
  shotIdeaStudioConfig: { genre: '', location: '', characterRace: '', skinTone: '', artisticStyle: '' },
  // FIX: Replaced incorrect 'imageStudioConfig' with the correct 'imageStudioState' object.
  imageStudioState: {
    mode: 'generate',
    prompt: '',
    sourceImage: null,
    characterReferenceImage: null,
    locationReferenceImage: null,
    resultImageBase64: null,
    analysisText: null,
    isContinuation: false,
    continuationSourceImage: null,
    characterSelect: '',
    config: { genre: '', artisticStyle: '', shotType: '', location: '', characterRace: '', skinTone: '', aspectRatio: '16:9' }
  },
  storyboardSceneDescription: '',
  storyboardRequestFromShots: undefined,
  shotIdeasListContext: undefined,
  storyboardRequestContext: undefined
});

const App: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'script' | 'image' | 'storyboard' | 'scriptGenerator' | 'shotIdea' | 'sceneSelect'>('script');

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isVisualsModalOpen, setIsVisualsModalOpen] = useState(false);
  const [scriptToAnalyze, setScriptToAnalyze] = useState('');
  const [theme, setTheme] = useState<string>(() => {
    // Check for saved theme in localStorage, default to 'dark-mode'
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'dark-mode';
  });


  const debounceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const initialize = async () => {
      await initDB();
      await refreshProjectList();
      setCurrentProject(createNewProject());
    };
    initialize();
  }, []);

  // Effect to apply and save the theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

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
    setProjects(allProjects);
  };
  
  const handleNewProject = () => {
    setCurrentProject(createNewProject());
    setStatus(AnalysisStatus.IDLE);
    setError(null);
    setActiveTool('script');
  };

  const handleAnalysis = useCallback((scriptText: string) => {
    if (!scriptText.trim()) {
      setError('Script content cannot be empty.');
      return;
    }
    setScriptToAnalyze(scriptText);
    setIsVisualsModalOpen(true);
  }, []);

  const executeAnalysis = useCallback(async (withVisuals: boolean) => {
    setIsVisualsModalOpen(false);
    const scriptText = scriptToAnalyze;
    if (!scriptText.trim()) return;

    // Create a fresh project for analysis, preserving the script text
    const projectToAnalyze = { ...createNewProject(), script: scriptText };
    setCurrentProject(projectToAnalyze);

    setError(null);
    setStatus(AnalysisStatus.ANALYZING_STAGE_1);

    try {
      const result1 = await analyzeStage1(scriptText);
      setCurrentProject(p => p ? { ...p, stage1Result: result1 } : null);

      setStatus(AnalysisStatus.ANALYZING_STAGE_2);
      let result2 = await analyzeStage2(scriptText, result1.logline, result1.synopsis.extended);
      
      if (withVisuals) {
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
        
        result2 = updatedResult2;
      }
      
      setCurrentProject(p => p ? { ...p, stage2Result: result2 } : null);
      
      setStatus(AnalysisStatus.ANALYZING_STAGE_3);
      const result3 = await analyzeStage3(scriptText);
      
      // New: Extract full scenes after main analysis
      const fullScenes = await extractScenes(scriptText);
      setCurrentProject(p => p ? { ...p, stage3Result: result3, fullScenes: fullScenes } : null);
      
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
  }, [scriptToAnalyze]);
  
  // These handlers now correctly update the centralized project state
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
  // FIX: Removed unused and erroneous handleUpdateImageStudioConfig function.
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
  const handleSendSceneToShotIdeas = (sceneContent: string) => {
    setCurrentProject(p => p ? { ...p, script: sceneContent, shotIdeasList: null } : null); // Also clear previous shot ideas
    setActiveTool('shotIdea');
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
    };
    setCurrentProject(newProj);
    setStatus(AnalysisStatus.IDLE);
    setError(null);
    setActiveTool('shotIdea');
  };

  const handleExportProject = () => {
    if (!currentProject) return;
    try {
      const projectJson = JSON.stringify(currentProject, null, 2);
      const blob = new Blob([projectJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = (currentProject.name || 'Untitled_Project').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.href = url;
      a.download = `${safeName}.filmset`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export project:", err);
      setError("Could not export project. See console for details.");
    }
  };

  const handleImportProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const importedProject = JSON.parse(text) as Project;

        // Basic validation
        if (!importedProject || typeof importedProject.name !== 'string' || typeof importedProject.script !== 'string') {
          throw new Error("Invalid project file format.");
        }

        // Prepare for saving as a new project in the DB
        delete importedProject.id;
        importedProject.createdAt = new Date();
        importedProject.updatedAt = new Date();

        const newId = await saveProject(importedProject);
        await refreshProjectList();
        await handleLoadProject(newId); // Load the newly imported project
      } catch (err) {
        console.error("Failed to import project:", err);
        setError(err instanceof Error ? err.message : "Could not import project file.");
      }
    };
    reader.onerror = () => {
      setError("Failed to read the project file.");
    };
    reader.readAsText(file);
  };


  const renderScriptContent = () => {
    if (!currentProject) return null;

    switch (status) {
      case AnalysisStatus.IDLE:
      case AnalysisStatus.ERROR:
        return <ScriptInput onAnalyze={handleAnalysis} isLoading={false} error={error} script={currentProject.script} onUpdateScript={handleUpdateScript} />;
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
            onExportProject={handleExportProject}
          />;
        }
        handleNewProject(); // Fallback
        return null;
      default:
        return <ScriptInput onAnalyze={handleAnalysis} isLoading={false} error={error} script={currentProject.script} onUpdateScript={handleUpdateScript} />;
    }
  };
  
  const NavButton: React.FC<{
      label: string;
      tool: 'script' | 'image' | 'storyboard' | 'scriptGenerator' | 'shotIdea' | 'sceneSelect';
      icon: React.ReactNode;
    }> = ({ label, tool, icon }) => {
      const isActive = activeTool === tool;
      return (
        <button
          onClick={() => setActiveTool(tool)}
          className={`relative flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-all duration-300 ${isActive ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-color'}`}
        >
          {icon}
          {label}
          {isActive && <div className="absolute bottom-[-2px] left-0 w-full h-0.5 bg-accent shadow-accent-glow"></div>}
        </button>
      );
    };

  return (
    <div className="min-h-screen font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8 relative">
          <div className="inline-flex items-center gap-4 mb-2">
            <FilmIcon className="w-10 h-10 text-accent" />
            <h1 className="text-4xl sm:text-5xl font-display font-bold bg-gradient-to-r from-accent to-accent-secondary text-transparent bg-clip-text">
              FilmSet
            </h1>
          </div>
          <p className="text-text-secondary text-lg">
            End-to-End AI Script Analysis & Visual Pre-Production
          </p>
          <div className="absolute top-0 right-0 flex items-center gap-4">
            <ThemeSelector theme={theme} setTheme={setTheme} />
            <button
              onClick={() => setIsProjectManagerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-bg-secondary hover:bg-surface border border-border-color text-text-secondary font-semibold rounded-lg transition-colors duration-200"
            >
              <FolderIcon className="w-5 h-5"/>
              My Projects
            </button>
          </div>
          <nav className="mt-6 border-b border-border-color">
            <div className="-mb-px flex flex-wrap justify-center space-x-8" aria-label="Tabs">
               <NavButton label="Script Analysis" tool="script" icon={<FilmIcon className="w-5 h-5" />} />
               <NavButton label="Script Generator" tool="scriptGenerator" icon={<LightbulbIcon className="w-5 h-5" />} />
               <NavButton label="Scene Select" tool="sceneSelect" icon={<ClipboardCopyIcon className="w-5 h-5" />} />
               <NavButton label="Shot Idea Studio" tool="shotIdea" icon={<ClapperboardIcon className="w-5 h-5" />} />
               <NavButton label="Image Studio" tool="image" icon={<ImageIcon className="w-5 h-5" />} />
               <NavButton label="Storyboard Studio" tool="storyboard" icon={<LayoutGridIcon className="w-5 h-5" />} />
            </div>
          </nav>
        </header>
        <main className="bg-surface rounded-xl shadow-2xl shadow-accent/10 border border-border-color/50 p-4 sm:p-8 backdrop-blur-sm">
          {activeTool === 'script' && renderScriptContent()}
          {activeTool === 'scriptGenerator' && <ScriptGenerator project={currentProject} onUseScript={handleUseGeneratedScript} onGetShotIdeas={handleGetShotIdeas} onUpdateIdea={handleUpdateScriptGeneratorIdea} onUpdateGeneratedScript={(s) => setCurrentProject(p => p ? {...p, script: s} : null)} />}
          {activeTool === 'sceneSelect' && <SceneSelect project={currentProject} onSendToShotIdeas={handleSendSceneToShotIdeas} />}
          {activeTool === 'shotIdea' && <ShotIdeaStudio project={currentProject} onUpdateShotIdeas={handleUpdateShotIdeas} onUpdateScript={handleUpdateScript} onUpdateConfig={handleUpdateShotIdeaConfig} onGenerateStoryboard={handleGenerateStoryboardFromShots} />}
          {activeTool === 'image' && <ImageStudio project={currentProject} onUpdateStage2Data={handleUpdateStage2Data} onUpdateState={(s) => setCurrentProject(p => p ? {...p, imageStudioState: s} : null)} />}
          {activeTool === 'storyboard' && <StoryboardStudio project={currentProject} onUpdateStoryboardData={handleUpdateStoryboardData} onUpdateSceneDescription={handleUpdateStoryboardDescription} onClearStoryboardRequest={handleClearStoryboardRequest} />}
        </main>
        <footer className="text-center mt-8 text-text-secondary text-sm">
          <p>&copy; {new Date().getFullYear()} FilmSet. All rights reserved.</p>
        </footer>
      </div>
      {isProjectManagerOpen && (
        <ProjectManager
          projects={projects}
          onLoad={handleLoadProject}
          onDelete={handleDeleteProject}
          onClose={() => setIsProjectManagerOpen(false)}
          onImportProject={handleImportProject}
        />
      )}
      {isSaveModalOpen && (
          <SaveProjectModal 
            onSave={handleConfirmSave}
            onClose={() => setIsSaveModalOpen(false)}
            currentName={currentProject?.name}
          />
      )}
      {isVisualsModalOpen && (
        <VisualsChoiceModal 
            onGenerate={() => executeAnalysis(true)}
            onSkip={() => executeAnalysis(false)}
            onClose={() => setIsVisualsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default App;