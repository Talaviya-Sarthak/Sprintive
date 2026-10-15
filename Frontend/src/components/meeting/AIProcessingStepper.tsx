import React from 'react';
import {
  FileText,
  Wand2,
  Brain,
  ListTodo,
  CheckCircle2,
  Check,
  Loader2,
} from 'lucide-react';

interface AIProcessingStepperProps {
  currentStage?: string;
  meetingTitle?: string;
  className?: string;
}

interface StepDefinition {
  id: string;
  stepNumber: number;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  stageKeys: string[];
}

const STEPS: StepDefinition[] = [
  {
    id: 'transcript',
    stepNumber: 1,
    label: 'Transcript',
    sublabel: 'Audio captured',
    icon: FileText,
    stageKeys: ['finalizing_transcript', 'saving_transcript'],
  },
  {
    id: 'cleaning',
    stepNumber: 2,
    label: 'Hygiene & Clean',
    sublabel: '14-stage cleanup',
    icon: Wand2,
    stageKeys: ['cleaning_transcript'],
  },
  {
    id: 'analysis',
    stepNumber: 3,
    label: 'Meeting AI',
    sublabel: 'Summary & decisions',
    icon: Brain,
    stageKeys: ['analyzing_meeting'],
  },
  {
    id: 'tasks',
    stepNumber: 4,
    label: 'Scrum Tasks',
    sublabel: 'Stories & acceptance',
    icon: ListTodo,
    stageKeys: ['generating_tasks'],
  },
  {
    id: 'resolving',
    stepNumber: 5,
    label: 'Kanban Sync',
    sublabel: 'Assignees & dates',
    icon: CheckCircle2,
    stageKeys: ['resolving_tasks', 'completed'],
  },
];

function getStageDetails(stage: string): {
  activeStep: number;
  percentage: number;
  stageTitle: string;
  stageDescription: string;
} {
  switch (stage) {
    case 'finalizing_transcript':
      return {
        activeStep: 1,
        percentage: 15,
        stageTitle: 'Finalizing Meeting Audio',
        stageDescription: 'Assembling conversational speech stream and writing raw transcript to secure storage...',
      };
    case 'saving_transcript':
      return {
        activeStep: 1,
        percentage: 25,
        stageTitle: 'Storing Raw Transcript',
        stageDescription: 'Saving raw dialogue transcript and validating storage permissions...',
      };
    case 'cleaning_transcript':
      return {
        activeStep: 2,
        percentage: 45,
        stageTitle: 'Transcript Hygiene & Normalization',
        stageDescription: 'Running 14-stage audio noise suppression, grammar normalization, and speaker verification...',
      };
    case 'analyzing_meeting':
      return {
        activeStep: 3,
        percentage: 65,
        stageTitle: 'Meeting Understanding Agent',
        stageDescription: 'Extracting executive summary, key decisions, blockers, and high-priority action items...',
      };
    case 'generating_tasks':
      return {
        activeStep: 4,
        percentage: 82,
        stageTitle: 'Scrum Intelligence Agent',
        stageDescription: 'Transforming action items into structured sprint stories, bug reports, and acceptance criteria...',
      };
    case 'resolving_tasks':
      return {
        activeStep: 5,
        percentage: 95,
        stageTitle: 'Deterministic Task Resolution',
        stageDescription: 'Matching assignees to team members, resolving due dates, and publishing to your Kanban board...',
      };
    case 'completed':
      return {
        activeStep: 5,
        percentage: 100,
        stageTitle: 'Processing Completed',
        stageDescription: 'All intelligence and Kanban tasks have been successfully generated and synced.',
      };
    default:
      return {
        activeStep: 2,
        percentage: 40,
        stageTitle: 'AI Analysis in Progress',
        stageDescription: 'AI is analyzing your meeting content and generating actionable work items...',
      };
  }
}

