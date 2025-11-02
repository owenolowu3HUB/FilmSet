import React from 'react';
import { Project } from '../types';
import { TrashIcon } from './icons';

interface ProjectManagerProps {
  projects: Project[];
  onLoad: (id: number) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ projects, onLoad, onDelete, onClose }) => {

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent load from triggering
    if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      onDelete(id);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="bg-brand-surface w-full max-w-2xl rounded-xl shadow-2xl shadow-brand-primary/20 p-6 flex flex-col gap-4 max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">My Projects</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        
        <div className="overflow-y-auto pr-2 -mr-2">
            {projects.length > 0 ? (
                <ul className="space-y-3">
                    {projects.map(p => (
                        <li 
                            key={p.id} 
                            onClick={() => onLoad(p.id!)}
                            className="flex justify-between items-center p-4 bg-brand-bg rounded-lg cursor-pointer hover:bg-brand-primary/10 transition-colors"
                        >
                            <div>
                                <p className="font-semibold text-lg">{p.name}</p>
                                <p className="text-sm text-brand-text-secondary">
                                    Last updated: {new Date(p.updatedAt).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={(e) => handleDelete(e, p.id!)}
                                className="p-2 rounded-full text-gray-400 hover:bg-red-900/50 hover:text-red-300 transition-colors"
                                aria-label={`Delete project ${p.name}`}
                            >
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-10 text-brand-text-secondary">
                    <p>No saved projects yet.</p>
                    <p>Complete an analysis and click "Save" to get started.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProjectManager;