import React from 'react';
import { cn } from '../../lib/utils';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
  showText?: boolean;
}

export function Loader({ size = 'md', className, text = 'Loading...', showText = true }: LoaderProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-4', className)}>
      {/* InstantNums Lightning Loader */}
      <div className={`relative ${sizeClasses[size]}`}>
        <svg
          className="w-full h-full"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background circle */}
          <circle 
            cx="32" 
            cy="32" 
            r="30" 
            stroke="url(#loaderGradient)" 
            strokeWidth="3" 
            fill="none" 
            strokeDasharray="60 20"
            strokeLinecap="round"
            className="animate-spin origin-center"
            style={{ animationDuration: '2s' }}
          />
          
          {/* Inner circle */}
          <circle 
            cx="32" 
            cy="32" 
            r="20" 
            stroke="url(#loaderGradient2)" 
            strokeWidth="2" 
            fill="none" 
            strokeDasharray="40 15"
            strokeLinecap="round"
            className="animate-spin origin-center"
            style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
          />
          
          {/* Lightning bolt center */}
          <path
            d="M28 20L24 32h8l-4 12 8-12h-8l4-12z"
            fill="url(#lightningGradient)"
            className="animate-pulse"
          />
          
          {/* SMS dots */}
          <circle cx="18" cy="32" r="2" fill="#F59E0B" className="animate-bounce" style={{ animationDelay: '0s' }} />
          <circle cx="32" cy="18" r="2" fill="#10B981" className="animate-bounce" style={{ animationDelay: '0.2s' }} />
          <circle cx="46" cy="32" r="2" fill="#3B82F6" className="animate-bounce" style={{ animationDelay: '0.4s' }} />
          <circle cx="32" cy="46" r="2" fill="#8B5CF6" className="animate-bounce" style={{ animationDelay: '0.6s' }} />
          
          <defs>
            <linearGradient id="loaderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="loaderGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="lightningGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {/* Loading text */}
      {showText && (
        <div className="text-center">
          <p className={`font-bold text-gray-700 ${textSizeClasses[size]}`}>
            {text}
          </p>
          <div className="flex items-center justify-center space-x-1 mt-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SkeletonLoader({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse', className)}>
      <div className="bg-gray-200 rounded-lg h-4 w-full mb-2" />
      <div className="bg-gray-200 rounded-lg h-4 w-3/4 mb-2" />
      <div className="bg-gray-200 rounded-lg h-4 w-1/2" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <div className="flex-1">
          <div className="bg-gray-200 rounded h-4 w-32 mb-2" />
          <div className="bg-gray-200 rounded h-3 w-24" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="bg-gray-200 rounded h-3 w-full" />
        <div className="bg-gray-200 rounded h-3 w-2/3" />
      </div>
    </div>
  );
}