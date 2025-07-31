import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Info } from 'lucide-react';
import { Task } from '../types';

interface TaskInputProps {
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
}



// Task type-specific estimation helper config
const EST_HELPER_CONFIG = {
  Writing: {
    base: 3,
    complexity: [
      { key: 'simple', label: 'Simple/familiar topic (no adjustment)', percent: 0 },
      { key: 'complex', label: 'Complex topic (+30%)', percent: 30 },
      { key: 'research', label: 'Research required first (+50%)', percent: 50 },
    ],
    factors: [
      { key: 'sources', label: 'Need to find sources (+25%)', percent: 25 },
      { key: 'drafts', label: 'Multiple drafts expected (+40%)', percent: 40 },
      { key: 'citations', label: 'Citations/formatting required (+15%)', percent: 15 },
      { key: 'editing', label: 'Editing/proofreading (+20%)', percent: 20 },
    ],
  },
  Learning: {
    base: 4,
    complexity: [
      { key: 'review', label: 'Review familiar content (no adjustment)', percent: 0 },
      { key: 'related', label: 'New but related topic (+25%)', percent: 25 },
      { key: 'new', label: 'Completely new subject (+50%)', percent: 50 },
    ],
    factors: [
      { key: 'notes', label: 'Need to take notes (+20%)', percent: 20 },
      { key: 'practice', label: 'Practice problems included (+30%)', percent: 30 },
      { key: 'guides', label: 'Create study guides (+25%)', percent: 25 },
      { key: 'memorization', label: 'Memorization required (+35%)', percent: 35 },
    ],
  },
  Planning: {
    base: 2,
    complexity: [
      { key: 'simple', label: 'Simple planning (no adjustment)', percent: 0 },
      { key: 'multi', label: 'Multi-step process (+30%)', percent: 30 },
      { key: 'coordination', label: 'Involves coordination with others (+50%)', percent: 50 },
    ],
    factors: [
      { key: 'research', label: 'Research options needed (+40%)', percent: 40 },
      { key: 'budget', label: 'Budget calculations (+20%)', percent: 20 },
      { key: 'stakeholders', label: 'Multiple stakeholders (+35%)', percent: 35 },
      { key: 'docs', label: 'Documentation required (+25%)', percent: 25 },
    ],
  },
  Creating: {
    base: 5,
    complexity: [
      { key: 'template', label: 'Using existing templates (no adjustment)', percent: 0 },
      { key: 'original', label: 'Original design (+40%)', percent: 40 },
      { key: 'newconcept', label: 'Completely new concept (+60%)', percent: 60 },
    ],
    factors: [
      { key: 'iterations', label: 'Multiple iterations expected (+50%)', percent: 50 },
      { key: 'feedback', label: 'Feedback rounds included (+30%)', percent: 30 },
      { key: 'learning', label: 'Technical learning needed (+40%)', percent: 40 },
      { key: 'approval', label: 'Client approval process (+25%)', percent: 25 },
    ],
  },
  Administrative: {
    base: 1,
    complexity: [
      { key: 'routine', label: 'Routine process (no adjustment)', percent: 0 },
      { key: 'unfamiliar', label: 'Unfamiliar forms/systems (+40%)', percent: 40 },
      { key: 'multi', label: 'Multiple steps/approvals (+60%)', percent: 60 },
    ],
    factors: [
      { key: 'waiting', label: 'Waiting time for responses (+100%)', percent: 100 },
      { key: 'docs', label: 'Document gathering needed (+50%)', percent: 50 },
      { key: 'calls', label: 'Phone calls required (+30%)', percent: 30 },
      { key: 'locations', label: 'Multiple locations/websites (+25%)', percent: 25 },
    ],
  },
};

// Map UI dropdown values to config keys
const TASK_TYPE_MAP: Record<string, keyof typeof EST_HELPER_CONFIG> = {
  Writing: 'Writing',
  Learning: 'Learning',
  Planning: 'Planning',
  Creating: 'Creating',
  'Deep Focus Work': 'Learning', // treat as Learning for now
  Administrative: 'Administrative',
  Communicating: 'Administrative', // treat as Administrative for now
};

