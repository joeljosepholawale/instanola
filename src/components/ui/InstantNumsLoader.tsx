import React from 'react';

interface InstantNumsLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function InstantNumsLoader({ size = 'md', text = 'Loading...', className = '' }: InstantNumsLoaderProps) {
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
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      {/* Lightning bolt loader */}
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
    </div>
  );
}

// Fullscreen loader variant
export function InstantNumsFullLoader({ text = 'Loading InstantNums...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 via-amber-50 to-green-50 flex items-center justify-center z-50">
      <div className="text-center">
        <InstantNumsLoader size="lg" text={text} />
        <div className="mt-8 max-w-md">
          <h3 className="text-2xl font-black text-gray-900 mb-2">
            <span className="bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent">InstantNums</span>
          </h3>
          <p className="text-gray-600">Getting your instant SMS platform ready...</p>
        </div>
      </div>
    </div>
  );
}

export default InstantNumsLoader;
