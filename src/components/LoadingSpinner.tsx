import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'lg' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8 border-t-2 border-b-2',
    md: 'h-16 w-16 border-t-2 border-b-2',
    lg: 'h-32 w-32 border-t-2 border-b-2',
    xl: 'h-48 w-48 border-t-3 border-b-3',
  };

  return (
    <div className="flex justify-center items-center">
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-[#F1592A]`}></div>
    </div>
  );
};

export default LoadingSpinner;