export const AIProcessingStepper: React.FC<AIProcessingStepperProps> = ({
  currentStage = 'resolving_tasks',
  meetingTitle,
  className = '',
}) => {
  const { activeStep, percentage, stageTitle, stageDescription } = getStageDetails(currentStage);

  return (
    <div
      className={`relative rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-[#0b0e14]/95 via-[#0c1017]/98 to-[#090c10] p-5 sm:p-6 shadow-xl shadow-emerald-950/20 overflow-hidden text-left ${className}`}
    >
      {/* Ambient green glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[460px] h-36 bg-gradient-to-r from-emerald-600/15 via-teal-500/10 to-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-[#1b222d]">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-semibold text-[#f4f4f5] tracking-tight">
                AI Pipeline Processing
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-mono text-emerald-400 font-medium">
                Live
              </span>
            </div>
            <p className="text-xs text-[#9ca3af] mt-0.5">
              {meetingTitle ? (
                <>
                  Analyzing <span className="text-emerald-300 font-medium">{meetingTitle}</span> · Tasks sync to board in real-time.
                </>
              ) : (
                'Tasks and sprint items will populate this board automatically upon completion.'
              )}
            </p>
          </div>
        </div>

        {/* Live Status Pill & Progress */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono">
            <Loader2 size={12} className="animate-spin text-emerald-400" />
            <span className="font-medium">Stage {activeStep} of 5</span>
            <span className="text-emerald-500/40">|</span>
            <span className="font-semibold text-emerald-300">{percentage}%</span>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative mt-4 mb-6">
        <div className="w-full h-1 bg-[#151c27] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Minimal Connected Horizontal Stepper */}
      <div className="relative py-2">
        <div className="grid grid-cols-5 relative">
          {STEPS.map((step, idx) => {
            const isCompleted = step.stepNumber < activeStep || currentStage === 'completed';
            const isActive = step.stepNumber === activeStep && currentStage !== 'completed';

            return (
              <div key={step.id} className="relative flex flex-col items-center text-center group">
                {/* Connecting Line to next step */}
                {idx < STEPS.length - 1 && (
                  <div
                    className="absolute top-4 left-1/2 w-full h-[2px] -z-0"
                    style={{
                      background: isCompleted
                        ? 'linear-gradient(90deg, #10b981 0%, #10b981 100%)'
                        : isActive
                        ? 'linear-gradient(90deg, #10b981 0%, #1a2332 100%)'
                        : '#181f2c',
                    }}
                  />
                )}

                {/* Milestone Node */}
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500 text-[#090b0e] shadow-[0_0_14px_rgba(16,185,129,0.45)]'
                      : isActive
                      ? 'bg-[#0f1715] border-2 border-emerald-400 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.5)] ring-4 ring-emerald-500/15'
                      : 'bg-[#121620] border border-[#222938] text-[#6b7280]'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={14} strokeWidth={3} />
                  ) : isActive ? (
                    <Loader2 size={14} className="animate-spin text-emerald-400" />
                  ) : (
                    <span className="text-xs font-semibold">{step.stepNumber}</span>
                  )}
                </div>

                {/* Step Text Info */}
                <div className="mt-2.5 space-y-0.5 px-1">
                  <div className="flex items-center justify-center gap-1">
                    <span
                      className={`text-xs font-semibold tracking-tight ${
                        isCompleted
                          ? 'text-emerald-300'
                          : isActive
                          ? 'text-white'
                          : 'text-[#6b7280]'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  <p
                    className={`text-[10px] font-mono leading-tight ${
                      isCompleted
                        ? 'text-emerald-400/70'
                        : isActive
                        ? 'text-emerald-400 font-medium'
                        : 'text-[#4b5563]'
                    }`}
                  >
                    {isCompleted ? 'Done' : isActive ? 'Processing...' : step.sublabel}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sleek Active Stage Bottom Bar */}
      <div className="relative mt-5 pt-3.5 border-t border-[#1b222d] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
            Active
          </span>
          <span className="font-semibold text-emerald-200 shrink-0">
            {stageTitle}:
          </span>
          <span className="text-[#9ca3af] truncate text-[11px]">
            {stageDescription}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#6b7280] shrink-0 self-end sm:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live sync active</span>
        </div>
      </div>
    </div>
  );
};

export default AIProcessingStepper;
