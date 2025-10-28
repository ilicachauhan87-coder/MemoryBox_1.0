import React from 'react';
import { Badge } from './ui/badge';

interface RelationshipHintProps {
  type: 'spouse' | 'child' | 'parent' | 'invalid' | 'already-connected';
  message?: string;
  isMobile: boolean;
}

export const RelationshipHint: React.FC<RelationshipHintProps> = ({ type, message, isMobile }) => {
  // Don't show hints for invalid or already-connected
  if (type === 'invalid') {
    return null;
  }

  if (type === 'already-connected') {
    return (
      <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap">
        <Badge className="bg-gray-500 text-white border-2 border-gray-600 shadow-lg">
          <span className="mr-1">⚠️</span>
          Already {message}
        </Badge>
      </div>
    );
  }

  // Show relationship type hint
  const hintConfig = {
    spouse: {
      emoji: '💑',
      text: 'Make Spouse',
      color: 'bg-pink-500 border-pink-600'
    },
    child: {
      emoji: '👶',
      text: 'Add as Child',
      color: 'bg-blue-500 border-blue-600'
    },
    parent: {
      emoji: '👨',
      text: 'Add as Parent',
      color: 'bg-purple-500 border-purple-600'
    }
  };

  const config = hintConfig[type];

  return (
    <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap">
      <Badge className={`${config.color} text-white border-2 shadow-lg`}>
        <span className="mr-1">{config.emoji}</span>
        {message || config.text}
      </Badge>
    </div>
  );
};
