import React from 'react';
import {
  FileText,
  Wand2,
  Brain,
  ListTodo,
  CheckCircle2,
  Check,
  Loader2,
  Sparkles,
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
      className={`relative rounded-2xl border border-[#272a42] bg-gradient-to-b from-[#141524]/95 via-[#0e0f18]/98 to-[#0a0b12] p-6 sm:p-8 shadow-2xl shadow-blue-950/30 overflow-hidden text-left ${className}`}
    >
      {/* Ambient background glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-40 bg-gradient-to-r from-blue-600/15 via-indigo-500/15 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#212338]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-purple-500/15 border border-blue-400/35 flex items-center justify-center text-blue-400 shadow-[0_0_24px_rgba(59,130,246,0.3)] shrink-0">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#f4f4f5] tracking-tight">
                AI is analyzing your latest meeting
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-[10px] font-mono text-blue-300 font-medium">
                Live Pipeline
              </span>
            </div>
            <p className="text-xs text-[#9ca3af] mt-0.5">
              {meetingTitle ? (
                <>Tasks for <span className="text-[#f4f4f5] font-medium">{meetingTitle}</span> will appear automatically as each agent completes.</>
              ) : (
                'Tasks will appear on this board automatically as each intelligent agent completes.'
              )}
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs font-mono shadow-sm">
            <Loader2 size={13} className="animate-spin text-blue-400" />
            <span className="font-medium">Step {activeStep} of 5</span>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative mt-6 mb-8">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#71717a] mb-2">
          <span>PIPELINE PROGRESS</span>
          <span className="text-blue-300 font-semibold">{percentage}%</span>
        </div>
        <div className="w-full h-1.5 bg-[#1b1c2b] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(59,130,246,0.5)]"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Stepper Milestones Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-2 relative">
        {STEPS.map((step) => {
          const isCompleted = step.stepNumber < activeStep || currentStage === 'completed';
          const isActive = step.stepNumber === activeStep && currentStage !== 'completed';
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={`relative flex flex-col p-3 rounded-xl border transition-all duration-300 ${
                isCompleted
                  ? 'border-emerald-500/25 bg-emerald-500/[0.03]'
                  : isActive
                  ? 'border-blue-400/50 bg-blue-500/[0.08] shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20'
                  : 'border-[#212338] bg-[#12131e]/60 opacity-60'
              }`}
            >
              {/* Step Top Badge & Status Icon */}
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : isActive
                      ? 'bg-blue-500/20 border border-blue-400 text-blue-300 shadow-[0_0_14px_rgba(59,130,246,0.4)]'
                      : 'bg-[#181926] border border-[#27273a] text-[#71717a]'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={13} strokeWidth={3} />
                  ) : isActive ? (
                    <Loader2 size={13} className="animate-spin text-blue-400" />
                  ) : (
                    <span>{step.stepNumber}</span>
                  )}
                </div>

                <div
                  className={`text-xs ${
                    isCompleted
                      ? 'text-emerald-400'
                      : isActive
                      ? 'text-blue-300'
                      : 'text-[#52525b]'
                  }`}
                >
                  <Icon size={14} />
                </div>
              </div>

              {/* Step Labels */}
              <h4
                className={`text-xs font-semibold tracking-tight leading-tight ${
                  isCompleted
                    ? 'text-[#f4f4f5]'
                    : isActive
                    ? 'text-blue-200 font-bold'
                    : 'text-[#71717a]'
                }`}
              >
                {step.label}
              </h4>
              <p
                className={`text-[10px] mt-0.5 leading-tight ${
                  isCompleted
                    ? 'text-emerald-400/80 font-mono'
                    : isActive
                    ? 'text-blue-300/90 font-mono'
                    : 'text-[#52525b]'
                }`}
              >
                {isCompleted ? 'Completed' : isActive ? 'Processing...' : step.sublabel}
              </p>
            </div>
          );
        })}
      </div>

      {/* Active Stage Callout Panel */}
      <div className="relative mt-6 p-3.5 rounded-xl border border-blue-500/25 bg-blue-500/[0.04] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
            <Loader2 size={15} className="animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-200">
                Stage {activeStep} of 5: {stageTitle}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/20 text-blue-300">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-[#9ca3af] mt-0.5 leading-relaxed">
              {stageDescription}
            </p>
          </div>
        </div>

        <div className="text-[11px] font-mono text-[#71717a] shrink-0 self-end sm:self-center">
          Live sync via Socket & REST
        </div>
      </div>
    </div>
  );
};

export default AIProcessingStepper;
