import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle, Info, Clock, Calendar, Settings, BookOpen } from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetTab?: "tasks" | "dashboard" | "plan" | "timer" | "calendar" | "commitments" | "settings";
  targetElement?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'observe' | 'wait-for-action';
  waitFor?: 'task-added' | 'session-clicked' | 'tab-changed' | 'settings-changed' | 'study-plan-mode-changed' | 'timer-session-active' | 'commitment-added';
  customContent?: React.ReactNode;
  highlightTab?: boolean;
  requiresAction?: boolean; // New: indicates if this step requires user action
}

interface InteractiveTutorialProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  currentTab: string;
  onTabChange: (tab: "tasks" | "dashboard" | "plan" | "timer" | "calendar" | "commitments" | "settings") => void;
  tasksCount?: number;
  commitmentsCount?: number; // New prop to track commitments count
  onHighlightTab?: (tabId: string | null) => void; // New prop to communicate which tab to highlight
  onHighlightStudyPlanMode?: (highlight: boolean) => void; // New prop to highlight study plan mode
  currentStudyPlanMode?: string; // New prop to get current study plan mode
  hasActiveTimerSession?: boolean; // New prop to detect if timer has an active session
}

const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  isActive,
  onComplete,
  onSkip,
  currentTab,
  tasksCount = 0,
  commitmentsCount = 0,
  onHighlightTab,
  onHighlightStudyPlanMode,
  currentStudyPlanMode,
  hasActiveTimerSession = false
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [, setActionCompleted] = useState(false);
  const [initialTasksCount, setInitialTasksCount] = useState(tasksCount);
  const [initialCommitmentsCount, setInitialCommitmentsCount] = useState(commitmentsCount);
  const [initialStudyPlanMode, setInitialStudyPlanMode] = useState<string | null>(null);

  const tutorialSteps: TutorialStep[] = [
    // Step 1: Welcome and Task Input
    {
      id: 'welcome',
      title: 'Welcome to TimePilot! 🚀',
      description: 'Let\'s get you started with managing your time effectively. We\'ll guide you through each feature step by step.',
      position: 'center',
      action: 'observe',
      requiresAction: false
    },
    {
      id: 'task-input-intro',
      title: 'Adding Your First Task',
      description: 'Navigate to the "Tasks" tab to add your first task. Each task gets estimated time, priority, and deadlines.',
      targetTab: 'tasks',
      position: 'center',
      action: 'observe',
      highlightTab: true,
      requiresAction: false
    },
    {
      id: 'task-input-demo',
      title: 'Try Adding a Task',
      description: 'Click the "Add Task" button and fill in the required details.',
      targetTab: 'tasks',
      targetElement: '.add-task-button',
      position: 'bottom',
      action: 'wait-for-action',
      waitFor: 'task-added',
      requiresAction: true
    },
    {
      id: 'task-input-complete',
      title: 'Great! Task Added Successfully',
      description: 'Perfect! Your task has been added. Notice how it appears in the task list.',
      position: 'center',
      action: 'observe',
      requiresAction: false
    },

    // Step 2: Study Plan View
    {
      id: 'study-plan-intro',
      title: 'Smart Study Plan Generation',
      description: 'Navigate to the "Study Plan" tab to see how TimePilot automatically creates an intelligent study plan based on your tasks and commitments.',
      targetTab: 'plan',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'tab-changed',
      highlightTab: true,
      requiresAction: true
    },
    {
      id: 'study-plan-explanation',
      title: 'How Sessions Are Distributed',
      description: 'The system analyzes your tasks, estimates, deadlines, and existing commitments to create optimal study sessions distributed across days until their deadline.',
      position: 'center',
      action: 'observe',
      requiresAction: false,
      customContent: (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-700 dark:text-gray-200">Important tasks get priority</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-gray-700 dark:text-gray-200">Urgent deadlines are scheduled first</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-700 dark:text-gray-200">Considers your daily study hours, available days, etc.</span>
          </div>
        </div>
      )
    },

    // Step 3: Calendar View
    {
      id: 'calendar-intro',
      title: 'Visual Calendar Overview',
      description: 'Navigate to the "Calendar" tab to see your entire schedule at a glance. Study sessions and commitments are color-coded for easy identification.',
      targetTab: 'calendar',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'tab-changed',
      highlightTab: true,
      requiresAction: true
    },
    {
      id: 'calendar-features',
      title: 'Calendar Features',
      description: 'Switch between day, week, and month views. Adjust time intervals for detailed or overview planning. You can also customize the colors of the events by clicking the gear icon.',
      position: 'center',
      action: 'observe',
      requiresAction: false
    },

    // Step 4: Adding Commitments
    {
      id: 'commitments-intro',
      title: 'Adding Fixed Commitments',
      description: 'Navigate to the "Commitments" tab to add your regular commitments like classes, work hours, or appointments.',
      targetTab: 'commitments',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'tab-changed',
      highlightTab: true,
      requiresAction: true
    },
    {
      id: 'commitment-input-demo',
      title: 'Try Adding a Commitment',
      description: 'Click the "Add Commitment" button and fill in the required details.',
      targetTab: 'commitments',
      targetElement: '.add-commitment-button',
      position: 'bottom',
      action: 'wait-for-action',
      waitFor: 'commitment-added',
      requiresAction: true
    },
    {
      id: 'commitment-input-complete',
      title: 'Great! Commitment Added Successfully',
      description: 'Perfect! Your commitment has been added. Notice how it appears in the calendar and affects your study plan.',
      position: 'center',
      action: 'observe',
      requiresAction: false
    },
    {
      id: 'view-commitments-in-calendar',
      title: 'View Your Schedule',
      description: 'Navigate back to the "Calendar" tab to see your commitment alongside your tasks. Notice how commitments block time and affect your study plan scheduling.',
      targetTab: 'calendar',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'tab-changed',
      highlightTab: true,
      requiresAction: true
    },

    // Step 5: Settings Tour
    {
      id: 'settings-intro',
      title: 'Customize Your Experience',
      description: 'Navigate to the "Settings" tab to personalize TimePilot to match your study habits and preferences.',
      targetTab: 'settings',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'tab-changed',
      highlightTab: true,
      requiresAction: true
    },
    {
      id: 'study-window-settings',
      title: 'Study Plan Mode',
      description: 'Choose how your study sessions are distributed. Try switching between "Eisenhower Matrix" (smart prioritization) and "Evenly Distributed" (fair distribution) to see how it affects your schedule.',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'study-plan-mode-changed',
      requiresAction: true
    },
    {
      id: 'settings-to-calendar',
      title: 'Settings Impact',
      description: 'Navigate to the "Calendar" tab to see how your settings affect the calendar display. Notice how the study plan mode and other settings impact your schedule visualization.',
      targetTab: 'calendar',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'tab-changed',
      highlightTab: true,
      requiresAction: true
    },
    {
      id: 'back-to-settings',
      title: 'More Settings',
      description: 'Explore other settings like study window, buffer time between sessions, etc.',
      position: 'center',
      action: 'observe',
      requiresAction: false
    },

    // Step 5: Back to Study Plan for Session Interaction
    {
      id: 'session-interaction-intro',
      title: 'Ready to Start Studying?',
      description: 'Navigate to the "Study Plan" tab to see your study sessions and learn how to start studying.',
      targetTab: 'plan',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'tab-changed',
      highlightTab: true,
      requiresAction: true
    },
    {
      id: 'click-session',
      title: 'Study Sessions',
      description: 'Here you can see your study sessions. Click on any session to start the timer when you\'re ready to study.',
      targetTab: 'timer',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'timer-session-active',
      highlightTab: false,
      requiresAction: true
    },

    // Step 6: Timer Introduction
    {
      id: 'timer-intro',
      title: 'Study Timer Activated! ⏱️',
      description: 'Navigate to the "Timer" tab when you\'re ready to start a study session. The timer will track your progress and help you stay on track.',
      position: 'center',
      action: 'observe',
      requiresAction: false
    },
    {
      id: 'timer-features',
      title: 'Timer Features',
      description: 'Pause, resume, or skip sessions as needed. Your progress is automatically saved.',
      position: 'center',
      action: 'observe',
      requiresAction: false
    },
    {
      id: 'timer-completion',
      title: 'Session Completion',
      description: 'When the timer finishes, your session will be marked as complete and your study plan will update automatically.',
      position: 'center',
      action: 'observe',
      requiresAction: false
    },

    // Final Step
    {
      id: 'tutorial-complete',
      title: 'You\'re All Set! 🎉',
      description: 'Congratulations! You\'ve completed the TimePilot tutorial. You now know how to effectively manage your time.',
      position: 'center',
      action: 'observe',
      requiresAction: false,
      customContent: (
        <div className="space-y-3">
          <div className="flex items-center justify-center">
            <CheckCircle className="text-green-500" size={48} />
          </div>
          <div className="text-center space-y-2">
            <p className="font-semibold">Key Takeaways:</p>
            <ul className="text-sm space-y-1 text-left">
              <li>• Add tasks with realistic time estimates</li>
              <li>• Review your smart study plan daily</li>
              <li>• Use the calendar for visual planning</li>
              <li>• Customize settings to your preferences</li>
              <li>• Start sessions to track your progress</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const currentStep = tutorialSteps[currentStepIndex];

  // Initialize initial tasks count when tutorial starts
  useEffect(() => {
    if (isActive && currentStepIndex === 0) {
      setInitialTasksCount(tasksCount);
      setInitialCommitmentsCount(commitmentsCount);
      setActionCompleted(false);
    }
  }, [isActive, currentStepIndex, tasksCount, commitmentsCount]);

  // Initialize initial study plan mode when tutorial starts
  useEffect(() => {
    if (isActive && currentStepIndex === 0 && currentStudyPlanMode) {
      setInitialStudyPlanMode(currentStudyPlanMode);
    }
  }, [isActive, currentStepIndex, currentStudyPlanMode]);

  // Enhanced task detection with better logic
  useEffect(() => {
    if (currentStep.waitFor === 'task-added') {
      // Check if user has added at least one task since tutorial started
      const hasAddedTask = tasksCount > initialTasksCount;
      
      if (hasAddedTask) {
        setActionCompleted(true);
        // Don't auto-advance, let user click Next
      }
    }
  }, [tasksCount, initialTasksCount, currentStep.waitFor]);

  // Commitment detection logic
  useEffect(() => {
    if (currentStep.waitFor === 'commitment-added') {
      // Check if user has added at least one commitment since tutorial started
      const hasAddedCommitment = commitmentsCount > initialCommitmentsCount;
      
      if (hasAddedCommitment) {
        setActionCompleted(true);
        // Don't auto-advance, let user click Next
      }
    }
  }, [commitmentsCount, initialCommitmentsCount, currentStep.waitFor]);

  // Detect when user changes to the target tab
  useEffect(() => {
    if (currentStep.waitFor === 'tab-changed' && currentStep.targetTab && currentTab === currentStep.targetTab) {
      setActionCompleted(true);
      // Don't auto-advance, let user click Next
    }
  }, [currentTab, currentStep.waitFor, currentStep.targetTab]);

  // Reset action completed when step changes
  useEffect(() => {
    setActionCompleted(false);
  }, [currentStepIndex]);

  // Communicate which tab should be highlighted
  useEffect(() => {
    if (onHighlightTab && currentStep.highlightTab && currentStep.targetTab) {
      onHighlightTab(currentStep.targetTab);
    } else if (onHighlightTab) {
      onHighlightTab(null); // Clear highlighting when not needed
    }
  }, [currentStepIndex, currentStep.highlightTab, currentStep.targetTab, onHighlightTab]);

  // Communicate when study plan mode should be highlighted
  useEffect(() => {
    if (onHighlightStudyPlanMode) {
      // Highlight study plan mode during the study plan mode step
      const shouldHighlight = currentStep.id === 'study-window-settings';
      onHighlightStudyPlanMode(shouldHighlight);
    }
  }, [currentStepIndex, currentStep.id, onHighlightStudyPlanMode]);

  const handleNext = () => {
    if (currentStepIndex < tutorialSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setActionCompleted(false);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setActionCompleted(false);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  // Check if Next button should be enabled
  const canProceed = () => {
    if (!currentStep.requiresAction) return true;
    
    switch (currentStep.waitFor) {
      case 'task-added':
        return tasksCount > initialTasksCount;
      case 'commitment-added':
        return commitmentsCount > initialCommitmentsCount;
      case 'tab-changed':
        return currentStep.targetTab && currentTab === currentStep.targetTab;
      case 'study-plan-mode-changed':
        return initialStudyPlanMode && currentStudyPlanMode && initialStudyPlanMode !== currentStudyPlanMode;
      case 'timer-session-active':
        return currentStep.targetTab && currentTab === currentStep.targetTab && hasActiveTimerSession;
      default:
        return true;
    }
  };

  const isNextButtonEnabled = canProceed();


  if (!isActive) return null;

  const getTooltipPosition = () => {
    // Always position in the bottom right corner for non-blocking experience
    return 'fixed bottom-4 right-4 z-50';
  };

  return (
    <>
      {/* Tutorial tooltip - positioned in right corner */}
      <div className={getTooltipPosition()}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-80 p-4 relative border border-gray-200 dark:border-gray-700">
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={16} />
          </button>

          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex space-x-1">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full ${
                    index <= currentStepIndex ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {currentStepIndex + 1} of {tutorialSteps.length}
            </span>
          </div>

          {/* Content */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0">
                {currentStep.id.includes('welcome') && <Info className="text-blue-500" size={20} />}
                {currentStep.id.includes('task') && <BookOpen className="text-green-500" size={20} />}
                {currentStep.id.includes('study-plan') && <Calendar className="text-purple-500" size={20} />}
                {currentStep.id.includes('calendar') && <Calendar className="text-blue-500" size={20} />}
                {currentStep.id.includes('settings') && <Settings className="text-orange-500" size={20} />}
                {currentStep.id.includes('timer') && <Clock className="text-red-500" size={20} />}
                {currentStep.id.includes('complete') && <CheckCircle className="text-green-500" size={20} />}
              </div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                {currentStep.title}
              </h3>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              {currentStep.description}
            </p>

            {currentStep.customContent && (
              <div className="mt-3">
                {currentStep.customContent}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-between pt-3">
              <button
                onClick={handlePrevious}
                disabled={currentStepIndex === 0}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <ArrowLeft size={12} />
                <span>Previous</span>
              </button>

              <div className="flex space-x-1">
                <button
                  onClick={handleSkip}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Skip
                </button>
                <button
                  onClick={handleNext}
                  disabled={!isNextButtonEnabled}
                  className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    isNextButtonEnabled 
                      ? 'text-white bg-blue-600 hover:bg-blue-700' 
                      : 'text-gray-400 bg-gray-300 cursor-not-allowed dark:bg-gray-600 dark:text-gray-500'
                  }`}
                >
                  <span>{currentStepIndex === tutorialSteps.length - 1 ? 'Finish' : 'Next'}</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* Action required indicator */}
            {currentStep.requiresAction && !isNextButtonEnabled && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-700">
                <div className="flex items-center space-x-2 text-xs text-yellow-700 dark:text-yellow-300">
                  <span>⚠️</span>
                  <span>
                    {currentStep.waitFor === 'task-added' && 'Please add a task to continue'}
                    {currentStep.waitFor === 'commitment-added' && 'Please add a commitment to continue'}
                    {currentStep.waitFor === 'tab-changed' && `Please navigate to the "${currentStep.targetTab}" tab to continue`}
                    {currentStep.waitFor === 'study-plan-mode-changed' && 'Please switch the study plan mode to continue'}
                    {currentStep.waitFor === 'timer-session-active' && 'Please click on a study session to start the timer'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default InteractiveTutorial; 