import React from 'react';
import { Lightbulb, AlertTriangle, Clock, Calendar, Settings, Target, Star, Zap, TrendingUp, Users, Calendar as CalendarIcon } from 'lucide-react';
import { getAccurateUnscheduledTasks, createNotificationSummary, UnscheduledTaskNotification } from '../utils/enhanced-notifications';
import { Task, StudyPlan, UserSettings, FixedCommitment } from '../types';

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
  // Use enhanced notification system for accurate unscheduled detection
  const unscheduledTasks = getAccurateUnscheduledTasks(tasks, studyPlans, settings);
  const notificationSummary = createNotificationSummary(unscheduledTasks);

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
      case 'increase_daily_hours':
        return <Clock className="w-3 h-3" />;
      case 'add_work_days':
        return <Calendar className="w-3 h-3" />;
      case 'extend_deadline':
        return <CalendarIcon className="w-3 h-3" />;
      case 'reduce_buffer':
        return <Settings className="w-3 h-3" />;
      case 'reduce_estimated_hours':
        return <Target className="w-3 h-3" />;
      case 'prioritize_task':
        return <Star className="w-3 h-3" />;
      case 'split_task':
        return <TrendingUp className="w-3 h-3" />;
      case 'delegate_task':
        return <Users className="w-3 h-3" />;
      default:
        return <Lightbulb className="w-3 h-3" />;
    }
  };
  
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-600 dark:text-red-400';
      case 'high': return 'text-orange-600 dark:text-orange-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };
  
  const getUrgencyBg = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700';
      case 'high': return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700';
      case 'medium': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700';
      default: return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700';
    }
  };

  // Don't show if no unscheduled tasks
  if (unscheduledTasks.length === 0) return null;
  
  return (
    <div className="flex justify-center">
      <div className="inline-block max-w-2xl bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4 dark:from-blue-900/20 dark:to-purple-900/20 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-blue-100 rounded-full dark:bg-blue-800/30">
            <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-blue-800 dark:text-blue-200">
              Study Plan Optimization
            </h3>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              {notificationSummary.totalUnscheduledTasks} task{notificationSummary.totalUnscheduledTasks > 1 ? 's' : ''} • {formatTime(notificationSummary.totalUnscheduledMinutes)} unscheduled
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          {/* Enhanced unscheduled task notifications */}
          {unscheduledTasks.map((taskNotification, index) => {
            const daysUntilDeadline = Math.ceil((new Date(taskNotification.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            
            return (
              <div key={taskNotification.taskId} className={`border rounded-lg p-3 ${getUrgencyBg(taskNotification.urgencyLevel)}`}>
                <div className="flex items-start gap-3 mb-2">
                  <div className={`p-1 rounded-full flex-shrink-0 ${
                    taskNotification.urgencyLevel === 'critical' ? 'bg-red-100 dark:bg-red-800/30' :
                    taskNotification.urgencyLevel === 'high' ? 'bg-orange-100 dark:bg-orange-800/30' :
                    taskNotification.urgencyLevel === 'medium' ? 'bg-yellow-100 dark:bg-yellow-800/30' :
                    'bg-blue-100 dark:bg-blue-800/30'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 ${getUrgencyColor(taskNotification.urgencyLevel)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h5 className={`text-sm font-semibold truncate ${getUrgencyColor(taskNotification.urgencyLevel)}`}>
                        {taskNotification.taskTitle}
                      </h5>
                      {taskNotification.importance && (
                        <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full dark:bg-purple-900 dark:text-purple-200 font-medium">
                          Important
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        taskNotification.urgencyLevel === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        taskNotification.urgencyLevel === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                        taskNotification.urgencyLevel === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {taskNotification.urgencyLevel.charAt(0).toUpperCase() + taskNotification.urgencyLevel.slice(1)}
                      </span>
                      {taskNotification.category && (
                        <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded dark:bg-gray-700 dark:text-gray-300">
                          {taskNotification.category}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      <span className="font-medium">{formatTime(taskNotification.unscheduledMinutes)}</span> unscheduled of {formatTime(taskNotification.estimatedHours * 60)} total
                      <span className="mx-2">•</span>
                      <span className={daysUntilDeadline <= 0 ? 'text-red-600 dark:text-red-400 font-medium' : 
                                     daysUntilDeadline <= 1 ? 'text-orange-600 dark:text-orange-400 font-medium' :
                                     daysUntilDeadline <= 3 ? 'text-yellow-600 dark:text-yellow-400' : ''}>
                        {daysUntilDeadline <= 0 ? 'Overdue' : 
                         daysUntilDeadline === 1 ? 'Due tomorrow' :
                         `${daysUntilDeadline} days left`}
                      </span>
                    </div>
                    
                    {/* Quick actions for urgent tasks */}
                    {taskNotification.urgencyLevel === 'critical' && (
                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                        <span className="font-medium">⚠️ Urgent Action Required:</span> This task needs immediate attention or deadline extension.
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Top suggestions */}
                <div className="ml-8 space-y-1">
                  <h6 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Quick Solutions:</h6>
                  {taskNotification.suggestions.slice(0, 2).map((suggestion, sIndex) => (
                    <div key={sIndex} className="flex items-start gap-2 p-1.5 bg-white/50 rounded text-xs dark:bg-gray-800/50">
                      {getIcon(suggestion.type)}
                      <span className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {suggestion.message}
                      </span>
                      <span className={`ml-auto px-1.5 py-0.5 rounded text-xs font-medium ${
                        suggestion.impact === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                        suggestion.impact === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {suggestion.impact} impact
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {/* Summary and general recommendations */}
          {notificationSummary.recommendedActions.length > 0 && (
            <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
              <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1 mb-2">
                <Target className="w-4 h-4" />
                Recommended Actions
              </h4>
              <div className="space-y-1">
                {notificationSummary.recommendedActions.map((action, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-white/70 border border-blue-200 rounded text-sm dark:bg-gray-800/70 dark:border-blue-700">
                    <Zap className="w-3 h-3 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <span className="text-blue-700 dark:text-blue-300 leading-relaxed">
                      {action}
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
