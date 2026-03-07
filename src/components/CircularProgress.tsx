'use client'

import React from 'react';

interface CircularProgressProps {
  /**
   * Current progress as a percentage (0-100)
   */
  progress: number;
  
  /**
   * Size of the circular progress indicator in pixels
   */
  size?: number;
  
  /**
   * Width of the progress stroke
   */
  strokeWidth?: number;
  
  /**
   * Color of the progress arc
   */
  progressColor?: string;
  
  /**
   * Color of the background track
   */
  trackColor?: string;
  
  /**
   * Content to display in the center of the circle
   */
  children?: React.ReactNode;
  
  /**
   * Animation duration for progress changes (in milliseconds)
   */
  animationDuration?: number;
  
  /**
   * Whether to show progress in clockwise direction
   */
  clockwise?: boolean;
  
  /**
   * Starting angle in degrees (0 = top, 90 = right, etc.)
   */
  startAngle?: number;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 200,
  strokeWidth = 8,
  progressColor = '#3B82F6', // Blue-500
  trackColor = '#E5E7EB', // Gray-200
  children,
  animationDuration = 300,
  clockwise = true,
  startAngle = -90, // Start at top
  className = ''
}) => {
  // Calculate the radius and circumference
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  
  // Calculate the progress offset
  const progressOffset = circumference - (progress / 100) * circumference;
  
  // Convert start angle to radians for path calculation
  const startAngleRad = (startAngle * Math.PI) / 180;
  
  // Calculate path for the progress arc
  const getArcPath = (percentage: number): string => {
    const angle = (percentage / 100) * 2 * Math.PI;
    const adjustedAngle = clockwise ? angle : -angle;
    const endAngle = startAngleRad + adjustedAngle;
    
    const startX = center + radius * Math.cos(startAngleRad);
    const startY = center + radius * Math.sin(startAngleRad);
    const endX = center + radius * Math.cos(endAngle);
    const endY = center + radius * Math.sin(endAngle);
    
    const largeArcFlag = percentage > 50 ? 1 : 0;
    const sweepFlag = clockwise ? 1 : 0;
    
    if (percentage === 0) return '';
    
    if (percentage >= 100) {
      // Full circle
      return `M ${center - radius} ${center}
              A ${radius} ${radius} 0 1 1 ${center - radius} ${center + 0.01}`;
    }
    
    return `M ${startX} ${startY}
            A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
  };
  
  const progressPath = getArcPath(progress);
  
  // Generate a unique gradient ID for multiple instances
  const gradientId = `progress-gradient-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05))' }}
      >
        {/* Gradient definition for smooth color transitions */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={progressColor} stopOpacity="1" />
            <stop offset="100%" stopColor={progressColor} stopOpacity="0.7" />
          </linearGradient>
          
          {/* Subtle glow effect for the progress */}
          <filter id={`glow-${gradientId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Progress arc */}
        {progress > 0 && (
          <path
            d={progressPath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth + 1} // Slightly thicker than track
            strokeLinecap="round"
            style={{
              transition: `d ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
              filter: `url(#glow-${gradientId})`
            }}
          />
        )}
        
        {/* Optional progress dots for enhanced visual appeal */}
        {progress > 5 && (
          <circle
            cx={center + radius * Math.cos(startAngleRad)}
            cy={center + radius * Math.sin(startAngleRad)}
            r={strokeWidth / 3}
            fill={progressColor}
            style={{
              transition: `all ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            }}
          />
        )}
      </svg>
      
      {/* Center content */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">{children}</div>
        </div>
      )}
    </div>
  );
};

// Predefined variants for common use cases
interface TimerProgressProps extends Omit<CircularProgressProps, 'progressColor' | 'trackColor'> {
  variant?: 'pomodoro' | 'shortBreak' | 'longBreak' | 'focus' | 'default';
}

export const TimerProgress: React.FC<TimerProgressProps> = ({ 
  variant = 'default', 
  ...props 
}) => {
  const variants = {
    pomodoro: {
      progressColor: '#EF4444', // Red-500 - work time
      trackColor: '#FEE2E2'     // Red-100
    },
    shortBreak: {
      progressColor: '#10B981', // Green-500 - short break
      trackColor: '#D1FAE5'     // Green-100
    },
    longBreak: {
      progressColor: '#3B82F6', // Blue-500 - long break
      trackColor: '#DBEAFE'     // Blue-100
    },
    focus: {
      progressColor: '#8B5CF6', // Purple-500 - focus mode
      trackColor: '#EDE9FE'     // Purple-100
    },
    default: {
      progressColor: '#6B7280', // Gray-500
      trackColor: '#F3F4F6'     // Gray-100
    }
  };
  
  const colors = variants[variant];
  
  return (
    <CircularProgress
      progressColor={colors.progressColor}
      trackColor={colors.trackColor}
      {...props}
    />
  );
};