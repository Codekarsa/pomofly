import React from 'react';

// Reusable loading skeleton components for different content types

export const ComponentLoader = ({ 
  children, 
  height = "auto" 
}: { 
  children?: React.ReactNode; 
  height?: string | number;
}) => (
  <div 
    className="animate-pulse bg-gray-200 rounded-lg p-6" 
    style={{ height: typeof height === 'number' ? `${height}px` : height }}
  >
    <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
    <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
    <div className="h-4 bg-gray-300 rounded w-2/3"></div>
    {children}
  </div>
);

export const TaskListLoader = () => (
  <div className="w-full">
    <div className="bg-white border rounded-lg shadow-sm">
      <div className="p-6 border-b">
        <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
      </div>
      <div className="p-6">
        <div className="space-y-4 mb-6">
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="flex space-x-2">
            <div className="h-10 bg-gray-200 rounded flex-1 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>
        
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <TaskItemSkeleton key={i} />
          ))}
        </div>
        
        <div className="mt-6 flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
          <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);

export const TaskItemSkeleton = () => (
  <div className="flex items-center justify-between p-3 border rounded-md animate-pulse">
    <div className="flex items-center space-x-3">
      <div className="w-4 h-4 bg-gray-200 rounded"></div>
      <div className="w-4 h-4 bg-gray-200 rounded"></div>
      <div className="w-4 h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-48"></div>
      <div className="h-5 bg-gray-200 rounded-full w-20"></div>
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </div>
    <div className="w-6 h-6 bg-gray-200 rounded"></div>
  </div>
);

export const FormLoadingButton = ({ 
  loading, 
  children, 
  loadingText, 
  ...props 
}: { 
  loading: boolean; 
  children: React.ReactNode; 
  loadingText?: string;
  [key: string]: any;
}) => {
  return (
    <button {...props} disabled={loading || props.disabled}>
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {loading ? loadingText : children}
    </button>
  );
};

export const ProjectListLoader = () => (
  <ComponentLoader height={200}>
    <div className="mt-4 space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-8 bg-gray-300 rounded"></div>
      ))}
    </div>
  </ComponentLoader>
);

export const TodayFocusLoader = () => (
  <ComponentLoader height={300}>
    <div className="mt-4 space-y-4">
      <div className="h-16 bg-gray-300 rounded"></div>
      <div className="h-8 bg-gray-300 rounded w-2/3"></div>
      <div className="h-8 bg-gray-300 rounded w-1/2"></div>
    </div>
  </ComponentLoader>
);

export const TaskDetailLoader = () => (
  <div className="container mx-auto px-4 py-8">
    <div className="max-w-4xl mx-auto">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="h-6 bg-gray-300 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
            <div className="h-4 bg-gray-300 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ModalLoader = () => (
  <div className="animate-pulse p-6">
    <div className="h-6 bg-gray-300 rounded w-1/2 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-300 rounded"></div>
      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      <div className="h-8 bg-gray-300 rounded w-1/3 mt-6"></div>
    </div>
  </div>
);