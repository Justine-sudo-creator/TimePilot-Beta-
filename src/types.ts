export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  importance: boolean; // true = Important, false = Not Important
  estimatedHours: number;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  subject?: string; // Optional for backward compatibility, can be removed if not used elsewhere
  category?: string;
  impact?: string;
  taskType?: string;
}

export interface StudySession {
  taskId: string;
  scheduledTime: string; // Keep for display purposes
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  allocatedHours: number;
  sessionNumber?: number; // For tracking multiple sessions of same task
  isFlexible?: boolean; // Can this session be moved around?
  isManualOverride?: boolean; // New property: true if manually edited
  done?: boolean; // New: true if session is marked as done
  status?: 'scheduled' | 'in_progress' | 'completed' | 'missed' | 'overdue' | 'rescheduled' | 'skipped'; // Session status including missed, skipped
  actualHours?: number; // New: actual hours spent (may differ from allocatedHours)
  completedAt?: string; // New: timestamp when session was completed
  // New properties for rescheduled sessions
  originalTime?: string; // Original start time (HH:MM format)
  originalDate?: string; // Original date (YYYY-MM-DD format)
  rescheduledAt?: string; // Timestamp when session was rescheduled
}

/**
 * IMPORTANT: Skipped sessions should be handled consistently across the application:
 * 
 * 1. Skipped sessions should NOT be included in:
 *    - Total study hours calculations
 *    - Session combination logic
 *    - Optimization suggestions
 *    - Calendar display (hidden)
 *    - Task completion calculations
 * 
 * 2. Skipped sessions should be preserved in:
 *    - Study plan data structure (for potential unskip functionality)
 *    - Session numbering (to maintain consistency)
 * 
 * 3. Use utility functions from scheduling.ts:
 *    - calculateTotalStudyHours() - for total hours excluding skipped
 *    - filterSkippedSessions() - for filtering out skipped sessions
 */
export interface StudyPlan {
  id: string;
  date: string;
  plannedTasks: StudySession[];
  totalStudyHours: number;
  availableHours: number; // How much time is actually available this day
  isOverloaded?: boolean; // Is this day too packed?
}

export interface UserSettings {
  dailyAvailableHours: number;
  workDays: number[]; // Days of week user wants to work (0=Sunday, 1=Monday, etc.)
  bufferDays: number; // How many days before deadline to finish tasks
  minSessionLength: number; // Minimum session length in minutes, default 15
  // New settings
  bufferTimeBetweenSessions: number; // Minutes of buffer between sessions
  shortBreakDuration: number; // Minutes for short breaks
  longBreakDuration: number; // Minutes for long breaks
  maxConsecutiveHours: number; // Maximum hours before requiring a long break
  studyWindowStartHour: number; // Earliest hour to start studying (0-23)
  studyWindowEndHour: number; // Latest hour to end studying (0-23)
  avoidTimeRanges: Array<{start: string, end: string}>; // Time ranges to avoid scheduling
  weekendStudyHours: number; // Hours available for weekend study
  autoCompleteSessions: boolean; // Auto-mark sessions as complete after timer
  enableNotifications: boolean; // Enable study reminders and notifications
  userPrefersPressure?: boolean; // User prefers pressure mode for scheduling
  studyStyle?: 'steady' | 'pressure'; // Study style preference
  studyPlanMode?: 'eisenhower' | 'even';
}

export interface TimerState {
  isRunning: boolean;
  currentTime: number;
  totalTime: number;
  currentTaskId: string | null;
}

export interface FixedCommitment {
  id: string;
  title: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
  type: 'class' | 'work' | 'appointment' | 'other' | 'buffer';
  location?: string;
  description?: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: 'study' | 'commitment';
    data: StudySession | FixedCommitment;
    taskId?: string;
    planDate?: string; // For study sessions, which plan date they belong to
  };
}

export interface TaskProgress {
  taskId: string;
  completedHours: number;
  totalHours: number;
  sessionsCompleted: number;
  lastWorkedOn?: string; // Date string
}

export interface SmartSuggestion {
  type: 'warning' | 'suggestion' | 'celebration';
  message: string;
  action?: string;
  taskId?: string;
}

export interface UserReschedule {
  id: string; // Unique identifier for this reschedule
  originalSessionId: string; // taskId-sessionNumber combination
  originalPlanDate: string; // Original date (YYYY-MM-DD)
  originalStartTime: string; // Original start time (HH:MM)
  originalEndTime: string; // Original end time (HH:MM)
  newPlanDate: string; // New date (YYYY-MM-DD)
  newStartTime: string; // New start time (HH:MM)
  newEndTime: string; // New end time (HH:MM)
  rescheduledAt: string; // Timestamp when rescheduled
  status: 'active' | 'obsolete'; // Whether this reschedule is still valid
  taskId: string; // Reference to the task
  sessionNumber?: number; // Session number for tracking
}