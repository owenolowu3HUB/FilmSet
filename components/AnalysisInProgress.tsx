import React from 'react';
import { AnalysisStatus } from '../types';
import { CheckCircleIcon, SpinnerIcon } from './icons';

interface AnalysisInProgressProps {
  status: AnalysisStatus;
}

const AnalysisStep: React.FC<{ title: string; isActive: boolean; isComplete: boolean }> = ({ title, isActive, isComplete }) => (
    <div className="flex items-center gap-4 p-4 bg-bg-secondary rounded-lg border border-border-color transition-all duration-300">
      <div className="w-6 h-6 flex-shrink-0">
        {isActive && <SpinnerIcon className="w-full h-full text-accent animate-spin" />}
        {isComplete && <CheckCircleIcon className="w-full h-full text-green-400" />}
        {!isActive && !isComplete && <div className="w-full h-full border-2 border-border-color rounded-full"></div>}
      </div>
      <span className={`text-lg transition-colors duration-300 ${isActive ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
        {title}
      </span>
    </div>
);

const AnalysisInProgress: React.FC<AnalysisInProgressProps> = ({ status }) => {
  return (
    <div className="text-center p-8 flex flex-col items-center gap-6">
      <h2 className="text-3xl font-display font-bold text-accent">Analysis in Progress...</h2>
      <p className="text-text-secondary max-w-md">
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