const TaskInput: React.FC<TaskInputProps> = ({ onAddTask, onCancel }) => {
  const [showEstimationHelper, setShowEstimationHelper] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    estimatedHours: '',
    estimatedMinutes: '0', // Add minutes field
    category: '',
    customCategory: '',
    impact: '', // 'high' or 'low'
    taskType: '',
    // modifiers removed
  });
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showTimePresets, setShowTimePresets] = useState(false);
  const [estBase, setEstBase] = useState(formData.estimatedHours || '1');
  // Remove estAdjusted state, use only local let estAdjusted
  const estimationHelperRef = useRef<HTMLDivElement>(null);

  // Estimation Helper state
  const [estComplexity, setEstComplexity] = useState('');
  const [estFactors, setEstFactors] = useState<string[]>([]);

  // When task type changes, reset helper state
  useEffect(() => {
    setEstComplexity('');
    setEstFactors([]);
  }, [formData.taskType, showEstimationHelper]);

  // Get config for selected type
  const estConfig = EST_HELPER_CONFIG[TASK_TYPE_MAP[formData.taskType] || 'Writing'];

  // Calculate adjusted estimate
  let estAdjusted = Number(estBase) || 1;
  const selectedComplexity = estConfig?.complexity.find(opt => opt.key === estComplexity) || estConfig?.complexity[0];
  if (selectedComplexity) {
    estAdjusted = estAdjusted * (1 + selectedComplexity.percent / 100);
  }
  estFactors.forEach(key => {
    const factor = estConfig?.factors.find(f => f.key === key);
    if (factor) {
      estAdjusted = estAdjusted * (1 + factor.percent / 100);
    }
  });

  // Helper function to convert hours and minutes to decimal hours
  const convertToDecimalHours = (hours: string, minutes: string): number => {
    const h = parseFloat(hours) || 0;
    const m = parseFloat(minutes) || 0;
    return h + (m / 60);
  };

  // Helper function to format time display
  const formatTimeDisplay = (hours: string, minutes: string): string => {
    const h = parseFloat(hours) || 0;
    const m = parseFloat(minutes) || 0;
    const totalMinutes = h * 60 + m;
    
    if (totalMinutes === 0) return '0 minutes';
    if (totalMinutes < 60) return `${totalMinutes} minutes`;
    
    const displayHours = Math.floor(totalMinutes / 60);
    const displayMinutes = totalMinutes % 60;
    
    if (displayMinutes === 0) return `${displayHours} hour${displayHours !== 1 ? 's' : ''}`;
    return `${displayHours}h ${displayMinutes}m`;
  };

  // Helper function to convert decimal hours back to hours and minutes
  const convertFromDecimalHours = (decimalHours: number): { hours: string, minutes: string } => {
    const totalMinutes = Math.round(decimalHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours: hours.toString(), minutes: minutes.toString() };
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];
  
  // Handle category custom
  const showCustomCategory = formData.category === 'Custom...';

  // Enhanced validation with better error messages
  const isTitleValid = formData.title.trim().length > 0;
  const isTitleLengthValid = formData.title.trim().length <= 100; // Max 100 characters
  const isDeadlineValid = formData.deadline.trim().length > 0;
  const isDeadlineNotPast = formData.deadline ? formData.deadline >= today : true;
  const totalTime = convertToDecimalHours(formData.estimatedHours, formData.estimatedMinutes);
  const isEstimatedValid = totalTime > 0;
  const isEstimatedReasonable = totalTime <= 24; // Max 24 hours per task
  const isImpactValid = formData.impact !== '';
  const isCustomCategoryValid = !showCustomCategory || (formData.customCategory && formData.customCategory.trim().length > 0 && formData.customCategory.trim().length <= 50);

  const isFormValid = isTitleValid && isTitleLengthValid && isDeadlineValid && isDeadlineNotPast && 
                     isEstimatedValid && isEstimatedReasonable && isImpactValid && isCustomCategoryValid;

  // Enhanced validation messages
  const getValidationErrors = () => {
    const errors = [];
    
    if (!isTitleValid) {
      errors.push('Task title');
    } else if (!isTitleLengthValid) {
      errors.push('Task title must be 100 characters or less');
    }
    
    if (!isDeadlineValid) {
      errors.push('Deadline');
    } else if (!isDeadlineNotPast) {
      errors.push('Deadline cannot be in the past');
    }
    
    if (!isEstimatedValid) {
      errors.push('Estimated time must be greater than 0');
    } else if (!isEstimatedReasonable) {
      errors.push('Estimated time cannot exceed 24 hours');
    }
    
    if (!isImpactValid) {
      errors.push('Priority level');
    }
    
    if (showCustomCategory && !isCustomCategoryValid) {
      errors.push('Custom category must be between 1-50 characters');
    }
    
    return errors;
  };

  // --- Add warning for low-priority urgent tasks ---
  const isLowPriorityUrgent = useMemo(() => {
    if (formData.impact !== 'low' || !formData.deadline) return false;
    const deadlineDate = new Date(formData.deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline <= 3;
  }, [formData.impact, formData.deadline]);

  // When estimation helper is shown, expand more options and scroll to helper
  const handleShowEstimationHelper = () => {
    setShowMoreOptions(true);
    setShowEstimationHelper(true);
    setTimeout(() => {
      estimationHelperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    const category = showCustomCategory ? formData.customCategory : formData.category;
    const decimalHours = convertToDecimalHours(formData.estimatedHours, formData.estimatedMinutes);
    onAddTask({
      title: formData.title,
      description: formData.description,
      deadline: formData.deadline,
      estimatedHours: decimalHours,
      category,
      impact: formData.impact,
      taskType: formData.taskType,
      status: 'pending',
      importance: formData.impact === 'high',
    });
    setFormData({
      title: '',
      description: '',
      deadline: '',
      estimatedHours: '',
      estimatedMinutes: '0',
      category: '',
      customCategory: '',
      impact: '',
      taskType: '',
    });
    setShowEstimationHelper(false);
    setShowMoreOptions(false);
  };

  // Time preset buttons
  const timePresets = [
    { label: '15m', hours: '0', minutes: '15' },
    { label: '30m', hours: '0', minutes: '30' },
    { label: '45m', hours: '0', minutes: '45' },
    { label: '1h', hours: '1', minutes: '0' },
    { label: '1h 30m', hours: '1', minutes: '30' },
    { label: '2h', hours: '2', minutes: '0' },
    { label: '3h', hours: '3', minutes: '0' },
  ];

  return (
    <div className="backdrop-blur-md bg-white/80 dark:bg-black/40 rounded-3xl shadow-2xl shadow-purple-500/10 p-8 border border-white/20 dark:border-white/10 max-w-2xl mx-auto task-input-section relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-400/20 to-purple-500/20 rounded-full blur-xl"></div>
      <div className="relative">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-6 flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Plus className="text-white" size={18} />
          </div>
          <span>Add New Task</span>
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task Title & Deadline Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Task Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={formData.title}
              onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
              className={`w-full px-4 py-3 backdrop-blur-sm bg-white/70 dark:bg-black/20 border border-white/30 dark:border-white/20 rounded-xl text-base focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:text-white transition-all duration-300`}
              placeholder="e.g., Write project report"
            />
          </div>
            <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Deadline <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  min={today}
                  value={formData.deadline}
              onChange={e => setFormData(f => ({ ...f, deadline: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white dark:bg-gray-800 dark:text-white ${!isDeadlineNotPast && formData.deadline ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">When is this due or when should this be finished by?</div>
            {!isDeadlineNotPast && formData.deadline && (
              <div className="text-red-600 text-xs mt-1">Deadline cannot be in the past. Please select today or a future date.</div>
            )}
              </div>
            </div>
        {/* Description */}
            <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Description <span className="text-gray-400">(Optional)</span></label>
          <textarea
            value={formData.description}
            onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-20 border-gray-300 bg-white dark:bg-gray-800 dark:text-white"
            placeholder="Describe the task..."
              />
            </div>
        {/* Estimated Time - New Dual Input System */}
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Estimated Time <span className="text-red-500">*</span></label>
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  value={formData.estimatedHours}
                  onChange={e => {
                    const value = e.target.value;
                    if (value === '' || /^\d*$/.test(value)) {
                      setFormData(f => ({ ...f, estimatedHours: value }));
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white dark:bg-gray-800 dark:text-white"
                  placeholder="0"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hours</div>
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-lg font-bold">:</div>
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={formData.estimatedMinutes}
                  onChange={e => {
                    const value = e.target.value;
                    if (value === '' || /^\d*$/.test(value)) {
                      const numValue = parseInt(value) || 0;
                      if (numValue <= 59) {
                        setFormData(f => ({ ...f, estimatedMinutes: value }));
                      }
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white dark:bg-gray-800 dark:text-white"
                  placeholder="0"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minutes</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {totalTime > 0 && (
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {formatTimeDisplay(formData.estimatedHours, formData.estimatedMinutes)} 
                  {totalTime !== Math.round(totalTime) && ` (${totalTime.toFixed(1)} hours)`}
                </span>
              )}
            </div>
            
            {/* Time Presets - Hidden by default */}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowTimePresets(!showTimePresets)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showTimePresets ? 'Hide quick presets' : 'Show quick presets'}
              </button>
              {showTimePresets && (
                <div className="mt-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quick presets:</div>
                  <div className="flex flex-wrap gap-1">
                    {timePresets.map((preset, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setFormData(f => ({ 
                          ...f, 
                          estimatedHours: preset.hours, 
                          estimatedMinutes: preset.minutes 
                        }))}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded border transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="text-blue-600 underline text-sm mt-2 md:mt-6 md:ml-4 whitespace-nowrap"
            onClick={handleShowEstimationHelper}
          >
            Need help estimating?
          </button>
        </div>
        {/* Impact */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">How much will this impact your goals?<span className="text-red-500">*</span></label>
          <div className="flex flex-col md:flex-row gap-4 mt-2">
            <label className="flex items-center gap-2 text-base font-normal text-gray-700 dark:text-gray-100">
              <input
                type="radio"
                name="impact"
                value="high"
                checked={formData.impact === 'high'}
                onChange={() => setFormData(f => ({ ...f, impact: 'high' }))}
                required
              />
              <span>High impact (significantly affects your success/commitments)</span>
            </label>
            <label className="flex items-center gap-2 text-base font-normal text-gray-700 dark:text-gray-100">
              <input
                type="radio"
                name="impact"
                value="low"
                checked={formData.impact === 'low'}
                onChange={() => setFormData(f => ({ ...f, impact: 'low' }))}
                required
              />
              <span>Low impact (standard task, manageable if delayed)</span>
            </label>
          </div>
        </div>
        {/* More Options Collapsible */}
        <div className="border-t pt-4 mt-2">
          <button
            type="button"
            className="text-blue-600 font-medium underline focus:outline-none mb-2"
            onClick={() => setShowMoreOptions(v => !v)}
          >
            {showMoreOptions ? 'Hide More Options' : '▼ More Options'}
          </button>
          {showMoreOptions && (
            <div className="space-y-4 transition-all">
            
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Category <span className="text-gray-400">(Optional)</span></label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(f => ({ ...f, category: e.target.value, customCategory: '' }))}
                  className="w-full border rounded-lg px-3 py-2 text-base bg-white dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select category...</option>
                  {['Academics', 'Org', 'Work', 'Personal', 'Health', 'Learning', 'Finance', 'Home', 'Custom...'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {showCustomCategory && (
                  <input
                    type="text"
                    value={formData.customCategory}
                    onChange={e => setFormData(f => ({ ...f, customCategory: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 mt-2 text-base bg-white dark:bg-gray-800 dark:text-white"
                    placeholder="Enter custom category"
                  />
                )}
              </div>
              {/* Task Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Task Type</label>
                <select
                  value={formData.taskType}
                  onChange={e => setFormData(f => ({ ...f, taskType: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-base bg-white dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select task type...</option>
                  {['Planning', 'Creating', 'Learning', 'Administrative', 'Communicating', 'Deep Focus Work'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              {/* Modifiers: only show if estimation helper is enabled AND task type is selected */}
              {showEstimationHelper && formData.taskType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Modifiers (contextual)</label>
                </div>
              )}
              {/* Estimation Helper (contextual, placeholder for now) */}
              {showEstimationHelper && (
                <div ref={estimationHelperRef} className="mt-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 max-w-lg mx-auto">
                  <div className="font-semibold text-gray-800 dark:text-white mb-2">Estimation Helper</div>
                  {formData.taskType && (
                    <div className="mb-2 text-blue-700 dark:text-blue-300 font-semibold">Task Type: {formData.taskType}</div>
                  )}
                  {formData.taskType ? (
                    <>
                      <div className="mb-2 text-sm text-gray-700 dark:text-gray-200">
                        Enter your best guess for how long this task would take if it were straightforward. This helps us personalize your final estimate.
                      </div>
                      <div className="mb-2 flex items-center gap-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Base estimate:</label>
                        <div className="flex gap-1 items-center">
                          <input
                            type="number"
                            min="0"
                            value={estBase}
                            onChange={e => setEstBase(e.target.value)}
                            className="w-16 border rounded px-2 py-1 text-base bg-white dark:bg-gray-800 dark:text-white"
                            placeholder="0"
                          />
                          <span className="text-gray-600 dark:text-gray-300 text-sm">h</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value="0"
                            className="w-16 border rounded px-2 py-1 text-base bg-white dark:bg-gray-800 dark:text-white"
                            placeholder="0"
                            disabled
                          />
                          <span className="text-gray-600 dark:text-gray-300 text-sm">m</span>
                        </div>
                      </div>
                      {/* Complexity radios */}
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Complexity:</label>
                        <div className="flex flex-col gap-1">
                          {estConfig.complexity.map(opt => (
                            <label key={opt.key} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="est-complexity"
                                value={opt.key}
                                checked={estComplexity === opt.key}
                                onChange={() => setEstComplexity(opt.key)}
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {/* Factors checkboxes */}
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Factors:</label>
                        <div className="flex flex-col gap-1">
                          {estConfig.factors.map(factor => (
                            <label key={factor.key} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={estFactors.includes(factor.key)}
                                onChange={() => setEstFactors(f => f.includes(factor.key) ? f.filter(k => k !== factor.key) : [...f, factor.key])}
                              />
                              <span>{factor.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="mb-2 font-medium text-gray-800 dark:text-white">Adjusted estimate: {Number(estAdjusted).toFixed(1)} hours</div>
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                          onClick={() => {
                            const { hours, minutes } = convertFromDecimalHours(estAdjusted);
                            setFormData(f => ({ 
                              ...f, 
                              estimatedHours: hours, 
                              estimatedMinutes: minutes 
                            }));
                            setShowEstimationHelper(false);
                          }}
                        >
                          Use This
                        </button>
                        <button
                          type="button"
                          className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                          onClick={() => setShowEstimationHelper(false)}
                        >
                          Keep Original
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-600 dark:text-gray-300 italic">Select a task type to use the estimation helper.</div>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        {/* Enhanced Validation Feedback */}
        {!isFormValid && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2 dark:bg-red-900/20 dark:border-red-700">
            <div className="text-red-800 dark:text-red-200 font-medium mb-2">Please fill in the required fields:</div>
            <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
              {getValidationErrors().map((error, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Low-priority urgent warning */}
        {isLowPriorityUrgent && (
          <div className="text-yellow-600 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded mt-2 flex items-start gap-2 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-600">
            <Info className="mt-0.5" size={18} />
            <span>
              <strong>Warning:</strong> This task is <span className="font-semibold">low priority</span> but has an <span className="font-semibold">urgent deadline</span>. It may not be scheduled if you have more important urgent tasks.
            </span>
          </div>
        )}
        {/* Buttons */}
        <div className="flex space-x-3 mt-4 justify-end">
            <button
              type="submit"
            className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 text-lg shadow add-task-button"
            disabled={!isFormValid}
            >
              <Plus size={20} />
              <span>Add Task</span>
            </button>
            <button
              type="button"
            onClick={() => {
              setFormData({
                title: '',
                description: '',
                deadline: '',
                estimatedHours: '',
                estimatedMinutes: '0',
                category: '',
                customCategory: '',
                impact: '',
                taskType: '',
              });
              setShowEstimationHelper(false);
              setShowMoreOptions(false);
              if (onCancel) onCancel();
            }}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors duration-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 text-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskInput;
