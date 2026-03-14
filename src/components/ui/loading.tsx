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
  <ComponentLoader height={400}>
    <div className="mt-6 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-300 rounded"></div>
      ))}
    </div>
  </ComponentLoader>
);

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