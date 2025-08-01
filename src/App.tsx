import { useState, useEffect } from 'react';
import { Calendar, CheckSquare, Clock, Settings as SettingsIcon, BarChart3, CalendarDays, Lightbulb, Edit, Trash2, Menu, X, HelpCircle } from 'lucide-react';
import { Task, StudyPlan, UserSettings, FixedCommitment, StudySession, TimerState } from './types';
import { generateNewStudyPlan, getUnscheduledMinutesForTasks, getLocalDateString, redistributeAfterTaskDeletion, redistributeMissedSessionsWithFeedback, checkCommitmentConflicts } from './utils/scheduling';

import Dashboard from './components/Dashboard';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import StudyPlanView from './components/StudyPlanView';
import StudyTimer from './components/StudyTimer';
import Settings from './components/Settings';
import CalendarView from './components/CalendarView';
import FixedCommitmentInput from './components/FixedCommitmentInput';
import FixedCommitmentEdit from './components/FixedCommitmentEdit';
import SuggestionsPanel from './components/SuggestionsPanel';
import InteractiveTutorial from './components/InteractiveTutorial';
import TutorialButton from './components/TutorialButton';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'plan' | 'timer' | 'calendar' | 'commitments' | 'settings'>('dashboard');
    const [tasks, setTasks] = useState<Task[]>(() => {
        const saved = localStorage.getItem('timepilot-tasks');
        try {
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });
    const [studyPlans, setStudyPlans] = useState<StudyPlan[]>(() => {
        const saved = localStorage.getItem('timepilot-studyPlans');
        try {
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });
    const [currentTask, setCurrentTask] = useState<Task | null>(null);
    const [currentSession, setCurrentSession] = useState<{ allocatedHours: number; planDate?: string; sessionNumber?: number } | null>(null);
    const [fixedCommitments, setFixedCommitments] = useState<FixedCommitment[]>(() => {
        const saved = localStorage.getItem('timepilot-commitments');
        try {
            const parsed = saved ? JSON.parse(saved) : [];
            if (Array.isArray(parsed)) {
                // Migrate existing commitments to include recurring field
                return parsed.map((commitment: any) => {
                    if (commitment.recurring === undefined) {
                        // Legacy commitment - assume it's recurring and migrate
                        return {
                            ...commitment,
                            recurring: true,
                            specificDates: commitment.specificDates || []
                        };
                    }
                    return commitment;
                });
            }
            return [];
        } catch {
            return [];
        }
    });
    const [settings, setSettings] = useState<UserSettings>(() => {
        const saved = localStorage.getItem('timepilot-settings');
        try {
            const parsed = saved ? JSON.parse(saved) : null;
            // Remove breakDuration and preferredSessionLength from default/parsed settings
            const defaultSettings = {
                dailyAvailableHours: 6,
                workDays: [0, 1, 2, 3, 4, 5, 6],
                bufferDays: 0,
                minSessionLength: 15
            };
            return parsed && typeof parsed === 'object'
                ? { ...defaultSettings, ...parsed, breakDuration: undefined, preferredSessionLength: undefined } // Ensure they are removed even if present in old localStorage
                : defaultSettings;
        } catch {
            return {
                dailyAvailableHours: 6,
                workDays: [0, 1, 2, 3, 4, 5, 6],
                bufferDays: 0,
                minSessionLength: 15
            };
        }
    });
    const [, setIsPlanStale] = useState(false);
    const [, setLastPlanStaleReason] = useState<"settings" | "commitment" | "task" | null>(null);
    const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
    const [hasFirstChangeOccurred, setHasFirstChangeOccurred] = useState(false);


    // Add state to track last-timed session and ready-to-mark-done
    const [lastTimedSession, setLastTimedSession] = useState<{ planDate: string; sessionNumber: number } | null>(null);
    const [editingCommitment, setEditingCommitment] = useState<FixedCommitment | null>(null);
    
    // Global timer state that persists across tab switches
    const [globalTimer, setGlobalTimer] = useState<TimerState>({
        isRunning: false,
        currentTime: 0,
        totalTime: 0,
        currentTaskId: null
    });

    // Dark mode state
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('timepilot-darkMode');
        return saved ? JSON.parse(saved) : false;
    });

    const [showTaskInput, setShowTaskInput] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
    const [autoRemovedTasks, setAutoRemovedTasks] = useState<string[]>([]);
    const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);

    // Onboarding tutorial state
    const [showInteractiveTutorial, setShowInteractiveTutorial] = useState(false);
    const [highlightedTab, setHighlightedTab] = useState<string | null>(null);
    const [highlightStudyPlanMode, setHighlightStudyPlanMode] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showGCashModal, setShowGCashModal] = useState(false);


    useEffect(() => {
        localStorage.setItem('timepilot-darkMode', JSON.stringify(darkMode));
    }, [darkMode]);

    // Persist user reschedules to localStorage
    useEffect(() => {
        // Removed userReschedules persistence
    }, []);

    // Apply user reschedules when the app loads (initial load only)
    useEffect(() => {
        // Removed user reschedules application
    }, [hasLoadedFromStorage, studyPlans]);

    // Timer countdown effect
    useEffect(() => {
        let interval: number | undefined;
        
        if (globalTimer.isRunning && globalTimer.currentTime > 0) {
            interval = window.setInterval(() => {
                setGlobalTimer(prev => ({
                    ...prev,
                    currentTime: prev.currentTime - 1
                }));
            }, 1000);
        } else if (globalTimer.currentTime === 0 && globalTimer.isRunning) {
            // Timer completed - just stop it, don't automatically mark as done
            setGlobalTimer(prev => ({ ...prev, isRunning: false }));
        }

        return () => clearInterval(interval);
    }, [globalTimer.isRunning, globalTimer.currentTime, globalTimer.totalTime, currentTask]);

    useEffect(() => {
        try {
            const savedTasks = localStorage.getItem('timepilot-tasks');
            const savedSettings = localStorage.getItem('timepilot-settings');
            const savedCommitments = localStorage.getItem('timepilot-commitments');
            const savedStudyPlans = localStorage.getItem('timepilot-studyPlans');

            // Prepare initial state
            let initialTasks: Task[] = [];
            let initialSettings: UserSettings = {
                dailyAvailableHours: 6,
                workDays: [1, 2, 3, 4, 5, 6],
                bufferDays: 0,
                minSessionLength: 15,
                bufferTimeBetweenSessions: 0,
                studyWindowStartHour: 6,
                studyWindowEndHour: 23,
                shortBreakDuration: 5,
                longBreakDuration: 15,
                maxConsecutiveHours: 4,
                avoidTimeRanges: [],
                weekendStudyHours: 4,
                autoCompleteSessions: false,
                enableNotifications: true,
                userPrefersPressure: false,
                studyPlanMode: 'even', // Set default to 'even'
            };
            let initialCommitments: FixedCommitment[] = [];
            let initialStudyPlans: StudyPlan[] = [];

            if (savedTasks) {
                const parsedTasks = JSON.parse(savedTasks);
                if (Array.isArray(parsedTasks)) initialTasks = parsedTasks;
            }

            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                if (parsedSettings && typeof parsedSettings === 'object') {
                    // Filter out removed settings
                    initialSettings = {
                        dailyAvailableHours: parsedSettings.dailyAvailableHours || 6,
                        workDays: parsedSettings.workDays || [1, 2, 3, 4, 5, 6],
                        bufferDays: parsedSettings.bufferDays || 0,
                        minSessionLength: parsedSettings.minSessionLength || 15,
                        bufferTimeBetweenSessions: parsedSettings.bufferTimeBetweenSessions ?? 0,
                        studyWindowStartHour: parsedSettings.studyWindowStartHour || 6,
                        studyWindowEndHour: parsedSettings.studyWindowEndHour || 23,
                        shortBreakDuration: parsedSettings.shortBreakDuration || 5,
                        longBreakDuration: parsedSettings.longBreakDuration || 15,
                        maxConsecutiveHours: parsedSettings.maxConsecutiveHours || 4,
                        avoidTimeRanges: parsedSettings.avoidTimeRanges || [],
                        weekendStudyHours: parsedSettings.weekendStudyHours || 4,
                        autoCompleteSessions: parsedSettings.autoCompleteSessions || false,
                        enableNotifications: parsedSettings.enableNotifications !== false,
                        userPrefersPressure: parsedSettings.userPrefersPressure || false,
                        studyPlanMode: parsedSettings.studyPlanMode || 'even', // Default to 'even' if not set
                    };
                }
            }

            if (savedCommitments) {
                const parsedCommitments = JSON.parse(savedCommitments);
                if (Array.isArray(parsedCommitments)) initialCommitments = parsedCommitments;
            }

            if (savedStudyPlans) {
                const parsedStudyPlans = JSON.parse(savedStudyPlans);
                if (Array.isArray(parsedStudyPlans)) initialStudyPlans = parsedStudyPlans;
            }

            // Set all state in one batch
            setTasks(initialTasks);
            setSettings(initialSettings);
            setFixedCommitments(initialCommitments);
            setStudyPlans(initialStudyPlans);
            setIsPlanStale(false); // Mark plan as not stale on initial load
            setHasLoadedFromStorage(true); // Mark that initial load is complete
            setHasFirstChangeOccurred(false); // Reset first change flag
        } catch (e) {
            setTasks([]);
            setSettings({
                dailyAvailableHours: 6,
                workDays: [1, 2, 3, 4, 5, 6],
                bufferDays: 0,
                minSessionLength: 15,
                bufferTimeBetweenSessions: 0,
                studyWindowStartHour: 6,
                studyWindowEndHour: 23,
                shortBreakDuration: 5,
                longBreakDuration: 15,
                maxConsecutiveHours: 4,
                avoidTimeRanges: [],
                weekendStudyHours: 4,
                autoCompleteSessions: false,
                enableNotifications: true,
                userPrefersPressure: false,
                studyPlanMode: 'even', // Set default to 'even'
            });
            setFixedCommitments([]);
            setStudyPlans([]);
            setIsPlanStale(false); // Mark plan as not stale on initial load (even on error)
            setHasLoadedFromStorage(true); // Mark that initial load is complete
            setHasFirstChangeOccurred(false); // Reset first change flag
        }
    }, []);

    // Save data to localStorage whenever tasks or settings change
    useEffect(() => {
        localStorage.setItem('timepilot-tasks', JSON.stringify(tasks));
    }, [tasks]);

    useEffect(() => {
        localStorage.setItem('timepilot-settings', JSON.stringify(settings));
    }, [settings]);

    useEffect(() => {
        localStorage.setItem('timepilot-commitments', JSON.stringify(fixedCommitments));
    }, [fixedCommitments]);

    useEffect(() => {
        localStorage.setItem('timepilot-studyPlans', JSON.stringify(studyPlans));
    }, [studyPlans]);

    // Mark plan as stale when tasks, settings, or commitments change (but not on initial load)
    useEffect(() => {
        if (!hasLoadedFromStorage) return;
        if (!hasFirstChangeOccurred) {
            setHasFirstChangeOccurred(true);
            return;
        }
        // Only set isPlanStale if there are tasks and commitments
        if (tasks.length > 0 && fixedCommitments.length > 0) {
            setIsPlanStale(true);
        } else {
            setIsPlanStale(false);
        }
    }, [tasks, settings, fixedCommitments, hasLoadedFromStorage]);

    // Manual study plan generation handler
    const handleGenerateStudyPlan = () => {
        if (tasks.length > 0) {
            // Check if there are manually rescheduled sessions that will be affected
            const hasManualReschedules = studyPlans.some(plan => 
                plan.plannedTasks.some(session => 
                    session.originalTime && session.originalDate && session.isManualOverride
                )
            );

            if (hasManualReschedules) {
                const shouldPreserveReschedules = window.confirm(
                    "You have manually rescheduled sessions. Regenerating the study plan will move them back to their original times. Would you like to preserve your manual reschedules?"
                );
                
                if (shouldPreserveReschedules) {
                    // Generate plan but preserve manual reschedules
                    const result = generateNewStudyPlan(tasks, settings, fixedCommitments, studyPlans);
                    const newPlans = result.plans;
                    
                    // Enhanced preservation logic
                    newPlans.forEach(plan => {
                        const prevPlan = studyPlans.find(p => p.date === plan.date);
                        if (!prevPlan) return;
                        
                        plan.plannedTasks.forEach(session => {
                            const prevSession = prevPlan.plannedTasks.find(s => 
                                s.taskId === session.taskId && s.sessionNumber === session.sessionNumber
                            );
                            if (prevSession) {
                                // Preserve done sessions
                                if (prevSession.done) {
                                    session.done = true;
                                    session.status = prevSession.status;
                                    session.actualHours = prevSession.actualHours;
                                    session.completedAt = prevSession.completedAt;
                                }
                                // Preserve skipped sessions
                                else if (prevSession.status === 'skipped') {
                                    session.status = 'skipped';
                                }
                                // Preserve manual reschedules with their new times
                                else if (prevSession.originalTime && prevSession.originalDate && prevSession.isManualOverride) {
                                    session.originalTime = prevSession.originalTime;
                                    session.originalDate = prevSession.originalDate;
                                    session.rescheduledAt = prevSession.rescheduledAt;
                                    session.isManualOverride = prevSession.isManualOverride;
                                    // Keep the rescheduled times
                                    session.startTime = prevSession.startTime;
                                    session.endTime = prevSession.endTime;
                                    // Move session to the rescheduled date if different
                                    if (prevSession.originalDate !== plan.date) {
                                        const targetPlan = newPlans.find(p => p.date === prevSession.originalDate);
                                        if (targetPlan) {
                                            targetPlan.plannedTasks.push(session);
                                            plan.plannedTasks = plan.plannedTasks.filter(s => s !== session);
                                        }
                                    }
                                }
                            }
                        });
                    });
                    
                    setStudyPlans(newPlans);
                    setLastPlanStaleReason("task");
                    return;
                }
            }

            // Generate new study plan with existing plans for progress calculation and missed session redistribution
            const result = generateNewStudyPlan(tasks, settings, fixedCommitments, studyPlans);
            const newPlans = result.plans;
            
            // Preserve session status from previous plan
            newPlans.forEach(plan => {
                const prevPlan = studyPlans.find(p => p.date === plan.date);
                if (!prevPlan) return;
                
                // Preserve session status and properties
                plan.plannedTasks.forEach(session => {
                    const prevSession = prevPlan.plannedTasks.find(s => s.taskId === session.taskId && s.sessionNumber === session.sessionNumber);
                    if (prevSession) {
                        // Preserve done sessions
                        if (prevSession.done) {
                            session.done = true;
                            session.status = prevSession.status;
                            session.actualHours = prevSession.actualHours;
                            session.completedAt = prevSession.completedAt;
                        }
                        // Preserve skipped sessions
                        else if (prevSession.status === 'skipped') {
                            session.status = 'skipped';
                        }
                        // Preserve rescheduled sessions (but allow regeneration of times)
                        else if (prevSession.originalTime && prevSession.originalDate) {
                            session.originalTime = prevSession.originalTime;
                            session.originalDate = prevSession.originalDate;
                            session.rescheduledAt = prevSession.rescheduledAt;
                            session.isManualOverride = prevSession.isManualOverride;
                        }
                    }
                });
            });
            
            setStudyPlans(newPlans);
            setLastPlanStaleReason("task");
        }
    };

    // Handle redistribution of missed sessions specifically
    const handleRedistributeMissedSessions = () => {
        if (tasks.length > 0) {
            // Use enhanced redistribution with detailed feedback
            const { updatedPlans, feedback } = redistributeMissedSessionsWithFeedback(studyPlans, settings, fixedCommitments, tasks);
            
            if (feedback.success) {
                setStudyPlans(updatedPlans);
                setNotificationMessage(feedback.message);
                
                // Log detailed information for debugging
                console.log('Redistribution details:', feedback.details);
            } else {
                setNotificationMessage(feedback.message);
                
                // Log conflicts and issues for debugging
                if (feedback.details.conflictsDetected || feedback.details.issues.length > 0 || feedback.details.remainingMissed > 0) {
                    console.warn('Redistribution issues detected:', {
                        totalMissed: feedback.details.totalMissed,
                        successfullyMoved: feedback.details.successfullyMoved,
                        failedToMove: feedback.details.failedToMove,
                        remainingMissed: feedback.details.remainingMissed,
                        conflictsDetected: feedback.details.conflictsDetected,
                        issues: feedback.details.issues,
                        suggestions: feedback.details.suggestions
                    });
                }
            }
        }
    };

    const handleDismissAutoRemovedTask = (taskTitle: string) => {
      setAutoRemovedTasks(prev => prev.filter(title => title !== taskTitle));
    };

    const handleAddTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
        const newTask: Task = {
            ...taskData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString()
        };
        let updatedTasks = [...tasks, newTask];
        // Generate a study plan with the new task
        let { plans } = generateNewStudyPlan(updatedTasks, settings, fixedCommitments, studyPlans);
        // Check if the new task can actually be scheduled by examining the study plan
        const { plans: newPlans } = generateNewStudyPlan(updatedTasks, settings, fixedCommitments, studyPlans);
        
        // Check if the new task has any unscheduled time (excluding skipped sessions)
        const newTaskScheduledHours: Record<string, number> = {};
        newPlans.forEach(plan => {
          plan.plannedTasks.forEach(session => {
            // Skip sessions that are marked as skipped - they shouldn't count towards scheduled hours
            if (session.status !== 'skipped') {
              newTaskScheduledHours[session.taskId] = (newTaskScheduledHours[session.taskId] || 0) + session.allocatedHours;
            }
          });
        });
        
        const newTaskScheduled = newTaskScheduledHours[newTask.id] || 0;
        
        // More reasonable feasibility check:
        // Only block if the task is completely unscheduled OR if more than 50% is unscheduled
        const totalTaskHours = newTask.estimatedHours;
        const scheduledPercentage = totalTaskHours > 0 ? (newTaskScheduled / totalTaskHours) * 100 : 0;
        const isCompletelyUnscheduled = newTaskScheduled === 0;
        const isMostlyUnscheduled = scheduledPercentage < 50;
        
        const blocksNewTask = isCompletelyUnscheduled || isMostlyUnscheduled;
        
        if (blocksNewTask) {
            const reason = isCompletelyUnscheduled 
                ? "cannot be scheduled at all"
                : `can only be ${scheduledPercentage.toFixed(0)}% scheduled`;
                
            setNotificationMessage(
              `Task "${newTask.title}" ${reason} with your current settings.\n` +
              `Try one or more of the following:\n` +
              `• Reduce the estimated hours for this task\n` +
              `• Adjust the deadline to allow more time\n` +
              `• Increase your daily available study hours in Settings\n` +
              `• Remove or reschedule other tasks\n` +
              `• Adjust your study window hours in Settings\n`
            );
            setTasks(tasks);
            const { plans: restoredPlans } = generateNewStudyPlan(tasks, settings, fixedCommitments, studyPlans);
            setStudyPlans(restoredPlans);
            setShowTaskInput(false);
            setLastPlanStaleReason("task");
            return;
        }
        setTasks(updatedTasks);
        setStudyPlans(plans);
        setShowTaskInput(false);
        setLastPlanStaleReason("task");
    };

    const handleAddFixedCommitment = (commitmentData: Omit<FixedCommitment, 'id' | 'createdAt'>) => {
        const newCommitment: FixedCommitment = {
            ...commitmentData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString()
        };
        // Handle override logic for commitments
        let updatedCommitments = [...fixedCommitments];
        
        if (!newCommitment.recurring && newCommitment.specificDates) {
            // For one-time commitments, check if they conflict with recurring commitments
            const conflicts = checkCommitmentConflicts(newCommitment, fixedCommitments);
            
            if (conflicts.hasConflict && conflicts.conflictType === 'override' && conflicts.conflictingCommitment) {
                // Add the conflicting dates to the recurring commitment's deletedOccurrences
                const conflictingCommitment = conflicts.conflictingCommitment;
                const updatedConflictingCommitment = {
                    ...conflictingCommitment,
                    deletedOccurrences: [
                        ...(conflictingCommitment.deletedOccurrences || []),
                        ...(conflicts.conflictingDates || [])
                    ]
                };
                
                // Update the conflicting commitment
                updatedCommitments = updatedCommitments.map(commitment => 
                    commitment.id === conflictingCommitment.id 
                        ? updatedConflictingCommitment 
                        : commitment
                );
            }
        } else if (newCommitment.recurring && newCommitment.daysOfWeek) {
            // For recurring commitments, check if they conflict with one-time commitments
            const conflicts = checkCommitmentConflicts(newCommitment, fixedCommitments);
            
            if (conflicts.hasConflict && conflicts.conflictType === 'override' && conflicts.conflictingDates) {
                // Add the conflicting dates to the new recurring commitment's deletedOccurrences
                newCommitment.deletedOccurrences = [
                    ...(newCommitment.deletedOccurrences || []),
                    ...conflicts.conflictingDates
                ];
            }
        }
        
        // Add the new commitment
        updatedCommitments = [...updatedCommitments, newCommitment];
        setFixedCommitments(updatedCommitments);
        
        // Regenerate study plan with new commitment
        if (tasks.length > 0) {
            const { plans: newPlans } = generateNewStudyPlan(tasks, settings, updatedCommitments, studyPlans);
            
            // Preserve session status from previous plan
            newPlans.forEach(plan => {
                const prevPlan = studyPlans.find(p => p.date === plan.date);
                if (!prevPlan) return;
                
                // Preserve session status and properties
                plan.plannedTasks.forEach(session => {
                    const prevSession = prevPlan.plannedTasks.find(s => s.taskId === session.taskId && s.sessionNumber === session.sessionNumber);
                    if (prevSession) {
                        // Preserve done sessions
                        if (prevSession.done) {
                            session.done = true;
                            session.status = prevSession.status;
                            session.actualHours = prevSession.actualHours;
                            session.completedAt = prevSession.completedAt;
                        }
                        // Preserve skipped sessions
                        else if (prevSession.status === 'skipped') {
                            session.status = 'skipped';
                        }
                        // Preserve rescheduled sessions
                        else if (prevSession.originalTime && prevSession.originalDate) {
                            session.originalTime = prevSession.originalTime;
                            session.originalDate = prevSession.originalDate;
                            session.rescheduledAt = prevSession.rescheduledAt;
                            session.isManualOverride = prevSession.isManualOverride;
                        }
                    }
                });
            });
            
            setStudyPlans(newPlans);
        setLastPlanStaleReason("commitment");
        }
    };

    const handleDeleteFixedCommitment = (commitmentId: string) => {
        const updatedCommitments = fixedCommitments.filter(commitment => commitment.id !== commitmentId);
        setFixedCommitments(updatedCommitments);
        
        // Regenerate study plan with updated commitments
        if (tasks.length > 0) {
            const { plans: newPlans } = generateNewStudyPlan(tasks, settings, updatedCommitments, studyPlans);
            
            // Preserve session status from previous plan
            newPlans.forEach(plan => {
                const prevPlan = studyPlans.find(p => p.date === plan.date);
                if (!prevPlan) return;
                
                // Preserve session status and properties
                plan.plannedTasks.forEach(session => {
                    const prevSession = prevPlan.plannedTasks.find(s => s.taskId === session.taskId && s.sessionNumber === session.sessionNumber);
                    if (prevSession) {
                        // Preserve done sessions
                        if (prevSession.done) {
                            session.done = true;
                            session.status = prevSession.status;
                            session.actualHours = prevSession.actualHours;
                            session.completedAt = prevSession.completedAt;
                        }
                        // Preserve skipped sessions
                        else if (prevSession.status === 'skipped') {
                            session.status = 'skipped';
                        }
                        // Preserve rescheduled sessions
                        else if (prevSession.originalTime && prevSession.originalDate) {
                            session.originalTime = prevSession.originalTime;
                            session.originalDate = prevSession.originalDate;
                            session.rescheduledAt = prevSession.rescheduledAt;
                            session.isManualOverride = prevSession.isManualOverride;
                        }
                    }
                });
            });
            
            setStudyPlans(newPlans);
        setLastPlanStaleReason("commitment");
        }
    };

    const handleUpdateFixedCommitment = (commitmentId: string, updates: Partial<FixedCommitment>) => {
        // First, update the commitment
        let updatedCommitments = fixedCommitments.map(commitment =>
            commitment.id === commitmentId ? { ...commitment, ...updates } : commitment
        );
        
        // Handle override logic for commitments
        const updatedCommitment = updatedCommitments.find(c => c.id === commitmentId);
        if (updatedCommitment) {
            if (!updatedCommitment.recurring && updatedCommitment.specificDates) {
                // For one-time commitments, check if they conflict with recurring commitments
                const conflicts = checkCommitmentConflicts(updatedCommitment, fixedCommitments, commitmentId);
                
                if (conflicts.hasConflict && conflicts.conflictType === 'override' && conflicts.conflictingCommitment) {
                    // Add the conflicting dates to the recurring commitment's deletedOccurrences
                    const conflictingCommitment = conflicts.conflictingCommitment;
                    const updatedConflictingCommitment = {
                        ...conflictingCommitment,
                        deletedOccurrences: [
                            ...(conflictingCommitment.deletedOccurrences || []),
                            ...(conflicts.conflictingDates || [])
                        ]
                    };
                    
                    // Update the conflicting commitment
                    updatedCommitments = updatedCommitments.map(commitment => 
                        commitment.id === conflictingCommitment.id 
                            ? updatedConflictingCommitment 
                            : commitment
                    );
                }
            } else if (updatedCommitment.recurring && updatedCommitment.daysOfWeek) {
                // For recurring commitments, check if they conflict with one-time commitments
                const conflicts = checkCommitmentConflicts(updatedCommitment, fixedCommitments, commitmentId);
                
                if (conflicts.hasConflict && conflicts.conflictType === 'override' && conflicts.conflictingDates) {
                    // Add the conflicting dates to the updated recurring commitment's deletedOccurrences
                    const updatedCommitmentWithDeletedOccurrences = {
                        ...updatedCommitment,
                        deletedOccurrences: [
                            ...(updatedCommitment.deletedOccurrences || []),
                            ...conflicts.conflictingDates
                        ]
                    };
                    
                    // Update the commitment being edited
                    updatedCommitments = updatedCommitments.map(commitment => 
                        commitment.id === commitmentId 
                            ? updatedCommitmentWithDeletedOccurrences 
                            : commitment
                    );
                }
            }
        }
        
        setFixedCommitments(updatedCommitments);
        
        // Regenerate study plan with updated commitments
        if (tasks.length > 0) {
            const { plans: newPlans } = generateNewStudyPlan(tasks, settings, updatedCommitments, studyPlans);
            
            // Preserve session status from previous plan
            newPlans.forEach(plan => {
                const prevPlan = studyPlans.find(p => p.date === plan.date);
                if (!prevPlan) return;
                
                // Preserve session status and properties
                plan.plannedTasks.forEach(session => {
                    const prevSession = prevPlan.plannedTasks.find(s => s.taskId === session.taskId && s.sessionNumber === session.sessionNumber);
                    if (prevSession) {
                        // Preserve done sessions
                        if (prevSession.done) {
                            session.done = true;
                            session.status = prevSession.status;
                            session.actualHours = prevSession.actualHours;
                            session.completedAt = prevSession.completedAt;
                        }
                        // Preserve skipped sessions
                        else if (prevSession.status === 'skipped') {
                            session.status = 'skipped';
                        }
                        // Preserve rescheduled sessions
                        else if (prevSession.originalTime && prevSession.originalDate) {
                            session.originalTime = prevSession.originalTime;
                            session.originalDate = prevSession.originalDate;
                            session.rescheduledAt = prevSession.rescheduledAt;
                            session.isManualOverride = prevSession.isManualOverride;
                        }
                    }
                });
            });
            
            setStudyPlans(newPlans);
        setLastPlanStaleReason("commitment");
        }
    };

    const handleDeleteCommitmentSession = (commitmentId: string, date: string) => {
        const updatedCommitments = fixedCommitments.map(commitment => {
            if (commitment.id === commitmentId) {
                const deletedOccurrences = commitment.deletedOccurrences || [];
                if (!deletedOccurrences.includes(date)) {
                    return {
                        ...commitment,
                        deletedOccurrences: [...deletedOccurrences, date]
                    };
                }
            }
            return commitment;
        });
        setFixedCommitments(updatedCommitments);
        
        // Regenerate study plan with updated commitments
        if (tasks.length > 0) {
            const { plans: newPlans } = generateNewStudyPlan(tasks, settings, updatedCommitments, studyPlans);
            
            // Preserve session status from previous plan
            newPlans.forEach(plan => {
                const prevPlan = studyPlans.find(p => p.date === plan.date);
                if (!prevPlan) return;
                
                // Preserve session status and properties
                plan.plannedTasks.forEach(session => {
                    const prevSession = prevPlan.plannedTasks.find(s => s.taskId === session.taskId && s.sessionNumber === session.sessionNumber);
                    if (prevSession) {
                        // Preserve done sessions
                        if (prevSession.done) {
                            session.done = true;
                            session.status = prevSession.status;
                            session.actualHours = prevSession.actualHours;
                            session.completedAt = prevSession.completedAt;
                        }
                        // Preserve skipped sessions
                        else if (prevSession.status === 'skipped') {
                            session.status = 'skipped';
                        }
                        // Preserve rescheduled sessions
                        else if (prevSession.originalTime && prevSession.originalDate) {
                            session.originalTime = prevSession.originalTime;
                            session.originalDate = prevSession.originalDate;
                            session.rescheduledAt = prevSession.rescheduledAt;
                            session.isManualOverride = prevSession.isManualOverride;
                        }
                    }
                });
            });
            
            setStudyPlans(newPlans);
        setLastPlanStaleReason("commitment");
        }
    };

    const handleEditCommitmentSession = (commitmentId: string, date: string, updates: {
        startTime?: string;
        endTime?: string;
        title?: string;
        type?: 'class' | 'work' | 'appointment' | 'other' | 'buffer';
    }) => {
        const updatedCommitments = fixedCommitments.map(commitment => {
            if (commitment.id === commitmentId) {
                const modifiedOccurrences = commitment.modifiedOccurrences || {};
                return {
                    ...commitment,
                    modifiedOccurrences: {
                        ...modifiedOccurrences,
                        [date]: {
                            ...modifiedOccurrences[date],
                            ...updates
                        }
                    }
                };
            }
            return commitment;
        });
        setFixedCommitments(updatedCommitments);
        
        // Regenerate study plan with updated commitments
        if (tasks.length > 0) {
            const { plans: newPlans } = generateNewStudyPlan(tasks, settings, updatedCommitments, studyPlans);
            
            // Preserve session status from previous plan
            newPlans.forEach(plan => {
                const prevPlan = studyPlans.find(p => p.date === plan.date);
                if (!prevPlan) return;
                
                // Preserve session status and properties
                plan.plannedTasks.forEach(session => {
                    const prevSession = prevPlan.plannedTasks.find(s => s.taskId === session.taskId && s.sessionNumber === session.sessionNumber);
                    if (prevSession) {
                        // Preserve done sessions
                        if (prevSession.done) {
                            session.done = true;
                            session.status = prevSession.status;
                            session.actualHours = prevSession.actualHours;
                            session.completedAt = prevSession.completedAt;
                        }
                        // Preserve skipped sessions
                        else if (prevSession.status === 'skipped') {
                            session.status = 'skipped';
                        }
                        // Preserve rescheduled sessions
                        else if (prevSession.originalTime && prevSession.originalDate) {
                            session.originalTime = prevSession.originalTime;
                            session.originalDate = prevSession.originalDate;
                            session.rescheduledAt = prevSession.rescheduledAt;
                            session.isManualOverride = prevSession.isManualOverride;
                        }
                    }
                });
            });
            
            setStudyPlans(newPlans);
        setLastPlanStaleReason("commitment");
        }
    };

    const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
        const updatedTasks = tasks.map(task =>
            task.id === taskId ? { ...task, ...updates } : task
        );
        
        // Generate new study plan with updated tasks
        const { plans: newPlans } = generateNewStudyPlan(updatedTasks, settings, fixedCommitments, studyPlans);
        
        // Preserve session status from previous plan
        newPlans.forEach(plan => {
            const prevPlan = studyPlans.find(p => p.date === plan.date);
            if (!prevPlan) return;
            
            // Preserve session status and properties
            plan.plannedTasks.forEach(session => {
                const prevSession = prevPlan.plannedTasks.find(s => s.taskId === session.taskId && s.sessionNumber === session.sessionNumber);
                if (prevSession) {
                    // Preserve done sessions
                    if (prevSession.done) {
                        session.done = true;
                        session.status = prevSession.status;
                        session.actualHours = prevSession.actualHours;
                        session.completedAt = prevSession.completedAt;
                    }
                    // Preserve skipped sessions
                    else if (prevSession.status === 'skipped') {
                        session.status = 'skipped';
                    }
                    // Preserve rescheduled sessions
                    else if (prevSession.originalTime && prevSession.originalDate) {
                        session.originalTime = prevSession.originalTime;
                        session.originalDate = prevSession.originalDate;
                        session.rescheduledAt = prevSession.rescheduledAt;
                        session.isManualOverride = prevSession.isManualOverride;
                    }
                }
            });
        });
        
        setTasks(updatedTasks);
        setStudyPlans(newPlans);
        setLastPlanStaleReason("task");
    };

    const handleDeleteTask = (taskId: string) => {
        const updatedTasks = tasks.filter(task => task.id !== taskId);
        setTasks(updatedTasks);
        
        // Clean up study plans by removing all sessions for the deleted task
        const cleanedPlans = studyPlans.map(plan => ({
            ...plan,
            plannedTasks: plan.plannedTasks.filter(session => session.taskId !== taskId)
        })).filter(plan => plan.plannedTasks.length > 0); // Remove empty plans
        
        if (currentTask?.id === taskId) {
            setCurrentTask(null);
        }
        setLastPlanStaleReason("task");

        // Use aggressive redistribution after task deletion with the cleaned plans
        const newPlans = redistributeAfterTaskDeletion(updatedTasks, settings, fixedCommitments, cleanedPlans);
        setStudyPlans(newPlans);
        setNotificationMessage('Study plan redistributed aggressively after deleting task.');
        setTimeout(() => setNotificationMessage(null), 3000);
    };

    // Update handleSelectTask to also store planDate and sessionNumber if available
    const handleSelectTask = (task: Task, session?: { allocatedHours: number; planDate?: string; sessionNumber?: number }) => {
        setCurrentTask(task);
        setCurrentSession(session || null);
        setActiveTab('timer');
        if (session?.planDate && session?.sessionNumber) {
            setLastTimedSession({ planDate: session.planDate, sessionNumber: session.sessionNumber });
        }
        
        // Initialize timer for this task if it's a new task or different task
        if (globalTimer.currentTaskId !== task.id) {
            // Always use session allocatedHours if available, otherwise use task estimatedHours
            const timeToUse = session?.allocatedHours || task.estimatedHours;
            setGlobalTimer({
                isRunning: false,
                currentTime: Math.floor(timeToUse * 3600),
                totalTime: Math.floor(timeToUse * 3600),
                currentTaskId: task.id
            });
        } else if (session?.allocatedHours) {
            // If same task but different session, update timer to match session duration
            const timeToUse = session.allocatedHours;
            setGlobalTimer({
                isRunning: false,
                currentTime: Math.floor(timeToUse * 3600),
                totalTime: Math.floor(timeToUse * 3600),
                currentTaskId: task.id
            });
        }
    };

    // Update handleTimerComplete to set readyToMarkDone for the last-timed session
    // Timer control functions
    const handleTimerStart = () => {
        setGlobalTimer(prev => ({ ...prev, isRunning: true }));
    };

    const handleTimerPause = () => {
        setGlobalTimer(prev => ({ ...prev, isRunning: false }));
    };

    const handleTimerStop = () => {
        // Just stop the timer without marking session as done
        setGlobalTimer(prev => ({ ...prev, isRunning: false }));
    };

    const handleTimerReset = () => {
        setGlobalTimer(prev => ({
            ...prev,
            isRunning: false,
            currentTime: prev.totalTime
        }));
    };

    // Speed up timer for testing purposes
    const handleTimerSpeedUp = () => {
        setGlobalTimer(prev => ({
            ...prev,
            currentTime: Math.max(0, prev.currentTime - 300) // Speed up by 5 minutes (300 seconds)
        }));
    };

    const handleTimerComplete = (taskId: string, timeSpent: number) => {
        // Find the session in studyPlans
        if (lastTimedSession) {
            // Removed readyToMarkDone state
        }
        // Convert seconds to hours for calculation
        const hoursSpent = timeSpent / 3600;

        // Update the task's estimated hours based on actual time spent
        setTasks(prevTasks =>
            prevTasks.map(task => {
                if (task.id === taskId) {
                    const newEstimatedHours = Math.max(0, task.estimatedHours - hoursSpent);
                    const newStatus = newEstimatedHours === 0 ? 'completed' : task.status;

                    return {
                        ...task,
                        estimatedHours: newEstimatedHours,
                        status: newStatus
                    };
                }
                return task;
            })
        );

        // Update study plans to mark session as done
        if (lastTimedSession) {
            setStudyPlans(prevPlans => {
                const updatedPlans = prevPlans.map(plan => {
                    if (plan.date === lastTimedSession.planDate) {
                        return {
                            ...plan,
                            plannedTasks: plan.plannedTasks.map(session => {
                                if (session.taskId === taskId && session.sessionNumber === lastTimedSession.sessionNumber) {
                                    const updatedSession: StudySession = {
                                        ...session,
                                        done: true,
                                        status: 'completed',
                                        actualHours: hoursSpent,
                                        completedAt: new Date().toISOString()
                                    };
                                    return updatedSession;
                                }
                                return session;
                            })
                        };
                    }
                    return plan;
                });
                
                // After updating the plans, check if this creates the edge case
                setTimeout(() => {
                    const wasHandled = checkAndHandleSkippedOnlyTask(taskId, updatedPlans);
                    if (!wasHandled) {
                        // If the task wasn't deleted, check if it should be completed
                        checkAndCompleteTask(taskId, updatedPlans);
                    }
                }, 0);
                
                return updatedPlans;
            });
        }

        // Clear current task if it's completed
        const completedTask = tasks.find(task => task.id === taskId);
        if (completedTask && (completedTask.estimatedHours - hoursSpent) <= 0) {
            setCurrentTask(null);
        }
    };

    // New function to handle when timer reaches zero and user wants to mark session as done
    const handleMarkSessionDoneFromTimer = (taskId: string, timeSpent: number) => {
        handleTimerComplete(taskId, timeSpent);
    };

    // Helper function to check if all sessions for a task are done and complete the task
    const checkAndCompleteTask = (taskId: string, updatedStudyPlans?: StudyPlan[]) => {
        // Use updated study plans if provided, otherwise use current state
        const plansToCheck = updatedStudyPlans || studyPlans;
        
        // Get all sessions for this task across all study plans
        const allSessionsForTask = plansToCheck.flatMap(plan => plan.plannedTasks).filter(s => s.taskId === taskId);
        
        // Check if all sessions are done (including skipped sessions)
        const allSessionsDone = allSessionsForTask.length > 0 && allSessionsForTask.every(session => 
            session.done || session.status === 'skipped'
        );
        
        if (allSessionsDone) {
            // Find the task
            const task = tasks.find(t => t.id === taskId);
            if (task && task.status !== 'completed') {
                // Calculate total hours from completed and skipped sessions
                const totalCompletedHours = allSessionsForTask.reduce((sum, session) => 
                    sum + (session.done || session.status === 'skipped' ? session.allocatedHours : 0), 0
                );
                
                // Update task status to completed
                const updatedTasks = tasks.map(t => 
                    t.id === taskId 
                        ? { ...t, status: 'completed' as const, estimatedHours: totalCompletedHours }
                        : t
                );
                
                setTasks(updatedTasks);
                
                // Regenerate study plan with the updated task status
                const { plans: newPlans } = generateNewStudyPlan(updatedTasks, settings, fixedCommitments, studyPlans);
                
                // Preserve session status from previous plan
                newPlans.forEach(plan => {
                    const prevPlan = studyPlans.find(p => p.date === plan.date);
                    if (!prevPlan) return;
                    
                    // Preserve session status and properties
                    plan.plannedTasks.forEach(session => {
                        const prevSession = prevPlan.plannedTasks.find(s => s.taskId === session.taskId && s.sessionNumber === session.sessionNumber);
                        if (prevSession) {
                            // Preserve done sessions
                            if (prevSession.done) {
                                session.done = true;
                                session.status = prevSession.status;
                                session.actualHours = prevSession.actualHours;
                                session.completedAt = prevSession.completedAt;
                            }
                            // Preserve skipped sessions
                            else if (prevSession.status === 'skipped') {
                                session.status = 'skipped';
                            }
                            // Preserve rescheduled sessions
                            else if (prevSession.originalTime && prevSession.originalDate) {
                                session.originalTime = prevSession.originalTime;
                                session.originalDate = prevSession.originalDate;
                                session.rescheduledAt = prevSession.rescheduledAt;
                                session.isManualOverride = prevSession.isManualOverride;
                            }
                        }
                    });
                });
                
                setStudyPlans(newPlans);
                
                // Show completion notification
                setNotificationMessage(`Task completed: ${task.title}`);
                setTimeout(() => setNotificationMessage(null), 3000);
            }
        }
    };

    // Helper function to handle edge case: task with only one session that is skipped
    const checkAndHandleSkippedOnlyTask = (taskId: string, updatedStudyPlans?: StudyPlan[]) => {
        // Use updated study plans if provided, otherwise use current state
        const plansToCheck = updatedStudyPlans || studyPlans;
        
        // Get all sessions for this task across all study plans
        const allSessionsForTask = plansToCheck.flatMap(plan => plan.plannedTasks).filter(s => s.taskId === taskId);
        
        // Check if task has only one session and that session is skipped
        if (allSessionsForTask.length === 1 && allSessionsForTask[0].status === 'skipped') {
            const task = tasks.find(t => t.id === taskId);
            if (task && task.status === 'pending') {
                // This task has only one session and it's skipped, so mark it as completed
                // since skipped sessions are now treated as "done" for scheduling purposes
                const updatedTasks = tasks.map(t => 
                    t.id === taskId 
                        ? { ...t, status: 'completed' as const, completedAt: new Date().toISOString() }
                        : t
                );
                setTasks(updatedTasks);
                
                // Clear current task if it's the one being completed
                if (currentTask && currentTask.id === taskId) {
                    setCurrentTask(null);
                    setCurrentSession(null);
                }
                
                // Show completion notification
                setNotificationMessage(`Task "${task.title}" completed - all sessions were skipped`);
                setTimeout(() => setNotificationMessage(null), 3000);
                
                return true; // Indicate that the task was handled
            }
        }
        
        return false; // Task was not handled
    };

    // Handler to mark a session as done in studyPlans
    const handleMarkSessionDone = (planDate: string, sessionNumber: number) => {
        setStudyPlans(prevPlans => {
            const updatedPlans = prevPlans.map(plan => {
                if (plan.date !== planDate) return plan;
                return {
                    ...plan,
                    plannedTasks: plan.plannedTasks.map(session => {
                        // Only mark the session as done if it matches both the sessionNumber AND the current task
                        if (session.sessionNumber === sessionNumber && currentTask && session.taskId === currentTask.id) {
                            const updatedSession = { ...session, done: true };
                            
                            // Check if this completes the task with the updated plans
                            setTimeout(() => {
                                const wasHandled = checkAndHandleSkippedOnlyTask(session.taskId, updatedPlans);
                                if (!wasHandled) {
                                    checkAndCompleteTask(session.taskId, updatedPlans);
                                }
                            }, 0);
                            
                            return updatedSession;
                        }
                        return session;
                    })
                };
            });
            
            return updatedPlans;
        });
        
        // Show success notification
        if (currentTask) {
            setNotificationMessage(`Session completed: ${currentTask.title}`);
            setTimeout(() => setNotificationMessage(null), 3000);
        }
    };

    // Handler to undo marking a session as done
    const handleUndoSessionDone = (planDate: string, taskId: string, sessionNumber: number) => {
        setStudyPlans(prevPlans => {
            const updatedPlans = prevPlans.map(plan => {
                if (plan.date !== planDate) return plan;
                return {
                    ...plan,
                    plannedTasks: plan.plannedTasks.map(session => {
                        // Only undo the session if it matches both taskId and sessionNumber
                        if (session.taskId === taskId && session.sessionNumber === sessionNumber) {
                            const updatedSession = { ...session, done: false };
                            
                            // Check if this un-completes the task with the updated plans
                            setTimeout(() => {
                                const allSessionsForTask = updatedPlans.flatMap(plan => plan.plannedTasks).filter(s => s.taskId === taskId);
                                const allSessionsDone = allSessionsForTask.length > 0 && allSessionsForTask.every(session => 
                                    session.done || session.status === 'skipped'
                                );
                                
                                if (!allSessionsDone) {
                                    // Revert task status to pending if not all sessions are done
                                    const updatedTasks = tasks.map(t => 
                                        t.id === taskId 
                                            ? { ...t, status: 'pending' as const }
                                            : t
                                    );
                                    
                                    setTasks(updatedTasks);
                                    
                                    // Regenerate study plan with the updated task status
                                    const { plans: newPlans } = generateNewStudyPlan(updatedTasks, settings, fixedCommitments, updatedPlans);
                                    
                                    // Preserve session status from previous plan
                                    newPlans.forEach(plan => {
                                        const prevPlan = updatedPlans.find(p => p.date === plan.date);
                                        if (!prevPlan) return;
                                        
                                        // Preserve session status and properties
                                        plan.plannedTasks.forEach(session => {
                                            const prevSession = prevPlan.plannedTasks.find(s => s.taskId === session.taskId && s.sessionNumber === session.sessionNumber);
                                            if (prevSession) {
                                                // Preserve done sessions
                                                if (prevSession.done) {
                                                    session.done = true;
                                                    session.status = prevSession.status;
                                                    session.actualHours = prevSession.actualHours;
                                                    session.completedAt = prevSession.completedAt;
                                                }
                                                // Preserve skipped sessions
                                                else if (prevSession.status === 'skipped') {
                                                    session.status = 'skipped';
                                                }
                                                // Preserve rescheduled sessions
                                                else if (prevSession.originalTime && prevSession.originalDate) {
                                                    session.originalTime = prevSession.originalTime;
                                                    session.originalDate = prevSession.originalDate;
                                                    session.rescheduledAt = prevSession.rescheduledAt;
                                                    session.isManualOverride = prevSession.isManualOverride;
                                                }
                                            }
                                        });
                                    });
                                    
                                    setStudyPlans(newPlans);
                                }
                            }, 0);
                            
                            return updatedSession;
                        }
                        return session;
                    })
                };
            });
            
            return updatedPlans;
        });
    };

    // Completion flow handlers
    const handleContinueWithNextSession = () => {
        // Find the next available session for today
        const today = getLocalDateString();
        const todaysPlan = studyPlans.find(plan => plan.date === today);
        
        if (todaysPlan) {
            const nextSession = todaysPlan.plannedTasks.find(session => 
                !session.done && session.status !== 'completed' && session.status !== 'skipped'
            );
            
            if (nextSession) {
                const nextTask = tasks.find(t => t.id === nextSession.taskId);
                if (nextTask) {
                    handleSelectTask(nextTask, {
                        allocatedHours: nextSession.allocatedHours,
                        planDate: todaysPlan.date,
                        sessionNumber: nextSession.sessionNumber
                    });
                    setNotificationMessage(`Starting next session: ${nextTask.title}`);
                    setTimeout(() => setNotificationMessage(null), 3000);
                }
            } else {
                // No more sessions today, switch to dashboard
                setActiveTab('dashboard');
                setNotificationMessage('Great job! All sessions for today are complete.');
                setTimeout(() => setNotificationMessage(null), 3000);
            }
        } else {
            setActiveTab('dashboard');
        }
    };

    const handleTakeBreak = () => {
        // Switch to dashboard and show break message
        setActiveTab('dashboard');
        setNotificationMessage('Taking a break! Remember to stay hydrated and stretch.');
        setTimeout(() => setNotificationMessage(null), 3000);
    };

    const handleReviewCompletedWork = () => {
        // Switch to dashboard to review completed tasks
        setActiveTab('dashboard');
        setNotificationMessage('Review your completed work in the dashboard.');
        setTimeout(() => setNotificationMessage(null), 3000);
    };

    // Function to determine which settings are allowed during tutorial
    const getTutorialAllowedSettings = () => {
        if (!showInteractiveTutorial) return 'all';
        
        // Get current tutorial step from the tutorial component
        // For now, we'll use a simple approach based on the current tab
        if (activeTab === 'settings') {
            // During settings tutorial, allow study plan mode changes
            return ['studyPlanMode', 'darkMode', 'enableNotifications'];
        }
        
        return []; // Block all settings during other tutorial steps
    };

    // Function to check if a specific setting can be changed
    const canChangeSetting = (settingKey: string) => {
        // Block settings during active operations
        if (globalTimer.isRunning) {
            return false;
        }
        
        // Check tutorial restrictions
        const allowedSettings = getTutorialAllowedSettings();
        if (allowedSettings !== 'all' && !allowedSettings.includes(settingKey)) {
            return false;
        }
        
        // Block critical settings when no tasks exist
        if (tasks.length === 0 && ['studyPlanMode', 'dailyAvailableHours', 'workDays'].includes(settingKey)) {
            return false;
        }
        
        return true;
    };

    const handleUpdateSettings = (newSettings: UserSettings) => {
        // Check if any restricted settings are being changed
        const changedSettings = Object.keys(newSettings).filter(key => 
            newSettings[key as keyof UserSettings] !== settings[key as keyof UserSettings]
        );
        
        const blockedSettings = changedSettings.filter(setting => !canChangeSetting(setting));
        
        if (blockedSettings.length > 0) {
            let message = 'Cannot change settings at this time: ';
            if (globalTimer.isRunning) {
                message += 'Please stop the timer first.';
            } else if (showInteractiveTutorial) {
                message += 'Please complete the tutorial first.';
            } else if (tasks.length === 0) {
                message += 'Add some tasks first.';
            }
            setNotificationMessage(message);
            setTimeout(() => setNotificationMessage(null), 3000);
            return;
        }
        
        setSettings({ ...newSettings });
        localStorage.setItem('timepilot-settings', JSON.stringify({ ...newSettings }));
        
        // Auto-regenerate study plan with new settings
        if (tasks.length > 0) {
            const { plans: newPlans } = generateNewStudyPlan(tasks, newSettings, fixedCommitments, studyPlans);
            
            // Preserve session status from previous plan
            newPlans.forEach(plan => {
                const prevPlan = studyPlans.find(p => p.date === plan.date);
                if (!prevPlan) return;
                
                // Preserve session status and properties
                plan.plannedTasks.forEach(session => {
                    const prevSession = prevPlan.plannedTasks.find(s => s.taskId === session.taskId && s.sessionNumber === session.sessionNumber);
                    if (prevSession) {
                        // Preserve done sessions
                        if (prevSession.done) {
                            session.done = true;
                            session.status = prevSession.status;
                            session.actualHours = prevSession.actualHours;
                            session.completedAt = prevSession.completedAt;
                        }
                        // Preserve skipped sessions
                        else if (prevSession.status === 'skipped') {
                            session.status = 'skipped';
                        }
                        // Preserve rescheduled sessions
                        else if (prevSession.originalTime && prevSession.originalDate) {
                            session.originalTime = prevSession.originalTime;
                            session.originalDate = prevSession.originalDate;
                            session.rescheduledAt = prevSession.rescheduledAt;
                            session.isManualOverride = prevSession.isManualOverride;
                        }
                    }
                });
            });
            
            setStudyPlans(newPlans);
        }
        
        setLastPlanStaleReason("settings");
    };

    const handleUpdateSettingsFromSuggestions = (updates: Partial<{
        dailyAvailableHours: number;
        workDays: number[];
        bufferDays: number;
    }>) => {
        const newSettings = { ...settings, ...updates };
        setSettings(newSettings);
        setIsPlanStale(true);
        // Clear suggestions after applying them
        // Removed setSuggestions([]);
    };

    const handleToggleDarkMode = () => {
        setDarkMode((prev: boolean) => !prev);
    };

    const handleSkipMissedSession = (planDate: string, sessionNumber: number, taskId: string) => {
        setStudyPlans(prevPlans => {
            const updatedPlans = prevPlans.map(plan => {
                if (plan.date === planDate) {
                    return {
                        ...plan,
                        plannedTasks: plan.plannedTasks.map(session => {
                            if (session.taskId === taskId && session.sessionNumber === sessionNumber) {
                                return {
                                    ...session,
                                    status: 'skipped' as const
                                };
                            }
                            return session;
                        })
                    };
                }
                return plan;
            });
            
            // After updating the plans, check if this creates the edge case
            // where a task has only one session and that session is now skipped
            setTimeout(() => {
                const wasHandled = checkAndHandleSkippedOnlyTask(taskId, updatedPlans);
                if (!wasHandled) {
                    // If the task wasn't deleted, check if it should be completed
                    checkAndCompleteTask(taskId, updatedPlans);
                }
            }, 0);
            
            return updatedPlans;
        });
    };

    // Interactive tutorial handlers
    const handleStartTutorial = () => {
        setShowInteractiveTutorial(true);
        setNotificationMessage('Starting interactive tutorial...');
        setTimeout(() => setNotificationMessage(null), 2000);
    };

    const handleRestartTutorial = () => {
        localStorage.removeItem('timepilot-interactive-tutorial-complete');
        setShowInteractiveTutorial(true);
        setNotificationMessage('Interactive tutorial restarted! Follow the guided steps.');
        setTimeout(() => setNotificationMessage(null), 3000);
    };

    const handleInteractiveTutorialComplete = () => {
        setShowInteractiveTutorial(false);
        localStorage.setItem('timepilot-interactive-tutorial-complete', 'true');
        setNotificationMessage('Interactive tutorial completed! You\'re ready to use TimePilot effectively.');
        setTimeout(() => setNotificationMessage(null), 3000);
    };

    const handleInteractiveTutorialSkip = () => {
        setShowInteractiveTutorial(false);
        // Mark tutorial as completed when dismissed so the button and welcome message don't appear again
        localStorage.setItem('timepilot-interactive-tutorial-complete', 'true');
        setNotificationMessage('Tutorial dismissed. You can restart it anytime from the tutorial button in Settings.');
        setTimeout(() => setNotificationMessage(null), 3000);
    };



    // Clear highlighted tab when tutorial is not active
    useEffect(() => {
        if (!showInteractiveTutorial) {
            setHighlightedTab(null);
        }
    }, [showInteractiveTutorial]);


    // Handle missed sessions and provide rescheduling options
    // Removed handleMissedSessions, handleIndividualSessionReschedule, and any effect or function using checkSessionStatus, moveMissedSessions, moveIndividualSession, applyUserReschedules, createUserReschedule, or UserReschedule
    // Removed onHandleMissedSessions and readyToMarkDone props from Dashboard and StudyPlanView

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare },
        { id: 'plan', label: 'Study Plan', icon: Calendar },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays },
        { id: 'timer', label: 'Timer', icon: Clock },
        { id: 'commitments', label: 'Commitments', icon: Calendar },
        { id: 'settings', label: 'Settings', icon: SettingsIcon }
    ];

    const hasUnscheduled = getUnscheduledMinutesForTasks(tasks, (() => {
      const taskScheduledHours: Record<string, number> = {};
      studyPlans.forEach(plan => {
        plan.plannedTasks.forEach(session => {
          // Skip sessions that are marked as skipped - they shouldn't count towards scheduled hours
          if (session.status !== 'skipped') {
            taskScheduledHours[session.taskId] = (taskScheduledHours[session.taskId] || 0) + session.allocatedHours;
          }
        });
      });
      return taskScheduledHours;
    })(), settings).length > 0;

    return (
        <ErrorBoundary>
            <div className={`${darkMode ? 'dark' : ''}`}>
                <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
                {/* Navbar/Header */}
                <header className="w-full flex items-center justify-between px-4 sm:px-6 py-3 bg-white dark:bg-gray-900 shadow-md z-40">
                    <div className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">TimePilot</div>
                    <div className="flex items-center space-x-2">
                        <button
                            className={`flex items-center rounded-full p-2 transition-colors z-50 ${hasUnscheduled ? 'bg-yellow-300 shadow-lg animate-bounce' : 'bg-gray-200'} ${hasUnscheduled ? 'text-yellow-700' : 'text-gray-400'} ${hasUnscheduled ? '' : 'opacity-60 pointer-events-none cursor-not-allowed'}`}
                            title={showSuggestionsPanel ? 'Hide Optimization Suggestions' : 'Show Optimization Suggestions'}
                            onClick={() => hasUnscheduled && setShowSuggestionsPanel(v => !v)}
                            style={{ outline: 'none', border: 'none' }}
                            disabled={!hasUnscheduled}
                        >
                            <Lightbulb className={`w-5 h-5 sm:w-6 sm:h-6`} fill={hasUnscheduled ? '#fde047' : 'none'} />
                        </button>
                        <button
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            onClick={() => setShowHelpModal(true)}
                            title="Help & FAQ"
                        >
                            <HelpCircle size={20} />
                        </button>
                        <button
                            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </header>

                {/* Navigation */}
                <nav className="bg-white shadow-sm border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex space-x-8">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id as typeof activeTab);
                                        setMobileMenuOpen(false);
                                    }}
                                    className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors duration-200 border-b-2 ${
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        } ${showInteractiveTutorial && highlightedTab === tab.id ? 'ring-2 ring-yellow-400 animate-pulse shadow-lg shadow-yellow-400/50' : ''}`}
                                >
                                    <tab.icon size={20} />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Mobile Navigation */}
                        <div className={`lg:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
                            <div className="py-2 space-y-1">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id as typeof activeTab);
                                            setMobileMenuOpen(false);
                                        }}
                                        className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-lg ${
                                            activeTab === tab.id
                                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800'
                                        } ${showInteractiveTutorial && highlightedTab === tab.id ? 'ring-2 ring-yellow-400 animate-pulse shadow-lg shadow-yellow-400/50' : ''}`}
                                    >
                                        <tab.icon size={20} />
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 relative">
                    {/* Toggle Suggestions Panel Button */}
                    {/* Suggestions Panel */}
                    {showSuggestionsPanel && hasUnscheduled && (
                        <SuggestionsPanel 
                            tasks={tasks}
                            studyPlans={studyPlans}
                            settings={settings}
                            fixedCommitments={fixedCommitments}
                            // Removed suggestions prop
                            onUpdateSettings={handleUpdateSettingsFromSuggestions}
                        />
                    )}
                    {notificationMessage && (
                        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm sm:max-w-md lg:max-w-2xl px-4">
                            {notificationMessage.includes("can't be added due to schedule conflicts") ? (
                                // Enhanced notification for task addition conflicts
                                <div className="bg-white dark:bg-gray-800 border-l-4 border-orange-500 rounded-lg shadow-xl">
                                    <div className="p-4 sm:p-6">
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0">
                                                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                    Task Cannot Be Added
                                                </h3>
                                                <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                                    <p className="mb-3">
                                                        The task <span className="font-medium text-gray-900 dark:text-white">"{notificationMessage.match(/Task "([^"]+)"/)?.[1] || 'Unknown'}"</span> cannot be scheduled with your current settings.
                                                    </p>
                                                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 sm:p-4">
                                                        <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">Try these solutions:</h4>
                                                        <ul className="space-y-1 text-sm text-orange-700 dark:text-orange-300">
                                                            <li className="flex items-start space-x-2">
                                                                <span className="text-orange-500 dark:text-orange-400 mt-0.5">•</span>
                                                                <span>Reduce the estimated hours for this task</span>
                                                            </li>
                                                            <li className="flex items-start space-x-2">
                                                                <span className="text-orange-500 dark:text-orange-400 mt-0.5">•</span>
                                                                <span>Adjust the deadline to allow more time</span>
                                                            </li>
                                                            <li className="flex items-start space-x-2">
                                                                <span className="text-orange-500 dark:text-orange-400 mt-0.5">•</span>
                                                                <span>Increase your daily available study hours in Settings</span>
                                                            </li>
                                                            <li className="flex items-start space-x-2">
                                                                <span className="text-orange-500 dark:text-orange-400 mt-0.5">•</span>
                                                                <span>Remove or reschedule other tasks</span>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                                                    <button
                                                        onClick={() => setActiveTab('settings')}
                                                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                                                    >
                                                        Open Settings
                                                    </button>
                                                    <button
                                                        onClick={() => setNotificationMessage(null)}
                                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                                    >
                                                        Dismiss
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Default notification for other messages
                                <div className={`px-4 sm:px-6 py-3 rounded-lg shadow-lg flex items-center space-x-4 ${
                                    notificationMessage.includes('successfully') 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                    <span className="text-sm">{notificationMessage}</span>
                                    <button 
                                        onClick={() => setNotificationMessage(null)} 
                                        className="text-current hover:opacity-75 font-bold"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'dashboard' && (
                        <Dashboard
                            tasks={tasks}
                            studyPlans={studyPlans}
                            dailyAvailableHours={settings.dailyAvailableHours}
                            workDays={settings.workDays}
                            onSelectTask={handleSelectTask}
                            onGenerateStudyPlan={handleGenerateStudyPlan}
                            hasCompletedTutorial={localStorage.getItem('timepilot-interactive-tutorial-complete') === 'true'}
                        />
                    )}

                    {activeTab === 'tasks' && (
                        <div className="space-y-4 sm:space-y-6">
                            <button
                                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center sm:justify-start space-x-2 mb-2"
                                onClick={() => setShowTaskInput(true)}
                            >
                                + Add Task
                            </button>
                            {showTaskInput && (
                                <TaskInput onAddTask={handleAddTask} onCancel={() => setShowTaskInput(false)} />
                            )}
                            <TaskList
                                tasks={tasks}
                                onUpdateTask={handleUpdateTask}
                                onDeleteTask={handleDeleteTask}
                                autoRemovedTasks={autoRemovedTasks}
                                onDismissAutoRemovedTask={handleDismissAutoRemovedTask}
                            />
                        </div>
                    )}

                    {activeTab === 'plan' && (
                        <StudyPlanView
                            studyPlans={studyPlans}
                            tasks={tasks}
                            fixedCommitments={fixedCommitments}
                            onSelectTask={handleSelectTask}
                            onGenerateStudyPlan={handleGenerateStudyPlan}
                            onUndoSessionDone={handleUndoSessionDone}
                            settings={settings}
                            onAddFixedCommitment={handleAddFixedCommitment}
                            onSkipMissedSession={handleSkipMissedSession}
                onRedistributeMissedSessions={handleRedistributeMissedSessions}
                        />
                    )}

                    {activeTab === 'calendar' && (
                        <CalendarView
                            studyPlans={studyPlans}
                            fixedCommitments={fixedCommitments}
                            tasks={tasks}
                            onSelectTask={handleSelectTask}
                            onStartManualSession={(commitment, durationSeconds) => {
                                setGlobalTimer({
                                    isRunning: false,
                                    currentTime: durationSeconds,
                                    totalTime: durationSeconds,
                                    currentTaskId: commitment.id
                                });
                                setCurrentTask({
                                    id: commitment.id,
                                    title: commitment.title,
                                    subject: 'Manual Session',
                                    estimatedHours: durationSeconds / 3600,
                                    status: 'pending',
                                    importance: false,
                                    deadline: '',
                                    createdAt: commitment.createdAt,
                                    description: '',
                                });
                                setCurrentSession({
                                    allocatedHours: Number(durationSeconds) / 3600
                                });
                                setActiveTab('timer');
                            }}
                            onDeleteFixedCommitment={handleDeleteFixedCommitment}
                            onDeleteCommitmentSession={handleDeleteCommitmentSession}
                            onEditCommitmentSession={handleEditCommitmentSession}
                        />
                    )}

                    {activeTab === 'timer' && currentTask ? (
                        <StudyTimer
                            currentTask={currentTask}
                            currentSession={currentSession}
                            onTimerComplete={handleMarkSessionDoneFromTimer}
                            planDate={currentSession?.planDate}
                            sessionNumber={currentSession?.sessionNumber}
                            onMarkSessionDone={handleMarkSessionDone}
                            timer={globalTimer}
                            onTimerStart={handleTimerStart}
                            onTimerPause={handleTimerPause}
                            onTimerStop={handleTimerStop}
                            onTimerReset={handleTimerReset}
                            onTimerSpeedUp={handleTimerSpeedUp}
                            onContinueWithNextSession={handleContinueWithNextSession}
                            onTakeBreak={handleTakeBreak}
                            onReviewCompletedWork={handleReviewCompletedWork}
                            studyPlans={studyPlans}
                            tasks={tasks}
                        />
                    ) : activeTab === 'timer' && !currentTask ? (
                        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 text-center dark:bg-gray-900 dark:shadow-gray-900">
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 dark:text-white">Study Timer</h2>
                            <p className="text-gray-500 dark:text-gray-300">Select a task to start studying</p>
                        </div>
                    ) : null}

                    {activeTab === 'commitments' && (
                        <div className="space-y-4 sm:space-y-6">
                            <FixedCommitmentInput 
                                onAddCommitment={handleAddFixedCommitment} 
                                existingCommitments={fixedCommitments}
                            />
                            {editingCommitment ? (
                                <FixedCommitmentEdit
                                    commitment={editingCommitment}
                                    existingCommitments={fixedCommitments}
                                    onUpdateCommitment={handleUpdateFixedCommitment}
                                    onCancel={() => setEditingCommitment(null)}
                                />
                            ) : (
                                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 dark:bg-gray-900 dark:shadow-gray-900">
                                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 dark:text-white">Your Commitments</h2>
                                    <div className="space-y-3">
                                        {fixedCommitments.length === 0 ? (
                                            <p className="text-gray-500 text-center py-8 dark:text-gray-400">No commitments added yet. Add your class schedule, work hours, and other fixed commitments above.</p>
                                        ) : (
                                            fixedCommitments.map((commitment) => (
                                                <div key={commitment.id} className="p-4 sm:p-6 border border-gray-200 rounded-xl bg-white hover:shadow-md transition-all duration-200 dark:bg-gray-800 dark:border-gray-700">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center space-x-3 mb-3">
                                                                <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white truncate">{commitment.title}</h3>
                                                                <span className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-full capitalize flex-shrink-0 ${
                                                                    commitment.type === 'class' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                                                    commitment.type === 'work' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                                                    commitment.type === 'appointment' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
                                                                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                                                }`}>
                                                                    {commitment.type}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                                                                    <span className="font-medium">⏰</span>
                                                                    <span>{commitment.startTime} - {commitment.endTime}</span>
                                                                </div>
                                                                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                                                                    <span className="font-medium">📅</span>
                                                                    <span className="truncate">{commitment.daysOfWeek.map(day => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]).join(', ')}</span>
                                                                </div>
                                                                {commitment.location && (
                                                                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                                                                        <span className="font-medium">📍</span>
                                                                        <span className="truncate">{commitment.location}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                                                            <button
                                                                onClick={() => setEditingCommitment(commitment)}
                                                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
                                                                title="Edit commitment"
                                                            >
                                                                <Edit size={20} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteFixedCommitment(commitment.id)}
                                                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
                                                                title="Delete commitment"
                                                            >
                                                                <Trash2 size={20} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 dark:bg-gray-900 dark:shadow-gray-900">
                            <Settings
                                settings={settings}
                                onUpdateSettings={handleUpdateSettings}
                                darkMode={darkMode}
                                onToggleDarkMode={handleToggleDarkMode}
                                onRestartTutorial={handleRestartTutorial}
                                hasTasks={tasks.length > 0}
                                highlightStudyPlanMode={highlightStudyPlanMode}
                                studyPlans={studyPlans}
                                canChangeSetting={canChangeSetting}
                            />
                        </div>
                    )}
                </main>

                {/* Help Modal */}
                {showHelpModal && (
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        onClick={() => setShowHelpModal(false)}
                    >
                        <div 
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center space-x-2">
                                        <HelpCircle className="text-blue-600 dark:text-blue-400" size={28} />
                                        <span>Help & FAQ</span>
                                    </h2>
                                    <button
                                        onClick={() => setShowHelpModal(false)}
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <details className="group border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <summary className="flex items-center justify-between cursor-pointer p-4 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100">
                                                <span>How does smart scheduling work?</span>
                                                <svg className="w-4 h-4 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </summary>
                                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                TimePilot intelligently creates your study schedule by taking your tasks (with deadlines, estimated hours, and priorities) and your fixed commitments (classes, work, appointments), then automatically finding available time slots that don't conflict with your commitments. The system prioritizes important and urgent tasks first, distributes study hours across your available days until the deadline of the tasks using either Even mode (balanced distribution) or Eisenhower mode (deadline-focused front-loading), and respects your preferences like daily study limits, work days, and minimum session lengths.
                                                </p>
                                            </div>
                                        </details>

                                        <details className="group border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <summary className="flex items-center justify-between cursor-pointer p-4 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100">
                                                <span>What if I miss a scheduled session?</span>
                                                <svg className="w-4 h-4 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </summary>
                                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                When you miss a session or need to reschedule, it automatically redistributes those hours to other available time slots while maintaining deadline compliance. The result is a realistic, conflict-free daily schedule that shows exactly when to study what, eliminating the guesswork of manual planning and ensuring you never accidentally schedule study time over existing commitments.
                                                </p>
                                            </div>
                                        </details>

                                        <details className="group border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <summary className="flex items-center justify-between cursor-pointer p-4 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100">
                                                <span>How accurate are the time estimates?</span>
                                                <svg className="w-4 h-4 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </summary>
                                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Estimates improve over time as the app learns your actual completion times. 
                                                    You can also manually adjust estimates based on your experience with each task.
                                                </p>
                                            </div>
                                        </details>

                                        <details className="group border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <summary className="flex items-center justify-between cursor-pointer p-4 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100">
                                                <span>Can I customize the scheduling rules?</span>
                                                <svg className="w-4 h-4 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </summary>
                                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Yes! You can set your available hours, work days, study window, minimum session length, 
                                                    and buffer time. The app adapts to your preferences and schedule.
                                                </p>
                                            </div>
                                        </details>

                                        <details className="group border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <summary className="flex items-center justify-between cursor-pointer p-4 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100">
                                                <span>How do I get started?</span>
                                                <svg className="w-4 h-4 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </summary>
                                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    1. Add your tasks with deadlines and time estimates<br/>
                                                    2. Set your fixed commitments (classes, work, etc.)<br/>
                                                    3. Configure your study preferences in Settings<br/>
                                                    4. Generate your first study plan<br/>
                                                    5. Start using the timer to track your progress
                                                </p>
                                            </div>
                                        </details>

                                        <details className="group border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <summary className="flex items-center justify-between cursor-pointer p-4 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100">
                                                <span>What makes TimePilot different?</span>
                                                <svg className="w-4 h-4 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </summary>
                                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    TimePilot uses intelligent scheduling that adapts to your actual usage patterns. 
                                                    It learns from your completion rates, automatically reschedules missed sessions, 
                                                    and provides real-time optimization suggestions to help you stay on track.
                                                </p>
                                            </div>
                                        </details>
                                    </div>

                                    {/* Support Section */}
                                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                                        <div className="text-center space-y-4">
                                            <div className="flex items-center justify-center space-x-2">
                                                <span className="text-2xl">☕</span>
                                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Support TimePilot</h3>
                                                <span className="text-2xl">🚀</span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                If TimePilot has helped you manage your time better, consider supporting its development!
                                            </p>
                                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                                <button
                                                    onClick={() => setShowGCashModal(true)}
                                                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                                                >
                                                    <span className="text-lg">📱</span>
                                                    <span>GCash</span>
                                                </button>
                                                <button
                                                    onClick={() => window.open('https://paypal.me/yourusername', '_blank')}
                                                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                                                >
                                                    <span className="text-lg">💙</span>
                                                    <span>PayPal</span>
                                                </button>
                                                <button
                                                    onClick={() => window.open('https://ko-fi.com/yourusername', '_blank')}
                                                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                                                >
                                                    <span className="text-lg">☕</span>
                                                    <span>Ko-fi</span>
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Your support helps keep TimePilot free and enables new features!
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <button
                                            onClick={() => setShowHelpModal(false)}
                                            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Got it!
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* GCash Donation Modal */}
                {showGCashModal && (
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowGCashModal(false)}
                    >
                        <div 
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center space-x-2">
                                        <span className="text-2xl">📱</span>
                                        <span>Support via GCash</span>
                                    </h2>
                                    <button
                                        onClick={() => setShowGCashModal(false)}
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* Motivational Message */}
                                    <div className="text-center space-y-2">
                                        <div className="text-3xl mb-1">🚀</div>
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                            Help TimePilot Soar Higher!
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Your support helps keep TimePilot free and enables amazing new features for everyone.
                                        </p>
                                    </div>

                                    {/* GCash QR Code Display */}
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                                        <div className="text-center space-y-2">
                                            <div className="flex items-center justify-center space-x-2">
                                                <span className="text-lg">📱</span>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Scan GCash QR Code</span>
                                            </div>
                                            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                                <img 
                                                    src="/gcash-qr.png" 
                                                    alt="GCash QR Code" 
                                                    className="w-40 h-40 mx-auto rounded-lg shadow-lg"
                                                    style={{ 
                                                        maxWidth: '100%', 
                                                        height: 'auto',
                                                        objectFit: 'contain'
                                                    }}
                                                />
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                                Open GCash app → Scan QR → Send any amount
                                            </div>
                                        </div>
                                    </div>

                                    {/* Suggested Amounts */}
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                                            Suggested Amounts (Any amount is appreciated!)
                                        </h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { amount: '₱50', emoji: '☕', desc: 'Coffee' },
                                                { amount: '₱100', emoji: '🍕', desc: 'Pizza' },
                                                { amount: '₱200', emoji: '🎉', desc: 'Party' }
                                            ].map((item, index) => (
                                                <div
                                                    key={index}
                                                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-600 transition-colors cursor-pointer"
                                                    onClick={() => {
                                                        // Show success message for QR scan
                                                        setNotificationMessage(`✅ Scan the QR code above with GCash app → Send ${item.amount} for ${item.desc} 🚀`);
                                                        setShowGCashModal(false);
                                                    }}
                                                >
                                                    <div className="text-lg mb-1">{item.emoji}</div>
                                                    <div className="text-sm font-semibold text-gray-800 dark:text-white">{item.amount}</div>
                                                    <div className="text-xs text-gray-600 dark:text-gray-400">{item.desc}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Benefits List */}
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Your support enables:
                                        </h4>
                                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-green-500">✓</span>
                                                <span>New features and improvements</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-green-500">✓</span>
                                                <span>Keep TimePilot free for everyone</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-green-500">✓</span>
                                                <span>Better performance and reliability</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Thank You Message */}
                                    <div className="text-center pt-3 border-t border-gray-200 dark:border-gray-700">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Thank you for supporting TimePilot! 🙏
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Interactive Tutorial */}
                {showInteractiveTutorial && (
                    <InteractiveTutorial
                        isActive={showInteractiveTutorial}
                        onComplete={handleInteractiveTutorialComplete}
                        onSkip={handleInteractiveTutorialSkip}
                        currentTab={activeTab}
                        onTabChange={setActiveTab}
                        tasksCount={tasks.length}
                        commitmentsCount={fixedCommitments.length}
                        onHighlightTab={setHighlightedTab}
                        onHighlightStudyPlanMode={setHighlightStudyPlanMode}
                        currentStudyPlanMode={settings.studyPlanMode}
                        hasActiveTimerSession={!!currentTask}
                    />
                )}

                {/* Tutorial Button */}
                <TutorialButton
                    onStartTutorial={handleStartTutorial}
                    hasCompletedTutorial={localStorage.getItem('timepilot-interactive-tutorial-complete') === 'true'}
                    hasTasks={tasks.length > 0}
                    isTutorialActive={showInteractiveTutorial}
                />
            </div>
        </div>
        </ErrorBoundary>
    );
}

export default App;
