import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, BookOpen, X, Play, Trash2 } from 'lucide-react';
import { StudyPlan, FixedCommitment, Task } from '../types';
import { checkSessionStatus, formatTime } from '../utils/scheduling';
import moment from 'moment';
import CommitmentSessionManager from './CommitmentSessionManager';

interface MobileCalendarViewProps {
  studyPlans: StudyPlan[];
  fixedCommitments: FixedCommitment[];
  tasks: Task[];
  onSelectTask?: (task: Task, session?: { allocatedHours: number; planDate?: string; sessionNumber?: number }) => void;
  onStartManualSession?: (commitment: FixedCommitment, durationSeconds: number) => void;
  onDeleteFixedCommitment?: (commitmentId: string) => void;
  onDeleteCommitmentSession?: (commitmentId: string, date: string) => void;
  onEditCommitmentSession?: (commitmentId: string, date: string, updates: {
    startTime?: string;
    endTime?: string;
    title?: string;
    type?: 'class' | 'work' | 'appointment' | 'other' | 'buffer';
  }) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: 'study' | 'commitment';
    data: any;
  };
}

const MobileCalendarView: React.FC<MobileCalendarViewProps> = ({
  studyPlans,
  fixedCommitments,
  tasks,
  onSelectTask,
  onStartManualSession,
  onDeleteFixedCommitment,
  onDeleteCommitmentSession,
  onEditCommitmentSession,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [selectedSessionToManage, setSelectedSessionToManage] = useState<{
    commitment: FixedCommitment;
    date: string;
  } | null>(null);

  // Generate dates for the horizontal picker (7 days around selected date)
  const dateRange = useMemo(() => {
    const dates = [];
    const startDate = moment(selectedDate).subtract(3, 'days');
    for (let i = 0; i < 7; i++) {
      dates.push(moment(startDate).add(i, 'days').toDate());
    }
    return dates;
  }, [selectedDate]);

  // Get events for the selected date
  const selectedDateEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    const selectedDateStr = moment(selectedDate).format('YYYY-MM-DD');

    // --- Study Sessions ---
    const selectedPlan = studyPlans.find(plan => plan.date === selectedDateStr);
    if (selectedPlan) {
      selectedPlan.plannedTasks.forEach(session => {
        const task = tasks.find(t => t.id === session.taskId);
        if (task) {
          // Ensure correct parsing of startTime and endTime for the selectedDate
          const startTime = moment(selectedDate)
            .set({
              hour: parseInt(session.startTime.split(':')[0], 10),
              minute: parseInt(session.startTime.split(':')[1], 10),
              second: 0,
              millisecond: 0
            });
          const endTime = moment(selectedDate)
            .set({
              hour: parseInt(session.endTime.split(':')[0], 10),
              minute: parseInt(session.endTime.split(':')[1], 10),
              second: 0,
              millisecond: 0
            });

          events.push({
            id: `${session.taskId}-${session.sessionNumber}`, // Unique ID for each session
            title: `${task.title} (Session ${session.sessionNumber})`,
            start: startTime.toDate(),
            end: endTime.toDate(),
            resource: {
              type: 'study',
              data: { session, task }
            }
          });
        }
      });
    }

    // --- Fixed Commitments ---
    const dayOfWeek = selectedDate.getDay();
    fixedCommitments.forEach(commitment => {
      let shouldInclude = false;
      
      if (commitment.recurring) {
        // For recurring commitments, check if the day of week matches
        shouldInclude = commitment.daysOfWeek.includes(dayOfWeek);
      } else {
        // For non-recurring commitments, check if the specific date matches
        shouldInclude = commitment.specificDates?.includes(selectedDateStr) || false;
      }
      
      if (shouldInclude) {
        const dateString = selectedDateStr;
        
        // Skip deleted occurrences to prevent them from being displayed
        if (commitment.deletedOccurrences?.includes(dateString)) {
          return; 
        }

        // Check for modified occurrence for the specific date
        const modifiedSession = commitment.modifiedOccurrences?.[dateString];
        
        // Use modified times if they exist, otherwise use original commitment times
        const [startHour, startMinute] = (modifiedSession?.startTime || commitment.startTime).split(':').map(Number);
        const [endHour, endMinute] = (modifiedSession?.endTime || commitment.endTime).split(':').map(Number);
        
        // Set the hour and minute on the selectedDate to create the correct timestamp
        const startTime = moment(selectedDate)
          .set({
            hour: startHour,
            minute: startMinute,
            second: 0,
            millisecond: 0
          });
        const endTime = moment(selectedDate)
          .set({
            hour: endHour,
            minute: endMinute,
            second: 0,
            millisecond: 0
          });
        
        events.push({
          id: commitment.id, // Using commitment ID as the event ID
          title: modifiedSession?.title || commitment.title,
          start: startTime.toDate(),
          end: endTime.toDate(),
          resource: {
            type: 'commitment',
            data: {
              ...commitment, // Spread original commitment data
              title: modifiedSession?.title || commitment.title, // Override with modified title if present
              startTime: modifiedSession?.startTime || commitment.startTime, // Override with modified start time if present
              endTime: modifiedSession?.endTime || commitment.endTime, // Override with modified end time if present
              type: modifiedSession?.type || commitment.type // Override with modified type if present
            }
          }
        });
      }
    });

    // Sort events by start time to ensure correct chronological display
    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [selectedDate, studyPlans, fixedCommitments, tasks]);

  // Generate time slots (4 AM to 11 PM) for the vertical timeline
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 4; hour <= 23; hour++) {
      slots.push(hour);
    }
    return slots;
  }, []);

  // Determine event color based on type and status
  const getEventColor = (event: CalendarEvent) => {
    if (event.resource.type === 'commitment') {
      const commitment = event.resource.data as FixedCommitment;
      switch (commitment.type) {
        case 'class': return '#3b82f6'; // Blue
        case 'work': return '#a21caf';    // Purple
        case 'appointment': return '#f59e42'; // Orange
        case 'other': return '#14b8a6';   // Teal
        case 'buffer': return '#64748b'; // Gray (default for buffer)
        default: return '#64748b';       // Default gray
      }
    } else {
      const { session, task } = event.resource.data;
      const sessionStatus = checkSessionStatus(session, moment(selectedDate).format('YYYY-MM-DD'));
      
      if (sessionStatus === 'missed') return '#dc2626';  // Red
      if (sessionStatus === 'overdue') return '#c2410c'; // Darker Orange/Brown
      if (session.done || session.status === 'completed') return '#d1d5db'; // Light Gray (completed)
      if (task.importance) return '#f59e0b';           // Amber (important tasks)
      
      // Fallback to category color if available
      return task.category ? getCategoryColor(task.category) : '#64748b'; // Default gray
    }
  };

  // Helper to get color based on task category
  const getCategoryColor = (category: string): string => {
    switch (category.toLowerCase()) {
      case 'academics': return '#3b82f6';
      case 'personal': return '#a21caf';
      case 'learning': return '#a855f7';
      case 'home': return '#f472b6';
      case 'finance': return '#10b981';
      case 'organization': return '#eab308';
      case 'work': return '#f59e0b';
      case 'health': return '#ef4444';
      default: return '#64748b';
    }
  };

  // Handle click on a calendar event
  const handleEventClick = (event: CalendarEvent) => {
    if (event.resource.type === 'commitment') {
      // For commitments, open the session manager to allow editing/deletion of occurrences
      const commitment = event.resource.data as FixedCommitment;
      const dateString = moment(selectedDate).format('YYYY-MM-DD');
      
      // Prevent interaction with explicitly deleted occurrences
      if (commitment.deletedOccurrences?.includes(dateString)) {
        return; 
      }
      
      setSelectedSessionToManage({
        commitment,
        date: dateString
      });
      setShowSessionManager(true);
    } else {
      // For study sessions, show a simple detail modal
      setSelectedEvent(event);
    }
  };

  // Handle starting a manual commitment session from the detail modal
  const handleStartSession = () => {
    if (selectedEvent && selectedEvent.resource.type === 'commitment' && onStartManualSession) {
      const commitment = selectedEvent.resource.data as FixedCommitment;
      // Calculate duration in seconds
      const startMoment = moment(commitment.startTime, 'HH:mm');
      const endMoment = moment(commitment.endTime, 'HH:mm');
      let durationMinutes = endMoment.diff(startMoment, 'minutes');
      if (durationMinutes < 0) { // Handle overnight commitments
        durationMinutes += 24 * 60;
      }
      onStartManualSession(commitment, durationMinutes * 60);
    }
    setSelectedEvent(null); // Close modal after starting
  };

  // Handle deleting a fixed commitment from the detail modal (deletes the entire commitment)
  const handleDeleteSession = () => {
    if (selectedEvent && selectedEvent.resource.type === 'commitment' && onDeleteFixedCommitment) {
      onDeleteFixedCommitment(selectedEvent.resource.data.id);
    }
    setSelectedEvent(null); // Close modal after deleting
  };

  // Callback for deleting a specific occurrence of a commitment from the session manager
  const handleDeleteCommitmentSession = (commitmentId: string, date: string) => {
    if (onDeleteCommitmentSession) {
      onDeleteCommitmentSession(commitmentId, date);
    }
    setShowSessionManager(false);
    setSelectedSessionToManage(null);
  };

  // Callback for editing a specific occurrence of a commitment from the session manager
  const handleEditCommitmentSession = (commitmentId: string, date: string, updates: {
    startTime?: string;
    endTime?: string;
    title?: string;
    type?: 'class' | 'work' | 'appointment' | 'other' | 'buffer';
  }) => {
    if (onEditCommitmentSession) {
      onEditCommitmentSession(commitmentId, date, updates);
    }
    setShowSessionManager(false);
    setSelectedSessionToManage(null);
  };

  // Cancel button handler for the session manager modal
  const handleCancelSessionManager = () => {
    setShowSessionManager(false);
    setSelectedSessionToManage(null);
  };

  // Format hour for time slot display (e.g., "4 AM", "1 PM")
  const formatTimeSlot = (hour: number) => {
    return moment().hour(hour).format('h A');
  };

  // Filter events for a specific time slot to display on the timeline
  const getEventsForTimeSlot = (hour: number) => {
    return selectedDateEvents.filter(event => {
      const eventStartHour = event.start.getHours();
      const eventEndHour = event.end.getHours();
      // An event is relevant for a slot if it starts at or before the hour and ends after the hour.
      // This ensures events spanning multiple hours are shown in each relevant hour slot.
      return eventStartHour <= hour && eventEndHour > hour;
    });
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-2xl shadow-xl p-4 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center space-x-2">
          <BookOpen className="text-blue-600 dark:text-blue-400" size={24} />
          <span>Calendar</span>
        </h2>
      </div>

      {/* Horizontal Date Picker */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setSelectedDate(moment(selectedDate).subtract(7, 'days').toDate())}
            className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {moment(selectedDate).format('MMMM YYYY')}
          </span>
          <button
            onClick={() => setSelectedDate(moment(selectedDate).add(7, 'days').toDate())}
            className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {dateRange.map((date) => (
            <button
              key={date.toISOString()}
              onClick={() => setSelectedDate(date)}
              className={`flex flex-col items-center justify-center min-w-[60px] h-16 px-2 py-2 rounded-lg transition-all duration-200 ${
                moment(date).isSame(selectedDate, 'day')
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-xs font-medium">
                {moment(date).format('ddd')}
              </span>
              <span className="text-lg font-bold">
                {moment(date).format('D')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {timeSlots.map((hour) => {
            const events = getEventsForTimeSlot(hour);
            return (
              <div key={hour} className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex">
                  {/* Time Label */}
                  <div className="w-16 flex-shrink-0 p-3 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                    {formatTimeSlot(hour)}
                  </div>
                  
                  {/* Events */}
                  <div className="flex-1 p-3 min-h-[60px]">
                    {events.map((event) => (
                      <div
                        key={event.id} // Ensure unique key for each event render
                        onClick={() => handleEventClick(event)}
                        className="mb-2 p-3 rounded-lg text-white text-sm font-medium cursor-pointer transition-all duration-200 hover:opacity-80"
                        style={{ backgroundColor: getEventColor(event) }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">
                              {event.title} {(() => {
                                const durationHours = moment(event.end).diff(moment(event.start), 'hours', true);
                                const durationMinutes = moment(event.end).diff(moment(event.start), 'minutes', true);
                                if (durationHours >= 1) {
                                  // Display hours if at least 1 full hour
                                  return `(${Math.round(durationHours)}h)`;
                                } else if (durationMinutes > 0) {
                                  // Display minutes if less than an hour but more than 0
                                  return `(${Math.round(durationMinutes)}m)`;
                                }
                                return ''; // No duration if 0 or negative
                              })()}
                            </div>
                            <div className="text-xs opacity-90">
                              {moment(event.start).format('h:mm A')} - {moment(event.end).format('h:mm A')}
                            </div>
                            {event.resource.type === 'study' && (
                              <div className="text-xs opacity-75 mt-1">
                                {formatTime(event.resource.data.session.allocatedHours)}
                              </div>
                            )}
                          </div>
                          <div className="ml-2">
                            {event.resource.type === 'study' ? (
                              <BookOpen size={16} />
                            ) : (
                              <Clock size={16} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-sm w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {selectedEvent.title}
                </h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <Clock size={16} />
                  <span>
                    {moment(selectedEvent.start).format('h:mm A')} - {moment(selectedEvent.end).format('h:mm A')}
                  </span>
                </div>
                
                {selectedEvent.resource.type === 'study' && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <BookOpen size={16} />
                    <span>Study Session</span>
                  </div>
                )}
                
                {selectedEvent.resource.type === 'commitment' && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <Clock size={16} />
                    <span className="capitalize">{selectedEvent.resource.data.type}</span>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                {selectedEvent.resource.type === 'commitment' && (
                  <>
                    <button
                      onClick={handleStartSession}
                      className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Play size={16} />
                      <span>Start Session</span>
                    </button>
                    <button
                      onClick={handleDeleteSession}
                      className="flex-1 bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  </>
                )}
                
                {selectedEvent.resource.type === 'study' && onSelectTask && (
                  <button
                    onClick={() => {
                      onSelectTask(selectedEvent.resource.data.task, {
                        allocatedHours: selectedEvent.resource.data.session.allocatedHours,
                        planDate: moment(selectedDate).format('YYYY-MM-DD'),
                        sessionNumber: selectedEvent.resource.data.session.sessionNumber
                      });
                      setSelectedEvent(null);
                    }}
                    className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Play size={16} />
                    <span>Start Study Session</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commitment Session Manager Modal */}
      {showSessionManager && selectedSessionToManage && (
        <CommitmentSessionManager
          commitment={selectedSessionToManage.commitment}
          targetDate={selectedSessionToManage.date}
          onDeleteSession={handleDeleteCommitmentSession}
          onCancel={handleCancelSessionManager}
        />
      )}
    </div>
  );
};

export default MobileCalendarView;