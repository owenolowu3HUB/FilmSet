import React from 'react';
import { AnalysisStatus } from '../types';
import { CheckCircleIcon, SpinnerIcon } from './icons';

interface AnalysisInProgressProps {
  status: AnalysisStatus;
}

const AnalysisStep: React.FC<{ title: string; isActive: boolean; isComplete: boolean }> = ({ title, isActive, isComplete }) => (
    <div className="flex items-center gap-4 p-4 bg-brand-bg rounded-lg">
      {isActive && <SpinnerIcon className="w-6 h-6 text-brand-primary animate-spin" />}
      {isComplete && <CheckCircleIcon className="w-6 h-6 text-green-500" />}
      {!isActive && !isComplete && <div className="w-6 h-6 border-2 border-gray-600 rounded-full"></div>}
      <span className={`text-lg ${isActive ? 'font-semibold text-brand-text' : 'text-brand-text-secondary'}`}>
        {title}
      </span>
    </div>
);

const AnalysisInProgress: React.FC<AnalysisInProgressProps> = ({ status }) => {
  return (
    <div className="text-center p-8 flex flex-col items-center gap-6">
      <h2 className="text-3xl font-bold text-brand-primary">Analysis in Progress...</h2>
      <p className="text-brand-text-secondary max-w-md">
        Script Sentinel is deconstructing your script. This comprehensive process may take several moments.
      </p>
      
      <div className="w-full max-w-lg space-y-4 mt-4">
        <AnalysisStep 
            title="Stage 1: Structural & Narrative Deconstruction"
            isActive={status === AnalysisStatus.ANALYZING_STAGE_1}
            isComplete={status > AnalysisStatus.ANALYZING_STAGE_1}
        />
        <AnalysisStep 
            title="Stage 2: Pitch Deck Creation"
            isActive={status === AnalysisStatus.ANALYZING_STAGE_2}
            isComplete={status > AnalysisStatus.ANALYZING_STAGE_2}
        />
        <AnalysisStep 
            title="Generating Visual Concepts"
            isActive={status === AnalysisStatus.ANALYZING_STAGE_2_VISUALS}
            isComplete={status > AnalysisStatus.ANALYZING_STAGE_2_VISUALS}
        />
         <AnalysisStep 
            title="Stage 3: Production & Scheduling"
            isActive={status === AnalysisStatus.ANALYZING_STAGE_3}
            isComplete={status > AnalysisStatus.ANALYZING_STAGE_3}
        />
      </div>
    </div>
  );
};

export default AnalysisInProgress;