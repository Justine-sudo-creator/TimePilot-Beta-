import React from 'react';
import { Lightbulb, AlertTriangle, Clock, Calendar, Settings, Target, Star, Zap } from 'lucide-react';
import { getUnscheduledMinutesForTasks } from '../utils/scheduling';
import { Task, StudyPlan, UserSettings, FixedCommitment } from '../types';

interface Suggestion {
  taskTitle: string;
  unscheduledMinutes: number;
  suggestions: {
    type: 'increase_hours' | 'add_days' | 'extend_deadline' | 'reduce_buffer' | 'reduce_estimated_hours' | 'adjust_deadline' | 'increase_daily_hours' | 'adjust_days_buffer' | 'switch_study_mode' | 'prioritize_important' | 'urgent_important_warning';
    message: string;
    value?: number;
  }[];
}

interface SuggestionsPanelProps {
  tasks: Task[];
  studyPlans: StudyPlan[];
  settings: UserSettings;
  fixedCommitments: FixedCommitment[];
  suggestions?: any[];
  onUpdateSettings?: (updates: Partial<{
    dailyAvailableHours: number;
    workDays: number[];
    bufferDays: number;
  }>) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask?: (taskId: string) => void;
}

const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({ 
  tasks, 
  studyPlans, 
  settings, 
  fixedCommitments, 
  suggestions = [], 
  onUpdateSettings,
  onUpdateTask,
  onDeleteTask 
}) => {
  // Calculate scheduled hours for each task (including all scheduled sessions, not just completed ones)
  const taskScheduledHours: Record<string, number> = {};
  studyPlans.forEach(plan => {
    plan.plannedTasks.forEach(session => {
      // Count all scheduled sessions (including future ones) to determine total allocated time
      // Only exclude sessions that are explicitly marked as skipped
      if (session.status !== 'skipped') {
        taskScheduledHours[session.taskId] = (taskScheduledHours[session.taskId] || 0) + session.allocatedHours;
      }
    });
  });
  const unscheduledWarnings = getUnscheduledMinutesForTasks(tasks, taskScheduledHours, settings);

  // Helper function to convert minutes to hours and minutes
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours === 0) {
      return `${remainingMinutes}m`;
    } else if (remainingMinutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${remainingMinutes}m`;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'increase_hours':
        return <Clock className="w-3 h-3" />;
      case 'add_days':
        return <Calendar className="w-3 h-3" />;
      case 'extend_deadline':
        return <Calendar className="w-3 h-3" />;
      case 'reduce_buffer':
        return <Settings className="w-3 h-3" />;
      case 'reduce_estimated_hours':
        return <Target className="w-3 h-3" />;
      case 'adjust_deadline':
        return <Calendar className="w-3 h-3" />;
      case 'increase_daily_hours':
        return <Clock className="w-3 h-3" />;
      case 'adjust_days_buffer':
        return <Settings className="w-3 h-3" />;
      case 'switch_study_mode':
        return <Settings className="w-3 h-3" />;
      case 'prioritize_important':
        return <Star className="w-3 h-3" />;
      case 'urgent_important_warning':
        return <Zap className="w-3 h-3" />;
      default:
        return <Lightbulb className="w-3 h-3" />;
    }
  };

  const generateTaskSuggestions = (task: Task, unscheduledMinutes: number) => {
    const suggestions = [];
    
    // Check if this is an important but urgent task
    const daysUntilDeadline = Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const isImportantButUrgent = task.importance && daysUntilDeadline <= 3;
    const isUrgentButNotImportant = !task.importance && daysUntilDeadline <= 3;
    
    if (isImportantButUrgent) {
      suggestions.push({
        type: 'urgent_important_warning',
        message: `This important task is urgent (${daysUntilDeadline} days left). Consider prioritizing it over less important tasks.`,
      });
    }
    
    // Note: We'll handle urgent but not important warnings separately in the UI
    // instead of including them in the solutions grid
    
    // Reduce estimated hours
    if (task.estimatedHours > 1) {
      suggestions.push({
        type: 'reduce_estimated_hours',
        message: `Reduce the estimated hours for this task`,
        value: Math.max(1, task.estimatedHours - 1)
      });
    }
    
    // Adjust deadline
    suggestions.push({
      type: 'adjust_deadline',
      message: `Adjust the deadline to allow more time`,
      value: new Date(new Date(task.deadline).getTime() + 7 * 24 * 60 * 60 * 1000) // Add 1 week
    });
    
    // Increase daily hours
    suggestions.push({
      type: 'increase_daily_hours',
      message: `Increase your daily available study hours in Settings`,
      value: settings.dailyAvailableHours + 1
    });
    
    // Adjust days and buffer
    suggestions.push({
      type: 'adjust_days_buffer',
      message: `Adjust your available days and buffer days in Settings`,
      value: { workDays: [0, 1, 2, 3, 4, 5, 6], bufferDays: Math.max(0, settings.bufferDays - 1) }
    });
    
    // Switch study mode
    suggestions.push({
      type: 'switch_study_mode',
      message: `Consider switching Study Plan Mode in Settings`,
      value: settings.studyPlanMode === 'even' ? 'eisenhower' : 'even'
    });

    // Suggest completing or rescheduling other tasks
    suggestions.push({
      type: 'reschedule_others',
      message: `Try to complete or reschedule other tasks`,
    });
    
    return suggestions;
  };

  const generateGeneralSolutions = () => {
    const solutions = [];
    
    // Increase daily hours
    solutions.push({
      type: 'increase_daily_hours',
      message: `Increase your daily available study hours in Settings`,
      value: settings.dailyAvailableHours + 1
    });
    
    // Adjust days and buffer
    solutions.push({
      type: 'adjust_days_buffer',
      message: `Adjust your available days and buffer days in Settings`,
      value: { workDays: [0, 1, 2, 3, 4, 5, 6], bufferDays: Math.max(0, settings.bufferDays - 1) }
    });
    
    // Switch study mode
    solutions.push({
      type: 'switch_study_mode',
      message: `Consider switching Study Plan Mode in Settings`,
      value: settings.studyPlanMode === 'even' ? 'eisenhower' : 'even'
    });

    // Reduce estimated hours for tasks
    if (unscheduledWarnings.length > 0) {
      solutions.push({
        type: 'reduce_estimated_hours',
        message: `Reduce estimated hours for tasks that are too ambitious`,
      });
    }
    
    // Adjust deadlines
    solutions.push({
      type: 'adjust_deadline',
      message: `Extend deadlines for tasks to allow more time`,
    });

    // Complete or reschedule other tasks
    solutions.push({
      type: 'reschedule_others',
      message: `Try to complete or reschedule other tasks`,
    });
    
    return solutions;
  };

  return (
    <div className="flex justify-center">
      <div className="inline-block max-w-2xl bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3 mb-3 dark:from-yellow-900/20 dark:to-orange-900/20 dark:border-yellow-800">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1 bg-yellow-100 rounded-full dark:bg-yellow-800/30">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-200">
          Optimization Suggestions
        </h3>
      </div>
        </div>
        
        <div className="space-y-2">
        {/* Unscheduled hours warnings */}
        {unscheduledWarnings.length > 0 && (
          <div className="space-y-2">
              <h4 className="text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Scheduling Issues
              </h4>
              {unscheduledWarnings.map(warning => {
                const task = tasks.find(t => t.title === warning.taskTitle);
                
                return (
                  <div key={warning.taskTitle} className="bg-white border border-red-200 rounded p-2 dark:bg-gray-800 dark:border-red-700">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="p-1 bg-red-100 rounded-full dark:bg-red-800/30 flex-shrink-0">
                        <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="text-xs font-semibold text-red-800 dark:text-red-200 truncate">
                            Task "{warning.taskTitle}" cannot be fully scheduled
                          </h5>
                          {warning.importance && (
                            <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full dark:bg-yellow-900 dark:text-yellow-200 font-medium">
                              Important
                            </span>
                          )}
                          {/* Check if this is an urgent important task */}
                          {(() => {
                            const task = tasks.find(t => t.title === warning.taskTitle);
                            if (task) {
                              const daysUntilDeadline = Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                              if (task.importance && daysUntilDeadline <= 3) {
                                return (
                                  <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full dark:bg-orange-900 dark:text-orange-200 font-medium flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    Urgent
                                  </span>
                                );
                              } else if (!task.importance && daysUntilDeadline <= 3) {
                                return (
                                  <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-800 rounded-full dark:bg-gray-700 dark:text-gray-200 font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Urgent
                                  </span>
                                );
                              }
                            }
                            return null;
                          })()}
                        </div>
                        <p className="text-xs text-red-600 dark:text-red-300">
                          {formatTime(warning.unscheduledMinutes)} remain unscheduled until {new Date(warning.deadline).toLocaleDateString()}
                        </p>
                        {/* Show urgent but not important warning as subtext */}
                        {(() => {
                          const task = tasks.find(t => t.title === warning.taskTitle);
                          if (task) {
                            const daysUntilDeadline = Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            if (!task.importance && daysUntilDeadline <= 3) {
                              return (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                                  ⚠️ This task is urgent but not important ({daysUntilDeadline} days left). Consider if this time could be better spent on important tasks.
                                </p>
                              );
                            }
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
          
          {/* Existing suggestions */}
        {suggestions.map((suggestion, index) => (
            <div key={index} className="bg-white border border-yellow-200 rounded p-2 dark:bg-gray-800 dark:border-yellow-700">
            <div className="flex items-start gap-2 mb-2">
                <div className="p-1 bg-yellow-100 rounded-full dark:bg-yellow-800/30 flex-shrink-0">
                  <Lightbulb className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                  "{suggestion.taskTitle}" cannot be fully scheduled
                  </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                    {formatTime(suggestion.unscheduledMinutes)} unscheduled
                </p>
              </div>
            </div>
              <div className="ml-6 space-y-1">
              {suggestion.suggestions && suggestion.suggestions.map((s: any, sIndex: number) => (
                  <div key={sIndex} className="flex items-start gap-2 p-1 bg-gray-50 rounded dark:bg-gray-700">
                  {getIcon(s.type)}
                    <span className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                    {s.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {/* General Solutions Section */}
        {unscheduledWarnings.length > 0 && (
          <div className="mt-4 pt-3 border-t border-yellow-200 dark:border-yellow-700">
            <h4 className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 flex items-center gap-1 mb-2">
              <Lightbulb className="w-3 h-3" />
              General Solutions
            </h4>
            <div className="grid grid-cols-2 gap-1">
              {generateGeneralSolutions().map((solution, index) => (
                <div key={index} className="flex items-start gap-2 p-1 bg-white border border-yellow-200 rounded dark:bg-gray-800 dark:border-yellow-700">
                  {getIcon(solution.type)}
                  <span className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                    {solution.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default SuggestionsPanel; 