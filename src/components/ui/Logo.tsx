import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ className = '', size = 'md', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`${sizeClasses[size]} relative`}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Main background with lightning bolt pattern */}
          <rect x="0" y="0" width="40" height="40" rx="12" fill="url(#mainGradient)" />
          
          {/* Lightning bolt for "Instant" */}
          <path
            d="M15 8L12 20h6l-3 12 8-12h-6l3-10h-5z"
            fill="url(#lightningGradient)"
            stroke="white"
            strokeWidth="0.5"
          />
          
          {/* Numbers representation - stylized digits */}
          <rect x="24" y="12" width="2" height="8" rx="1" fill="white" fillOpacity="0.9" />
          <rect x="27" y="10" width="8" height="2" rx="1" fill="white" fillOpacity="0.9" />
          <rect x="27" y="15" width="6" height="2" rx="1" fill="white" fillOpacity="0.9" />
          <rect x="27" y="20" width="8" height="2" rx="1" fill="white" fillOpacity="0.9" />
          
          {/* Signal waves */}
          <path
            d="M6 24c0-3 2-5 4-5M6 27c0-3 2-5 4-5M6 30c0-3 2-5 4-5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
          />
          
          {/* SMS message indicator */}
          <circle cx="32" cy="32" r="4" fill="#FBBF24" />
          <circle cx="32" cy="32" r="1.5" fill="white" />
          
          <defs>
            <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#047857" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>
            <linearGradient id="lightningGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {showText && (
        <span className={`font-bold bg-gradient-to-r from-emerald-600 via-emerald-700 to-green-800 bg-clip-text text-transparent ${textSizeClasses[size]}`}>
          InstantNums
        </span>
      )}
    </div>
  );
}