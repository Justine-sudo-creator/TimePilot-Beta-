import React, { useState } from 'react';
import { BookOpen, Edit, Trash2, CheckCircle2, X, Info } from 'lucide-react';
import { Task } from '../types';
import { formatTime } from '../utils/scheduling';

interface TaskListProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  autoRemovedTasks?: string[];
  onDismissAutoRemovedTask?: (taskTitle: string) => void;
}

type EditFormData = Partial<Task> & {
  // evenDistribution: boolean; // Removed
  // frontOrBack: 'front-load' | 'back-load'; // Removed
};

const TaskList: React.FC<TaskListProps> = ({ tasks, onUpdateTask, onDeleteTask, autoRemovedTasks = [], onDismissAutoRemovedTask }) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({});
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  
  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  // Separate active and completed tasks
  const activeTasks = tasks.filter(task => task.status === 'pending');
  const completedTasks = tasks.filter(task => task.status === 'completed');

  // Check if current edit form represents a low-priority urgent task
  const isLowPriorityUrgent = React.useMemo(() => {
    if (!editFormData.deadline) return false;
    const deadline = new Date(editFormData.deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline <= 3 && editFormData.importance === false;
  }, [editFormData.deadline, editFormData.importance]);
  
  // Check if deadline is in the past
  const isDeadlinePast = editFormData.deadline ? editFormData.deadline < today : false;

  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200'
  };

  const statusColors = {
    pending: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700'
  };

  const getUrgencyColor = (deadline: string): string => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline <= 1) return 'text-red-600';
    if (daysUntilDeadline <= 3) return 'text-orange-600';
    if (daysUntilDeadline <= 7) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Get category color based on calendar view color scheme
  const getCategoryColor = (category?: string): string => {
    if (!category) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    
    switch (category.toLowerCase()) {
      case 'academics':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'personal':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'learning':
        return 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200';
      case 'home':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      case 'finance':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'org':
      case 'organization':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'work':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'health':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const toggleTaskStatus = (task: Task) => {
    // Only allow marking as completed, not uncompleting
    if (task.status !== 'completed') {
      onUpdateTask(task.id, { status: 'completed' });
    }
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditFormData({
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      importance: task.importance, // NEW
      estimatedHours: task.estimatedHours,
      subject: task.subject,
      // distributionStrategy: task.distributionStrategy || 'even', // Removed
      // evenDistribution: !task.distributionStrategy || task.distributionStrategy === 'even', // Removed
      // frontOrBack: task.distributionStrategy === 'back-load' ? 'back-load' : 'front-load', // Removed
    });
  };

  const saveEdit = () => {
    if (editingTaskId && editFormData) {
      // Prevent saving if deadline is in the past
      if (isDeadlinePast) {
        return; // Don't save if deadline is invalid
      }
      
      // const distributionStrategy = editFormData.evenDistribution // Removed
      //   ? 'even' // Removed
      //   : editFormData.frontOrBack; // Removed
      onUpdateTask(editingTaskId, { ...editFormData });
      setEditingTaskId(null);
      setEditFormData({
        // evenDistribution: true, // Removed
        // frontOrBack: 'front-load', // Removed
      });
    }
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditFormData({
      // evenDistribution: true, // Removed
      // frontOrBack: 'front-load', // Removed
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 dark:bg-gray-900 dark:shadow-gray-900">
      {/* Auto-removed task warnings */}
      {autoRemovedTasks.length > 0 && (
        <div className="mb-4 space-y-2">
          {autoRemovedTasks.map(title => (
            <div key={title} className="flex items-center bg-red-100 text-red-800 px-4 py-2 rounded shadow border-l-4 border-red-500">
              <span className="flex-1">Task "{title}" couldn't be scheduled and was removed.</span>
              {onDismissAutoRemovedTask && (
                <button onClick={() => onDismissAutoRemovedTask(title)} className="ml-4 text-red-800 hover:text-red-600 font-bold">
                  <X size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Task List</h2>
        <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-500 dark:text-gray-300">
            {activeTasks.length} active, {completedTasks.length} completed
          </div>
          {completedTasks.length > 0 && (
            <button
              onClick={() => setShowCompletedTasks(!showCompletedTasks)}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {showCompletedTasks ? 'Hide' : 'Show'} Completed
            </button>
          )}
        </div>
      </div>
      
      {/* Active Tasks */}
      <div className="space-y-3 task-list">
        {activeTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <BookOpen size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
            <p>No active tasks. Add your first task to get started!</p>
          </div>
        ) : (
          activeTasks.map((task) => (
            <div key={task.id}>
              {editingTaskId === task.id ? (
                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={editFormData.title || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={editFormData.subject || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Deadline
                        </label>
                        <input
                          type="date"
                          min={today}
                          value={editFormData.deadline || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${isDeadlinePast ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                        />
                        {isDeadlinePast && (
                          <div className="text-red-600 text-xs mt-1">Deadline cannot be in the past. Please select today or a future date.</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Estimated Hours
                        </label>
                          <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={editFormData.estimatedHours || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, estimatedHours: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Importance
                        </label>
                        <select
                          value={editFormData.importance === true ? 'important' : 'not-important'}
                          onChange={(e) => setEditFormData({ ...editFormData, importance: e.target.value === 'important' })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="important">Important</option>
                          <option value="not-important">Not Important</option>
                        </select>
                      </div>
                          </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Description
                      </label>
                      <textarea
                        value={editFormData.description || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </div>

                    {/* Warning for low-priority urgent tasks */}
                    {isLowPriorityUrgent && (
                      <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
                        <Info className="text-yellow-600 dark:text-yellow-400" size={20} />
                        <div className="text-sm text-yellow-800 dark:text-yellow-200">
                          <strong>Warning:</strong> This low-priority task has an urgent deadline (within 3 days). 
                          It may not be scheduled if you have higher-priority urgent tasks.
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={isDeadlinePast}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          isDeadlinePast 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`p-4 border rounded-lg ${task.importance ? 'ring-2 ring-blue-500' : ''} ${task.status === 'completed' ? 'bg-gray-50 opacity-75 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className={`font-semibold ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800 dark:text-white'}`}>
                          {task.title}
                        </h3>
                        {task.importance && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200">
                            Important
                          </span>
                        )}
                        {task.subject && (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full dark:bg-gray-700 dark:text-gray-300">
                            {task.subject}
                          </span>
                        )}
                        {task.category && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(task.category)}`}>
                            {task.category}
                          </span>
                        )}
                        </div>
                      {task.description && (
                        <p className={`text-sm mb-2 ${task.status === 'completed' ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-sm">
                        <span className={`font-medium ${getUrgencyColor(task.deadline)}`}>
                          Due: {new Date(task.deadline).toLocaleDateString()}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {task.estimatedHours}h estimated
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleTaskStatus(task)}
                        disabled={task.status === 'completed'}
                        className={`p-2 rounded-lg transition-colors ${
                          task.status === 'completed' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 cursor-not-allowed opacity-50' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                        title={task.status === 'completed' ? 'Task completed' : 'Mark as completed'}
                      >
                        <CheckCircle2 size={20} />
                      </button>
                        <button
                          onClick={() => startEditing(task)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
                          title="Edit task"
                        >
                        <Edit size={20} />
                        </button>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
                          title="Delete task"
                        >
                        <Trash2 size={20} />
                        </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Completed Tasks Section */}
      {showCompletedTasks && completedTasks.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center space-x-2">
            <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />
            <span>Completed Tasks</span>
          </h3>
          <div className="space-y-3">
            {completedTasks.map((task) => (
              <div key={task.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 opacity-75">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold line-through text-gray-500">
                        {task.title}
                      </h3>
                      {task.importance && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200">
                          Important
                        </span>
                      )}
                      {task.subject && (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full dark:bg-gray-700 dark:text-gray-300">
                          {task.subject}
                        </span>
                      )}
                      {task.category && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(task.category)}`}>
                          {task.category}
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm mb-2 text-gray-400">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-400">
                        Due: {new Date(task.deadline).toLocaleDateString()}
                      </span>
                      <span className="text-gray-400">
                        {task.estimatedHours}h estimated
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
                      title="Delete task"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;