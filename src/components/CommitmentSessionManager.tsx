import React, { useState } from 'react';
import { FixedCommitment } from '../types';
import { X, Edit, Trash2, Calendar, Clock } from 'lucide-react';

interface CommitmentSessionManagerProps {
  commitment: FixedCommitment;
  targetDate: string;
  onDeleteSession: (commitmentId: string, date: string) => void;
  onEditSession: (commitmentId: string, date: string, updates: {
    startTime?: string;
    endTime?: string;
    title?: string;
    type?: 'class' | 'work' | 'appointment' | 'other' | 'buffer';
  }) => void;
  onCancel: () => void;
}

const CommitmentSessionManager: React.FC<CommitmentSessionManagerProps> = ({
  commitment,
  targetDate,
  onDeleteSession,
  onEditSession,
  onCancel
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    startTime: commitment.startTime,
    endTime: commitment.endTime,
    title: commitment.title,
    type: commitment.type
  });

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${commitment.title}" on ${targetDate}?`)) {
      onDeleteSession(commitment.id, targetDate);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onEditSession(commitment.id, targetDate, editData);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditData({
      startTime: commitment.startTime,
      endTime: commitment.endTime,
      title: commitment.title,
      type: commitment.type
    });
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'class': return '🎓';
      case 'work': return '💼';
      case 'appointment': return '👤';
      case 'other': return '📅';
      case 'buffer': return '⏰';
      default: return '📅';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'class': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'work': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'appointment': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'other': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'buffer': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (isEditing) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Edit Session
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={editData.startTime}
                  onChange={(e) => setEditData(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={editData.endTime}
                  onChange={(e) => setEditData(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={editData.type}
                onChange={(e) => setEditData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="class">Class</option>
                <option value="work">Work</option>
                <option value="appointment">Appointment</option>
                <option value="other">Other</option>
                <option value="buffer">Buffer</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Manage Session
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getTypeEmoji(commitment.type)}</span>
            <div className="flex-1">
              <h4 className="font-medium text-gray-800 dark:text-white">{commitment.title}</h4>
              <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getTypeColor(commitment.type)}`}>
                {commitment.type}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar size={16} />
              <span>{formatDate(targetDate)}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock size={16} />
              <span>{commitment.startTime} - {commitment.endTime}</span>
            </div>
          </div>

          {commitment.location && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              📍 {commitment.location}
            </div>
          )}

          {commitment.description && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {commitment.description}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={handleEdit}
            className="flex items-center space-x-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 dark:text-blue-400 dark:border-blue-600 dark:hover:bg-blue-900"
          >
            <Edit size={16} />
            <span>Edit</span>
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center space-x-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900"
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommitmentSessionManager; 