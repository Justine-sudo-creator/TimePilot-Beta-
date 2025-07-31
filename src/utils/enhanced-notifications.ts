import { Task, StudyPlan, StudySession, UserSettings } from '../types';
import { checkSessionStatus } from './scheduling';

/**
 * Enhanced notification system that provides accurate unscheduled session detection
 * and improved optimization suggestions
 */

export interface UnscheduledTaskNotification {
  taskTitle: string;
  taskId: string;
  unscheduledMinutes: number;
  estimatedHours: number;
  scheduledHours: number;
  importance: boolean;
  deadline: string;
  category?: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  suggestions: OptimizationSuggestion[];
}

export interface OptimizationSuggestion {
  type: 'increase_daily_hours' | 'add_work_days' | 'extend_deadline' | 'reduce_buffer' | 'reduce_estimated_hours' | 'prioritize_task' | 'split_task' | 'delegate_task';
  message: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'easy' | 'moderate' | 'difficult';
  value?: any;
}

export interface NotificationSummary {
  totalUnscheduledTasks: number;
  totalUnscheduledMinutes: number;
  criticalTasks: number;
  highPriorityTasks: number;
  hasOverdueDeadlines: boolean;
  recommendedActions: string[];
}

/**
 * Calculates truly unscheduled hours from actual study plan generation
 * Excludes missed, skipped, and rescheduled sessions from the calculation
 */
export function getAccurateUnscheduledTasks(
  tasks: Task[],
  studyPlans: StudyPlan[],
  settings: UserSettings
): UnscheduledTaskNotification[] {
  const today = new Date().toISOString().split('T')[0];
  const unscheduledTasks: UnscheduledTaskNotification[] = [];

  // Calculate scheduled hours per task from ONLY originally scheduled sessions
  const taskScheduledHours: Record<string, number> = {};
  
  studyPlans.forEach(plan => {
    plan.plannedTasks.forEach(session => {
      // Only count sessions that were originally scheduled (not redistributed)
      // and are not skipped
      if (session.status !== 'skipped' && !isRedistributedSession(session)) {
        taskScheduledHours[session.taskId] = (taskScheduledHours[session.taskId] || 0) + session.allocatedHours;
      }
    });
  });

  // Check each pending task for unscheduled time
  const pendingTasks = tasks.filter(task => task.status === 'pending' && task.estimatedHours > 0);
  
  pendingTasks.forEach(task => {
    const scheduledHours = taskScheduledHours[task.id] || 0;
    const unscheduledHours = Math.max(0, task.estimatedHours - scheduledHours);
    
    // Only consider significant unscheduled time (more than 15 minutes)
    if (unscheduledHours > 0.25) {
      const unscheduledMinutes = Math.round(unscheduledHours * 60);
      const urgencyLevel = calculateUrgencyLevel(task, unscheduledHours);
      const suggestions = generateOptimizationSuggestions(task, unscheduledHours, settings);
      
      unscheduledTasks.push({
        taskTitle: task.title,
        taskId: task.id,
        unscheduledMinutes,
        estimatedHours: task.estimatedHours,
        scheduledHours,
        importance: task.importance,
        deadline: task.deadline,
        category: task.category,
        urgencyLevel,
        suggestions
      });
    }
  });

  return unscheduledTasks.sort((a, b) => {
    // Sort by urgency level and importance
    const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const aUrgency = urgencyOrder[a.urgencyLevel];
    const bUrgency = urgencyOrder[b.urgencyLevel];
    
    if (aUrgency !== bUrgency) return bUrgency - aUrgency;
    if (a.importance !== b.importance) return a.importance ? -1 : 1;
    return a.unscheduledMinutes - b.unscheduledMinutes;
  });
}

/**
 * Determines if a session was redistributed (missed session that was moved)
 */
function isRedistributedSession(session: StudySession): boolean {
  // Check if session has redistribution metadata
  if (session.schedulingMetadata?.rescheduleHistory.length) {
    return session.schedulingMetadata.rescheduleHistory.some(
      history => history.reason === 'redistribution' || history.reason === 'missed'
    );
  }
  
  // Legacy check for redistributed sessions
  return !!(session.originalTime && session.originalDate);
}

/**
 * Calculates urgency level based on deadline and unscheduled time
 */
function calculateUrgencyLevel(task: Task, unscheduledHours: number): 'low' | 'medium' | 'high' | 'critical' {
  const now = new Date();
  const deadline = new Date(task.deadline);
  const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const unscheduledPercentage = unscheduledHours / task.estimatedHours;

  // Critical: Overdue or due today with significant unscheduled work
  if (daysUntilDeadline <= 0 || (daysUntilDeadline <= 1 && unscheduledPercentage > 0.5)) {
    return 'critical';
  }
  
  // High: Due within 3 days with substantial unscheduled work
  if (daysUntilDeadline <= 3 && (unscheduledPercentage > 0.3 || task.importance)) {
    return 'high';
  }
  
  // Medium: Due within a week with moderate unscheduled work
  if (daysUntilDeadline <= 7 && unscheduledPercentage > 0.2) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Generates optimization suggestions based on task and settings
 */
function generateOptimizationSuggestions(
  task: Task,
  unscheduledHours: number,
  settings: UserSettings
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  const daysUntilDeadline = Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  // Increase daily hours (if reasonable)
  if (settings.dailyAvailableHours < 12) {
    suggestions.push({
      type: 'increase_daily_hours',
      message: `Increase daily study hours to ${settings.dailyAvailableHours + 1}h`,
      impact: 'high',
      effort: 'moderate',
      value: settings.dailyAvailableHours + 1
    });
  }

  // Add work days (if not already 7 days)
  if (settings.workDays.length < 7) {
    const missingDays = [0, 1, 2, 3, 4, 5, 6].filter(day => !settings.workDays.includes(day));
    suggestions.push({
      type: 'add_work_days',
      message: `Add ${missingDays.length > 1 ? 'weekend days' : 'another day'} to your work schedule`,
      impact: 'medium',
      effort: 'easy',
      value: [...settings.workDays, ...missingDays.slice(0, 1)]
    });
  }

  // Extend deadline (if urgent)
  if (daysUntilDeadline <= 7) {
    const newDeadline = new Date(task.deadline);
    newDeadline.setDate(newDeadline.getDate() + 3);
    suggestions.push({
      type: 'extend_deadline',
      message: `Extend deadline by 3 days if possible`,
      impact: 'high',
      effort: 'easy',
      value: newDeadline.toISOString()
    });
  }

  // Reduce buffer days
  if (settings.bufferDays > 0) {
    suggestions.push({
      type: 'reduce_buffer',
      message: `Reduce buffer days from ${settings.bufferDays} to ${settings.bufferDays - 1}`,
      impact: 'medium',
      effort: 'easy',
      value: settings.bufferDays - 1
    });
  }

  // Reduce estimated hours (if overestimated)
  if (task.estimatedHours > 2) {
    suggestions.push({
      type: 'reduce_estimated_hours',
      message: `Consider if ${task.estimatedHours}h is overestimated`,
      impact: 'medium',
      effort: 'easy',
      value: Math.max(1, task.estimatedHours - 1)
    });
  }

  // Prioritize important tasks
  if (task.importance && daysUntilDeadline <= 5) {
    suggestions.push({
      type: 'prioritize_task',
      message: 'Focus on this important task first',
      impact: 'high',
      effort: 'easy'
    });
  }

  // Split large tasks
  if (task.estimatedHours > 6) {
    suggestions.push({
      type: 'split_task',
      message: 'Consider breaking this into smaller sub-tasks',
      impact: 'medium',
      effort: 'moderate'
    });
  }

  return suggestions.slice(0, 3); // Return top 3 suggestions
}

/**
 * Creates a summary of all unscheduled notifications
 */
export function createNotificationSummary(
  unscheduledTasks: UnscheduledTaskNotification[]
): NotificationSummary {
  const totalUnscheduledMinutes = unscheduledTasks.reduce((sum, task) => sum + task.unscheduledMinutes, 0);
  const criticalTasks = unscheduledTasks.filter(task => task.urgencyLevel === 'critical').length;
  const highPriorityTasks = unscheduledTasks.filter(task => task.urgencyLevel === 'high').length;
  const hasOverdueDeadlines = unscheduledTasks.some(task => new Date(task.deadline) < new Date());

  const recommendedActions: string[] = [];
  
  if (criticalTasks > 0) {
    recommendedActions.push(`Address ${criticalTasks} critical task${criticalTasks > 1 ? 's' : ''} immediately`);
  }
  
  if (highPriorityTasks > 0) {
    recommendedActions.push(`Review ${highPriorityTasks} high-priority task${highPriorityTasks > 1 ? 's' : ''}`);
  }
  
  if (totalUnscheduledMinutes > 120) {
    recommendedActions.push('Consider increasing daily study hours');
  }
  
  if (hasOverdueDeadlines) {
    recommendedActions.push('Extend overdue deadlines if possible');
  }

  return {
    totalUnscheduledTasks: unscheduledTasks.length,
    totalUnscheduledMinutes,
    criticalTasks,
    highPriorityTasks,
    hasOverdueDeadlines,
    recommendedActions
  };
}

/**
 * Determines if notifications should be shown based on unscheduled tasks
 */
export function shouldShowNotifications(unscheduledTasks: UnscheduledTaskNotification[]): boolean {
  return unscheduledTasks.length > 0 && unscheduledTasks.some(task => task.urgencyLevel !== 'low');
}

/**
 * Gets the notification priority level for UI styling
 */
export function getNotificationPriority(unscheduledTasks: UnscheduledTaskNotification[]): 'low' | 'medium' | 'high' | 'critical' {
  if (unscheduledTasks.some(task => task.urgencyLevel === 'critical')) return 'critical';
  if (unscheduledTasks.some(task => task.urgencyLevel === 'high')) return 'high';
  if (unscheduledTasks.some(task => task.urgencyLevel === 'medium')) return 'medium';
  return 'low';
}
