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

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditFormData({
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      importance: task.importance,
      estimatedHours: task.estimatedHours,
      subject: task.subject,
      category: task.category, // Added
      // distributionStrategy: task.distributionStrategy || 'even', // Removed
      // evenDistribution: !task.distributionStrategy || task.distributionStrategy === 'even', // Removed
    });
  };

  const saveEdit = () => {
    if (editingTaskId && editFormData.title && editFormData.deadline) {
      onUpdateTask(editingTaskId, editFormData);
      setEditingTaskId(null);
      setEditFormData({});
    }
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditFormData({});
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Auto-removed tasks notifications */}
      {autoRemovedTasks.map((title) => (
            <div key={title} className="flex items-center bg-red-100 text-red-800 px-4 py-2 rounded shadow border-l-4 border-red-500">
          <Info className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="text-sm flex-1">
            Task "{title}" was automatically removed due to missed deadline.
          </span>
            <button
            onClick={() => onDismissAutoRemovedTask?.(title)}
            className="ml-2 text-red-600 hover:text-red-800"
            >
            <X className="w-4 h-4" />
            </button>
        </div>
      ))}
      
      {/* Active Tasks */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 mb-2">
          <BookOpen className="text-blue-600 dark:text-blue-400" size={20} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">Active Tasks</h2>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full dark:bg-blue-900 dark:text-blue-200">
            {activeTasks.length}
          </span>
        </div>

        {activeTasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No Active Tasks</h3>
            <p className="text-gray-600 dark:text-gray-300">Add your first task to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-all duration-200 dark:bg-gray-800 dark:border-gray-700"
              >
              {editingTaskId === task.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Task Title
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
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Estimated Hours
                        </label>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={editFormData.estimatedHours || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, estimatedHours: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Deadline
                        </label>
                        <input
                          type="date"
                          min={today}
                          value={editFormData.deadline || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Category
                        </label>
                        <select
                          value={editFormData.category || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="">Select Category</option>
                          <option value="academics">Academics</option>
                          <option value="personal">Personal</option>
                          <option value="learning">Learning</option>
                          <option value="home">Home</option>
                          <option value="finance">Finance</option>
                          <option value="organization">Organization</option>
                          <option value="work">Work</option>
                          <option value="health">Health</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Priority
                        </label>
                        <select
                          value={editFormData.importance ? 'high' : 'low'}
                          onChange={(e) => setEditFormData({ ...editFormData, importance: e.target.value === 'high' })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="low">Low Priority</option>
                          <option value="high">High Priority</option>
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
                        placeholder="Optional description..."
                            />
                          </div>

                    {/* Warning for low-priority urgent tasks */}
                    {isLowPriorityUrgent && (
                      <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
                        <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                        <span className="text-sm text-yellow-700 dark:text-yellow-300">
                          This task is due soon but marked as low priority. Consider increasing the priority.
                        </span>
                        </div>
                    )}

                    {/* Warning for past deadline */}
                    {isDeadlinePast && (
                      <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                        <Info className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <span className="text-sm text-red-700 dark:text-red-300">
                          This deadline is in the past. Please update it to a future date.
                        </span>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={saveEdit}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                  </div>
                </div>
              ) : (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white truncate">
                          {task.title}
                        </h3>
                        {task.importance && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full dark:bg-red-900 dark:text-red-200 flex-shrink-0">
                            Important
                          </span>
                        )}
                        </div>
                        
                        <div className="space-y-2">
                        {task.subject && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                              <span className="font-medium">📚</span>
                              <span className="truncate">{task.subject}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">⏰</span>
                            <span>{formatTime(task.estimatedHours)}</span>
                          </div>
                          
                          {task.deadline && (
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="font-medium">📅</span>
                              <span className={`${getUrgencyColor(task.deadline)}`}>
                                Due: {new Date(task.deadline).toLocaleDateString()}
                          </span>
                            </div>
                        )}
                          
                        {task.category && (
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(task.category)}`}>
                            {task.category}
                          </span>
                            </div>
                        )}
                          
                      {task.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                        <button
                          onClick={() => startEditing(task)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
                          title="Edit task"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
                          title="Delete task"
                        >
                          <Trash2 size={16} />
                        </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
            <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">Completed Tasks</h2>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-200">
                {completedTasks.length}
              </span>
            </div>
            <button
              onClick={() => setShowCompletedTasks(!showCompletedTasks)}
              className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showCompletedTasks ? 'Hide' : 'Show'} Completed
            </button>
          </div>

          {showCompletedTasks && (
          <div className="space-y-3">
            {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6 dark:bg-gray-800 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-600 dark:text-gray-300 truncate line-through">
                        {task.title}
                      </h3>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-200">
                          Completed
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                      {task.subject && (
                          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-medium">📚</span>
                            <span className="truncate">{task.subject}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-medium">⏰</span>
                          <span>{formatTime(task.estimatedHours)}</span>
                        </div>
                        
                        {task.deadline && (
                          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-medium">📅</span>
                            <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                          </div>
                      )}
                    </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
                      title="Delete task"
                    >
                        <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskList;