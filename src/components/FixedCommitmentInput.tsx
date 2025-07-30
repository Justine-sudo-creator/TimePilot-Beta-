import React, { useState } from 'react';
import { Plus, Clock, MapPin, User, AlertTriangle } from 'lucide-react';
import { FixedCommitment } from '../types';
import { checkCommitmentConflicts } from '../utils/scheduling';

interface FixedCommitmentInputProps {
  onAddCommitment: (commitment: Omit<FixedCommitment, 'id' | 'createdAt'>) => void;
  existingCommitments: FixedCommitment[];
}

const FixedCommitmentInput: React.FC<FixedCommitmentInputProps> = ({ onAddCommitment, existingCommitments }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    recurring: true,
    daysOfWeek: [] as number[],
    specificDates: [] as string[],
    type: 'class' as const,
    location: '',
    description: ''
  });
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Enhanced validation
  const isTitleValid = formData.title.trim().length > 0;
  const isTitleLengthValid = formData.title.trim().length <= 100;
  const isStartTimeValid = formData.startTime.trim().length > 0;
  const isEndTimeValid = formData.endTime.trim().length > 0;
  const isDaysValid = formData.recurring ? formData.daysOfWeek.length > 0 : true;
  const isDatesValid = !formData.recurring ? formData.specificDates.length > 0 : true;
  const isTimeRangeValid = formData.startTime && formData.endTime ? 
    formData.startTime < formData.endTime : true;
  const isLocationValid = !formData.location || formData.location.trim().length <= 200;

  const isFormValid = isTitleValid && isTitleLengthValid && isStartTimeValid && 
                     isEndTimeValid && isDaysValid && isDatesValid && isTimeRangeValid && isLocationValid;



  const daysOfWeekOptions = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 0, label: 'Sun' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    // Clear any previous validation errors
    setConflictError(null);
    
    // Check for conflicts
    const conflictCheck = checkCommitmentConflicts(formData, existingCommitments);
    
    if (conflictCheck.hasConflict) {
      const conflictingCommitment = conflictCheck.conflictingCommitment!;
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      let conflictDescription = '';
      
      if (conflictingCommitment.recurring) {
        const conflictingDays = conflictingCommitment.daysOfWeek.map(day => dayNames[day]).join(', ');
        conflictDescription = `(${conflictingDays}, ${conflictingCommitment.startTime}-${conflictingCommitment.endTime})`;
      } else {
        const conflictingDates = conflictingCommitment.specificDates?.map(date => new Date(date).toLocaleDateString()).join(', ') || '';
        conflictDescription = `(${conflictingDates}, ${conflictingCommitment.startTime}-${conflictingCommitment.endTime})`;
      }
      
      if (conflictCheck.conflictType === 'strict') {
        setConflictError(
          `Time conflict with "${conflictingCommitment.title}" ${conflictDescription}. Please adjust your schedule.`
        );
        return;
      } else if (conflictCheck.conflictType === 'override') {
        // For override conflicts, show a different message
        if (!formData.recurring) {
          setConflictError(
            `This one-time commitment will override the recurring commitment "${conflictingCommitment.title}" on the selected dates.`
          );
          // Don't return - allow the override to proceed
        } else {
          const conflictingDates = conflictCheck.conflictingDates?.map(date => new Date(date).toLocaleDateString()).join(', ') || '';
          setConflictError(
            `This recurring commitment conflicts with one-time commitments on: ${conflictingDates}. These dates will be excluded from the recurring schedule.`
          );
          // Don't return - allow the override to proceed
        }
      }
    }

    // Clear any previous conflict errors
    setConflictError(null);
    
    onAddCommitment(formData);
    setFormData({
      title: '',
      startTime: '',
      endTime: '',
      recurring: true,
      daysOfWeek: [],
      specificDates: [],
      type: 'class',
      location: '',
      description: ''
    });
    setIsOpen(false);
  };

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort()
    }));
  };


  return (
    <div className="bg-white rounded-xl shadow-lg p-6 dark:bg-gray-900 dark:shadow-gray-900">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Add Fixed Commitment</h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 add-commitment-button"
        >
          <Plus size={20} />
          <span>Add Commitment</span>
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
                Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                placeholder="e.g., Linear Algebra Lecture"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
                Type
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-gray-400" size={20} />
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as typeof formData.type
                    })
                  }
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <option value="class">Class</option>
                  <option value="work">Work</option>
                  <option value="appointment">Appointment</option>
                  <option value="other">Other</option>
                </select>
              </div>
                      </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
              Commitment Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="recurring"
                  checked={formData.recurring}
                  onChange={() => setFormData({ ...formData, recurring: true, specificDates: [] })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">Recurring</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="recurring"
                  checked={!formData.recurring}
                  onChange={() => setFormData({ ...formData, recurring: false, daysOfWeek: [] })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">One-time</span>
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
                Start Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 text-gray-400" size={20} />
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
                End Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 text-gray-400" size={20} />
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

                  {formData.recurring ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">
              Days of Week
            </label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeekOptions.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleDayToggle(day.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    formData.daysOfWeek.includes(day.value)
                      ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">
              Specific Dates
            </label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !formData.specificDates.includes(e.target.value)) {
                      setFormData({
                        ...formData,
                        specificDates: [...formData.specificDates, e.target.value].sort()
                      });
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">Add date</span>
              </div>
              {formData.specificDates.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.specificDates.map((date) => (
                    <div
                      key={date}
                      className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-lg dark:bg-blue-900/20 dark:text-blue-300"
                    >
                      <span className="text-sm">{new Date(date).toLocaleDateString()}</span>
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          specificDates: formData.specificDates.filter(d => d !== date)
                        })}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

          <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
              Location (Optional)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 text-gray-400" size={20} />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                placeholder="e.g., Room 101, Main Building"
              />
            </div>
          </div>

          <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              rows={2}
              placeholder="Additional notes about this commitment..."
            />
          </div>

          {/* Conflict Error Display */}
          {conflictError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-700">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="text-red-500 mt-0.5" size={16} />
                <span className="text-sm text-red-700 dark:text-red-300">{conflictError}</span>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="submit"
              className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Add Commitment</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors duration-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default FixedCommitmentInput;