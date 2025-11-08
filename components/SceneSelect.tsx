import React from 'react';
import { Project } from '../types';
import { ClapperboardIcon } from './icons';

interface SceneSelectProps {
  project: Project | null;
  onSendToShotIdeas: (sceneContent: string) => void;
}

const SceneSelect: React.FC<SceneSelectProps> = ({ project, onSendToShotIdeas }) => {
  const fullScenes = project?.fullScenes;

  if (!fullScenes || fullScenes.length === 0) {
    return (
      <div className="text-center p-8 flex flex-col items-center gap-4 text-text-secondary">
        <h2 className="text-2xl font-display font-bold text-text-primary">Scene Selector</h2>
        <p>
          To use this tool, first submit a script for analysis on the "Script Analysis" tab.
        </p>
        <p>
          Once the analysis is complete, all scenes will be listed here, ready to be sent for shot generation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-display font-bold mb-2">Scene Select</h2>
        <p className="text-text-secondary">
          Here is a complete list of all scenes from your analyzed script. Select a scene to send it directly to the Shot Idea Studio for visual breakdown.
        </p>
      </div>

      <div className="space-y-6">
        {fullScenes.map((scene) => (
          <div key={scene.scene_number} className="bg-bg-secondary p-6 rounded-lg border border-border-color/50">
            <h3 className="text-xl font-display font-bold text-accent mb-4 pb-2 border-b-2 border-accent/30">
              {scene.heading}
            </h3>
            <pre className="whitespace-pre-wrap font-sans text-text-primary bg-bg-primary p-4 rounded-md max-h-80 overflow-y-auto text-sm leading-relaxed">
              <code>{scene.content}</code>
            </pre>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => onSendToShotIdeas(scene.content)}
                className="flex items-center gap-2 px-4 py-2 bg-accent/10 hover:bg-accent/20 border border-accent text-accent font-semibold rounded-lg transition-colors duration-200"
              >
                <ClapperboardIcon className="w-5 h-5" />
                <span>Send to Shot Idea Studio</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SceneSelect;
