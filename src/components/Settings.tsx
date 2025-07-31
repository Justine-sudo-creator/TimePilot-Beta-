import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Clock, AlertTriangle, Calendar, Zap, Sun } from 'lucide-react';
import { UserSettings, StudyPlan } from '../types';
import { checkSessionStatus } from '../utils/scheduling';

interface SettingsProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onRestartTutorial?: () => void;
  hasTasks?: boolean;
  highlightStudyPlanMode?: boolean; // New prop to highlight study plan mode during tutorial
  studyPlans?: StudyPlan[]; // New prop to check for missed sessions
  canChangeSetting?: (settingKey: string) => boolean; // New prop to check if a setting can be changed
}

const Settings: React.FC<SettingsProps> = ({ 
  settings, 
  onUpdateSettings, 
  darkMode, 
  onToggleDarkMode, 
  onRestartTutorial, 
  hasTasks = true, 
  highlightStudyPlanMode = false, 
  studyPlans = [],
  canChangeSetting = () => true
}) => {
  const [dailyAvailableHours, setDailyAvailableHours] = useState(settings.dailyAvailableHours);
  const [workDays, setWorkDays] = useState<number[]>(settings.workDays || [0, 1, 2, 3, 4, 5, 6]);
  const [bufferDays, setBufferDays] = useState(settings.bufferDays);
  const [minSessionLength, setMinSessionLength] = useState(settings.minSessionLength || 15);
  const [bufferTimeBetweenSessions, setBufferTimeBetweenSessions] = useState(settings.bufferTimeBetweenSessions ?? 0);
  const [studyWindowStartHour, setStudyWindowStartHour] = useState(settings.studyWindowStartHour || 6);
  const [studyWindowEndHour, setStudyWindowEndHour] = useState(settings.studyWindowEndHour || 23);
  const [studyPlanMode, setStudyPlanMode] = useState(settings.studyPlanMode || 'even');

  // Update local state when settings prop changes (e.g., on initial load or external update)
  useEffect(() => {
    setDailyAvailableHours(settings.dailyAvailableHours);
    setWorkDays(settings.workDays || [0, 1, 2, 3, 4, 5, 6]);
    setBufferDays(settings.bufferDays);
    setMinSessionLength(settings.minSessionLength || 15);
    setBufferTimeBetweenSessions(settings.bufferTimeBetweenSessions ?? 0);
    setStudyWindowStartHour(settings.studyWindowStartHour || 6);
    setStudyWindowEndHour(settings.studyWindowEndHour || 23);
    setStudyPlanMode(settings.studyPlanMode || 'even');
  }, [settings]);

  // Enhanced validation functions with better error prevention
  const validateStudyWindow = () => {
    if (studyWindowStartHour >= studyWindowEndHour) {
      return {
        isValid: false,
        message: "End time must be after start time."
      };
    }
    if (studyWindowStartHour < 0 || studyWindowStartHour > 23) {
      return {
        isValid: false,
        message: "Start time must be between 0 and 23."
      };
    }
    if (studyWindowEndHour < 0 || studyWindowEndHour > 23) {
      return {
        isValid: false,
        message: "End time must be between 0 and 23."
      };
    }
    return { isValid: true, message: "" };
  };

  const validateDailyHoursVsStudyWindow = () => {
    const studyWindowHours = studyWindowEndHour - studyWindowStartHour;
    if (studyWindowHours < dailyAvailableHours) {
      return {
        isValid: false,
        message: `Your study window (${studyWindowHours} hours) is shorter than your daily available hours (${dailyAvailableHours} hours). This will prevent TimePilot from scheduling all your planned study time.`
      };
    }
    return { isValid: true, message: "" };
  };

  const validateDailyHours = () => {
    if (dailyAvailableHours <= 0) {
      return {
        isValid: false,
        message: "Daily available hours must be greater than 0."
      };
    }
    if (dailyAvailableHours > 24) {
      return {
        isValid: false,
        message: "Daily available hours cannot exceed 24 hours."
      };
    }
    return { isValid: true, message: "" };
  };

  const validateMinSessionLength = () => {
    if (minSessionLength < 5) {
      return {
        isValid: false,
        message: "Minimum session length must be at least 5 minutes."
      };
    }
    if (minSessionLength > 480) { // 8 hours
      return {
        isValid: false,
        message: "Minimum session length cannot exceed 8 hours."
      };
    }
    return { isValid: true, message: "" };
  };

  const validateBufferTime = () => {
    const studyWindowHours = studyWindowEndHour - studyWindowStartHour;
    const totalBufferTimeHours = (bufferTimeBetweenSessions * Math.ceil(dailyAvailableHours / (minSessionLength / 60))) / 60;
    const effectiveStudyTime = studyWindowHours - totalBufferTimeHours;
    
    if (effectiveStudyTime < dailyAvailableHours) {
      return {
        isValid: false,
        message: `With your current buffer time settings, you may not have enough effective study time. Consider reducing buffer time or increasing your study window.`
      };
    }
    return { isValid: true, message: "" };
  };

  const validateWorkDays = () => {
    if (workDays.length === 0) {
      return {
        isValid: false,
        message: "You must select at least one work day."
      };
    }
    return { isValid: true, message: "" };
  };

  const validateMissedSessions = () => {
    // Check for missed sessions across all study plans
    const missedSessions = studyPlans.flatMap(plan => 
      plan.plannedTasks.filter(session => {
        const status = checkSessionStatus(session, plan.date);
        return status === 'missed';
      })
    );

    if (missedSessions.length > 0) {
      return {
        isValid: false,
        message: `You have ${missedSessions.length} missed session${missedSessions.length > 1 ? 's' : ''}. Please go to the Study Plan tab to redistribute or skip these sessions before changing settings.`
      };
    }
    return { isValid: true, message: "" };
  };

  const validateRescheduledSessions = () => {
    // Check for rescheduled/redistributed sessions across all study plans
    const rescheduledSessions = studyPlans.flatMap(plan => 
      plan.plannedTasks.filter(session => {
        // Check if session is manually rescheduled or redistributed
        return session.isManualOverride === true || (!!session.originalTime && !!session.originalDate);
      })
    );

    if (rescheduledSessions.length > 0) {
      return {
        isValid: false,
        message: `You have ${rescheduledSessions.length} rescheduled session${rescheduledSessions.length > 1 ? 's' : ''}. Please go to the Study Plan tab to handle these sessions before changing settings.`
      };
    }
    return { isValid: true, message: "" };
  };

  const getValidationMessages = () => {
    const messages = [];
    
    const dailyHoursValidation = validateDailyHours();
    if (!dailyHoursValidation.isValid) {
      messages.push({ type: 'error', message: dailyHoursValidation.message });
    }
    
    const workDaysValidation = validateWorkDays();
    if (!workDaysValidation.isValid) {
      messages.push({ type: 'error', message: workDaysValidation.message });
    }
    
    const minSessionValidation = validateMinSessionLength();
    if (!minSessionValidation.isValid) {
      messages.push({ type: 'error', message: minSessionValidation.message });
    }
    
    const windowValidation = validateStudyWindow();
    if (!windowValidation.isValid) {
      messages.push({ type: 'error', message: windowValidation.message });
    }
    
    const hoursValidation = validateDailyHoursVsStudyWindow();
    if (!hoursValidation.isValid) {
      messages.push({ type: 'warning', message: hoursValidation.message });
    }
    
    const bufferValidation = validateBufferTime();
    if (!bufferValidation.isValid) {
      messages.push({ type: 'warning', message: bufferValidation.message });
    }

    const missedSessionsValidation = validateMissedSessions();
    if (!missedSessionsValidation.isValid) {
      messages.push({ type: 'error', message: missedSessionsValidation.message });
    }
    
    const rescheduledSessionsValidation = validateRescheduledSessions();
    if (!rescheduledSessionsValidation.isValid) {
      messages.push({ type: 'error', message: rescheduledSessionsValidation.message });
    }
    
    return messages;
  };

  const validationMessages = getValidationMessages();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for missed sessions before saving
    const missedSessionsValidation = validateMissedSessions();
    if (!missedSessionsValidation.isValid) {
      // Don't save settings if there are missed sessions
      return;
    }
    
    // Check for rescheduled sessions before saving
    const rescheduledSessionsValidation = validateRescheduledSessions();
    if (!rescheduledSessionsValidation.isValid) {
      // Don't save settings if there are rescheduled sessions
      return;
    }
    
    onUpdateSettings({
      dailyAvailableHours,
      workDays,
      bufferDays,
      minSessionLength,
      bufferTimeBetweenSessions,
      studyWindowStartHour,
      studyWindowEndHour,
      shortBreakDuration: settings.shortBreakDuration || 5,
      longBreakDuration: settings.longBreakDuration || 15,
      maxConsecutiveHours: settings.maxConsecutiveHours || 4,
      avoidTimeRanges: settings.avoidTimeRanges || [],
      weekendStudyHours: settings.weekendStudyHours || 4,
      autoCompleteSessions: settings.autoCompleteSessions || false,
      enableNotifications: settings.enableNotifications !== false,
      studyPlanMode
    });
  };

  const handleWorkDayChange = (dayIndex: number) => {
    setWorkDays(prevDays =>
      prevDays.includes(dayIndex)
        ? prevDays.filter(day => day !== dayIndex)
        : [...prevDays, dayIndex].sort((a, b) => a - b)
    );
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Helper function to check if a setting is disabled
  const isSettingDisabled = (settingKey: string) => {
    return !canChangeSetting(settingKey);
  };

  // Helper function to get disabled styling
  const getDisabledStyling = (settingKey: string) => {
    return isSettingDisabled(settingKey) 
      ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' 
      : '';
  };

  return (
    <div className="backdrop-blur-md bg-white/80 dark:bg-black/40 rounded-3xl shadow-2xl shadow-purple-500/10 p-6 border border-white/20 dark:border-white/10">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-6 flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
          <SettingsIcon className="text-white" size={18} />
        </div>
        <span>Your Study Preferences</span>
      </h2>

      {/* Validation Messages */}
      {validationMessages.length > 0 && (
        <div className="mb-6 space-y-3">
          {validationMessages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start space-x-3 p-4 rounded-2xl backdrop-blur-sm border ${
                msg.type === 'error'
                  ? 'bg-red-500/10 border-red-300/50 dark:border-red-500/30'
                  : 'bg-yellow-500/10 border-yellow-300/50 dark:border-yellow-500/30'
              }`}
            >
              <AlertTriangle 
                size={16} 
                className={`mt-0.5 ${
                  msg.type === 'error' 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-yellow-600 dark:text-yellow-400'
                }`} 
              />
              <p className={`text-sm ${
                msg.type === 'error' 
                  ? 'text-red-700 dark:text-red-300' 
                  : 'text-yellow-700 dark:text-yellow-300'
              }`}>
                {msg.message}
              </p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Two Column Layout for Main Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
        {/* Daily Available Hours */}
        <div>
              <label htmlFor="dailyHours" className="flex text-sm font-medium text-gray-700 mb-1 items-center space-x-2 dark:text-gray-200">
                <Clock size={16} className="text-gray-500 dark:text-gray-400" />
            <span>How many hours can you study per day?</span>
          </label>
              <p className="text-xs text-gray-500 mb-1 dark:text-gray-400">This includes all your study time for the day.</p>
          <input
            type="number"
            id="dailyHours"
            value={dailyAvailableHours}
            onChange={(e) => setDailyAvailableHours(Number(e.target.value))}
            min="1"
            max="24"
            disabled={isSettingDisabled('dailyAvailableHours')}
            className={`block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white ${getDisabledStyling('dailyAvailableHours')}`}
            required
          />
        </div>

        {/* Buffer Days */}
        <div>
              <label htmlFor="bufferDays" className="flex text-sm font-medium text-gray-700 mb-1 items-center space-x-2 dark:text-gray-200">
                <Sun size={16} className="text-gray-500 dark:text-gray-400" />
            <span>How many days before the deadline do you want to finish each task?</span>
          </label>
              <p className="text-xs text-gray-500 mb-1 dark:text-gray-400">This creates a buffer, so tasks are completed ahead of time.</p>
          <input
            type="number"
            id="bufferDays"
            value={bufferDays}
            onChange={(e) => setBufferDays(Number(e.target.value))}
            min="0"
            disabled={isSettingDisabled('bufferDays')}
            className={`block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white ${getDisabledStyling('bufferDays')}`}
            required
          />
        </div>

        {/* Minimum Session Length */}
        <div>
              <label htmlFor="minSessionLength" className="flex text-sm font-medium text-gray-700 mb-1 items-center space-x-2 dark:text-gray-200">
                <Clock size={16} className="text-gray-500 dark:text-gray-400" />
            <span>Minimum Session Length</span>
          </label>
              <p className="text-xs text-gray-500 mb-1 dark:text-gray-400">The shortest session that can be scheduled. Sessions shorter than this will be distributed intelligently or skipped to maintain accuracy.</p>
          <select
            id="minSessionLength"
            value={minSessionLength}
            onChange={(e) => setMinSessionLength(Number(e.target.value))}
            disabled={isSettingDisabled('minSessionLength')}
            className={`block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white ${getDisabledStyling('minSessionLength')}`}
          >
            <option value={5}>5 minutes (micro-tasks)</option>
            <option value={10}>10 minutes (quick tasks)</option>
            <option value={15}>15 minutes (standard)</option>
            <option value={20}>20 minutes (focused work)</option>
            <option value={30}>30 minutes (deep work)</option>
          </select>
        </div>

        {/* Buffer Time Between Sessions */}
        <div>
              <label htmlFor="bufferTimeBetweenSessions" className="flex text-sm font-medium text-gray-700 mb-1 items-center space-x-2 dark:text-gray-200">
                <Clock size={16} className="text-gray-500 dark:text-gray-400" />
            <span>Buffer Time Between Sessions</span>
          </label>
              <p className="text-xs text-gray-500 mb-1 dark:text-gray-400">Add buffer time between study sessions for mental breaks, transitions, and to prevent burnout.</p>
          <select
            id="bufferTimeBetweenSessions"
            value={bufferTimeBetweenSessions}
            onChange={(e) => setBufferTimeBetweenSessions(Number(e.target.value))}
            disabled={isSettingDisabled('bufferTimeBetweenSessions')}
            className={`block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white ${getDisabledStyling('bufferTimeBetweenSessions')}`}
          >
            <option value={0}>No buffer</option>
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={20}>20 minutes</option>
            <option value={30}>30 minutes</option>
          </select>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Work Days Selection */}
            <div className="calendar-settings-section">
              <label className="flex text-sm font-medium text-gray-700 mb-1 items-center space-x-2 dark:text-gray-200">
                <Calendar size={16} className="text-gray-500 dark:text-gray-400" />
                <span>Which days are your primary study days?</span>
              </label>
              <p className="text-xs text-gray-500 mb-1 dark:text-gray-400">Study plans will primarily be generated for these days.</p>
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-1">
                {dayNames.map((dayName, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleWorkDayChange(index)}
                    disabled={isSettingDisabled('workDays')}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors duration-200
                      ${workDays.includes(index)
                        ? 'bg-blue-600 text-white shadow-md dark:bg-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                      } ${isSettingDisabled('workDays') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {dayName.substring(0, 3)} {/* Display short day name */}
                  </button>
                ))}
              </div>
        </div>

        {/* Study Window Settings */}
            <div className="space-y-2 study-window-section">
          <div>
                <label className="flex text-sm font-medium text-gray-700 mb-1 items-center space-x-2 dark:text-gray-200">
                  <Clock size={16} className="text-gray-500 dark:text-gray-400" />
              <span>Study Window</span>
            </label>
                <p className="text-xs text-gray-500 mb-1 dark:text-gray-400">Define when you're available to study each day. Sessions will only be scheduled within this time window.</p>
          </div>
          
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Study Window Start */}
            <div>
              <label htmlFor="studyWindowStart" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
                Start Time
              </label>
              <select
                id="studyWindowStart"
                value={studyWindowStartHour}
                onChange={(e) => setStudyWindowStartHour(Number(e.target.value))}
                disabled={isSettingDisabled('studyWindowStartHour')}
                className={`block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white ${getDisabledStyling('studyWindowStartHour')}`}
              >
                {Array.from({length: 24}, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                  </option>
                ))}
              </select>
            </div>

            {/* Study Window End */}
            <div>
              <label htmlFor="studyWindowEnd" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
                End Time
              </label>
              <select
                id="studyWindowEnd"
                value={studyWindowEndHour}
                onChange={(e) => setStudyWindowEndHour(Number(e.target.value))}
                disabled={isSettingDisabled('studyWindowEndHour')}
                className={`block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white ${getDisabledStyling('studyWindowEndHour')}`}
              >
                {Array.from({length: 24}, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
              {/* Study Window Summary */}
              <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                <strong>Study Window:</strong> {studyWindowStartHour === 0 ? '12 AM' : studyWindowStartHour < 12 ? `${studyWindowStartHour} AM` : studyWindowStartHour === 12 ? '12 PM' : `${studyWindowStartHour - 12} PM`} - {studyWindowEndHour === 0 ? '12 AM' : studyWindowEndHour < 12 ? `${studyWindowEndHour} AM` : studyWindowEndHour === 12 ? '12 PM' : `${studyWindowEndHour - 12} PM`} ({studyWindowEndHour - studyWindowStartHour} hours available)
              </div>
        </div>

        {/* Study Plan Mode */}
            <div className={`${highlightStudyPlanMode ? 'ring-2 ring-yellow-400 animate-pulse shadow-lg shadow-yellow-400/50 rounded-lg p-3 bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">Study Plan Mode</label>
              <div className="flex flex-col gap-1">
            <label className={`flex items-center gap-2 ${isSettingDisabled('studyPlanMode') ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="radio"
                name="studyPlanMode"
                value="eisenhower"
                checked={studyPlanMode === 'eisenhower'}
                onChange={() => setStudyPlanMode('eisenhower')}
                disabled={isSettingDisabled('studyPlanMode')}
                className="form-radio text-blue-600"
              />
                  <span className="text-sm text-gray-700 dark:text-gray-200">Eisenhower Matrix <span className="text-xs text-gray-500 dark:text-gray-400">(finish important & urgent tasks first)</span></span>
            </label>
            <label className={`flex items-center gap-2 ${isSettingDisabled('studyPlanMode') ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="radio"
                name="studyPlanMode"
                value="even"
                checked={studyPlanMode === 'even'}
                onChange={() => setStudyPlanMode('even')}
                disabled={isSettingDisabled('studyPlanMode')}
                className="form-radio text-blue-600"
              />
                  <span className="text-sm text-gray-700 dark:text-gray-200">Evenly Distributed <span className="text-xs text-gray-500 dark:text-gray-400">(spread all tasks equally)</span></span>
            </label>
            <label className={`flex items-center gap-2 ${isSettingDisabled('studyPlanMode') ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="radio"
                name="studyPlanMode"
                value="balanced"
                checked={studyPlanMode === 'balanced'}
                onChange={() => setStudyPlanMode('balanced')}
                disabled={isSettingDisabled('studyPlanMode')}
                className="form-radio text-blue-600"
              />
                  <span className="text-sm text-gray-700 dark:text-gray-200">Balanced Priority <span className="text-xs text-gray-500 dark:text-gray-400">(priority-based even distribution)</span></span>
            </label>
              </div>
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div><strong>Eisenhower:</strong> Tasks scheduled by importance & urgency first</div>
                <div><strong>Even Distribution:</strong> All tasks spread equally across available time</div>
                <div><strong>Balanced Priority:</strong> Important tasks get priority but are evenly distributed within their tier</div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Width Sections */}
        <div className="space-y-3">
        {/* Dark Mode Toggle */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
                <Zap size={16} className="text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Theme</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {darkMode ? 'Dark Mode' : 'Light Mode'}
              </span>
              <button
                type="button"
                onClick={onToggleDarkMode}
                disabled={isSettingDisabled('darkMode')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  darkMode ? 'bg-blue-600' : 'bg-gray-200'
                } ${isSettingDisabled('darkMode') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Tutorial Restart */}
        {onRestartTutorial && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Need Help?
                </span>
              </div>
              <button
                type="button"
                onClick={onRestartTutorial}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                {!hasTasks ? 'Start Tutorial' : 'Restart Tutorial'}
              </button>
            </div>
            {!hasTasks && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The tutorial will guide you through adding your first task and using TimePilot effectively.
              </p>
            )}
          </div>
        )}



        {/* Save Button */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="submit"
              disabled={validationMessages.some(msg => msg.type === 'error')}
              className={`w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                validationMessages.some(msg => msg.type === 'error')
                  ? 'bg-gray-400 cursor-not-allowed dark:bg-gray-600'
                  : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
              }`}
          >
            {validationMessages.some(msg => msg.type === 'error') && (validateMissedSessions().isValid === false || validateRescheduledSessions().isValid === false)
              ? 'Handle Sessions First' 
              : 'Save Settings'
            }
          </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Settings;
