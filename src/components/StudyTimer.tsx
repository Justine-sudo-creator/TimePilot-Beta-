import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, RotateCcw, CheckCircle, ArrowRight, Coffee, BookOpen } from 'lucide-react';
import { Task, TimerState } from '../types';
import { formatTimeForTimer } from '../utils/scheduling';

// Helper to format time with seconds
function formatTimeForTimerWithSeconds(seconds: number): string {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}h${m > 0 ? ` ${m}m` : ''}${s > 0 ? ` ${s}s` : ''}`;
  } else if (m > 0) {
    return `${m}m${s > 0 ? ` ${s}s` : ''}`;
  } else {
    return `${s}s`;
  }
}

interface StudyTimerProps {
  currentTask: Task | null;
  currentSession?: { allocatedHours: number, planDate?: string, sessionNumber?: number } | null;
  onTimerComplete: (taskId: string, timeSpent: number) => void;
  planDate?: string;
  sessionNumber?: number;
  onMarkSessionDone?: (planDate: string, sessionNumber: number) => void;
  timer: TimerState;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerStop: () => void;
  onTimerReset: () => void;
  onTimerSpeedUp: () => void;
  // New props for completion flow
  onContinueWithNextSession?: () => void;
  onTakeBreak?: () => void;
  onReviewCompletedWork?: () => void;
  // Additional props for progress tracking
  studyPlans?: any[];
  tasks?: Task[];
}

const StudyTimer: React.FC<StudyTimerProps> = ({ 
  currentTask, 
  currentSession, 
  onTimerComplete, 
  planDate, 
  sessionNumber, 
  onMarkSessionDone, 
  timer, 
  onTimerStart, 
  onTimerPause, 
  onTimerStop, 
  onTimerReset, 
  onTimerSpeedUp,
  onContinueWithNextSession,
  onTakeBreak,
  onReviewCompletedWork,
  studyPlans,
  tasks
}) => {
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionData, setCompletionData] = useState<{
    timeSpent: number;
    taskTitle: string;
    sessionNumber: number;
  } | null>(null);

  const handleStart = () => {
    onTimerStart();
  };

  const handlePause = () => {
    onTimerPause();
  };

  const handleStop = () => {
    onTimerStop();
  };

  const handleReset = () => {
    onTimerReset();
  };

  const progressPercentage = timer.totalTime > 0 ? ((timer.totalTime - timer.currentTime) / timer.totalTime) * 100 : 0;

  // This component should only be rendered when currentTask is not null
  // The "Select a task" message is now handled in App.tsx
  if (!currentTask) {
    return null; // This should never happen, but TypeScript needs this check
  }

  const handleMarkSessionDone = () => {
    if (planDate && sessionNumber !== undefined && onMarkSessionDone) {
      onMarkSessionDone(planDate, sessionNumber);
      
      // Show completion modal with data
      setCompletionData({
        timeSpent: timer.totalTime - timer.currentTime,
        taskTitle: currentTask?.title || '',
        sessionNumber: sessionNumber
      });
      setShowCompletionModal(true);
    } else {
      onTimerComplete(currentTask?.id || '', timer.totalTime);
    }
  };

  const handleContinueWithNext = () => {
    setShowCompletionModal(false);
    if (onContinueWithNextSession) {
      onContinueWithNextSession();
    }
  };

  const handleTakeBreak = () => {
    setShowCompletionModal(false);
    if (onTakeBreak) {
      onTakeBreak();
    }
  };

  const handleReviewWork = () => {
    setShowCompletionModal(false);
    if (onReviewCompletedWork) {
      onReviewCompletedWork();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 dark:bg-gray-900 dark:shadow-gray-900">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2 dark:text-white">Study Timer</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">{currentTask.title}</p>
      </div>

      <div className="mb-8">
        <div className="relative w-48 h-48 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="url(#gradient)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${progressPercentage * 2.51} 251`}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-800">
                {timer.isRunning
                  ? formatTimeForTimerWithSeconds(timer.currentTime)
                  : formatTimeForTimer(timer.currentTime)}
              </div>
              <div className="text-sm text-gray-500">
                {Math.round(progressPercentage)}% complete
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center space-x-4 timer-controls">
          {!timer.isRunning ? (
            <button
              onClick={handleStart}
              className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2"
            >
              <Play size={20} />
              <span>Start</span>
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-6 py-3 rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all duration-200 flex items-center space-x-2"
            >
              <Pause size={20} />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={handleStop}
            className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2"
          >
            <Square size={20} />
            <span>Stop</span>
          </button>

          <button
            onClick={handleReset}
            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center space-x-2"
          >
            <RotateCcw size={20} />
            <span>Reset</span>
          </button>
        </div>

        {/* Testing buttons */}
        <div className="flex justify-center space-x-4 mt-4">
          <button
            onClick={() => {
              // This would need to be handled by the parent component
              // For now, we'll just stop the timer
              onTimerStop();
            }}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2"
          >
            <span>Finish Timer (Test)</span>
          </button>
          
          <button
            onClick={onTimerSpeedUp}
            className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 flex items-center space-x-2"
          >
            <span>Speed Up 5min (Test)</span>
          </button>
        </div>

        {/* Mark session as done button appears only when timer is finished */}
        {timer.currentTime === 0 && !timer.isRunning && currentTask && (
          <div className="flex justify-center mt-6">
            <button
              onClick={handleMarkSessionDone}
              className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-8 py-3 rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-200 text-lg font-semibold flex items-center space-x-2"
            >
              <CheckCircle size={20} />
              <span>Mark session as done</span>
            </button>
          </div>
        )}
      </div>

      {/* Completion Modal */}
      {showCompletionModal && completionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Session Complete!
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Great work on "{completionData.taskTitle}"
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(completionData.timeSpent / 60)}m
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Time Spent</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    Session {completionData.sessionNumber}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Completed</div>
                </div>
              </div>
              
              {/* Task Progress */}
              {studyPlans && tasks && currentTask && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-center mb-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Task Progress
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(() => {
                            const allSessionsForTask = studyPlans.flatMap(plan => plan.plannedTasks).filter(s => s.taskId === currentTask.id);
                            const completedSessions = allSessionsForTask.filter(s => s.done || s.status === 'skipped').length;
                            const totalSessions = allSessionsForTask.length;
                            return totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
                          })()}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {(() => {
                        const allSessionsForTask = studyPlans.flatMap(plan => plan.plannedTasks).filter(s => s.taskId === currentTask.id);
                        const completedSessions = allSessionsForTask.filter(s => s.done || s.status === 'skipped').length;
                        const totalSessions = allSessionsForTask.length;
                        return `${completedSessions}/${totalSessions}`;
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={handleContinueWithNext}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <ArrowRight size={20} />
                <span>Continue with next session</span>
              </button>
              
              <button
                onClick={handleTakeBreak}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-4 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Coffee size={20} />
                <span>Take a break</span>
              </button>
              
              <button
                onClick={handleReviewWork}
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <BookOpen size={20} />
                <span>Review completed work</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyTimer;