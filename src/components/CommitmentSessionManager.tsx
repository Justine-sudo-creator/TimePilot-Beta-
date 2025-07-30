import React from 'react';
import { FixedCommitment } from '../types';
import { X, Calendar, Clock } from 'lucide-react';

interface CommitmentSessionManagerProps {
  commitment: FixedCommitment;
  targetDate: string;
  onDeleteSession: (commitmentId: string, date: string) => void;
  onCancel: () => void;
}

const CommitmentSessionManager: React.FC<CommitmentSessionManagerProps> = ({
  commitment,
  targetDate,
  onDeleteSession,
  onCancel
}) => {
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
      </div>
    </div>
  );
};

export default CommitmentSessionManager; 