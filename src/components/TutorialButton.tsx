import React from 'react';
import { Play, BookOpen } from 'lucide-react';

interface TutorialButtonProps {
  onStartTutorial: () => void;
  hasCompletedTutorial: boolean;
  hasTasks: boolean;
  isTutorialActive?: boolean; // New prop to control visibility
}

const TutorialButton: React.FC<TutorialButtonProps> = ({ 
  onStartTutorial, 
  hasCompletedTutorial, 
  hasTasks,
  isTutorialActive = false // Default to false if not provided
}) => {
  // Hide button if tutorial is running
  if (isTutorialActive) return null;

  // Show button only for new users: tutorial not completed (regardless of tasks)
  const shouldShow = !hasCompletedTutorial;
  
  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-6 right-6 z-30">
      <button
        onClick={onStartTutorial}
        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-full shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 animate-pulse"
        title="Start tutorial to learn how to use TimePilot effectively"
      >
        <BookOpen size={20} />
        <span className="font-medium">Start Tutorial</span>
      </button>
    </div>
  );
};

export default TutorialButton; 