import React from 'react';

// Reusable loading skeleton components for different content types

export const ComponentLoader = ({
  children,
  height = 'auto',
}: {
  children?: React.ReactNode;
  height?: string | number;
}) => (
  <div
    className="animate-pulse rounded-lg bg-gray-200 p-6"
    style={{ height: typeof height === 'number' ? `${height}px` : height }}
  >
    <div className="mb-4 h-4 w-3/4 rounded bg-gray-300"></div>
    <div className="mb-2 h-4 w-1/2 rounded bg-gray-300"></div>
    <div className="h-4 w-2/3 rounded bg-gray-300"></div>
    {children}
  </div>
);

export const TaskListLoader = () => (
  <ComponentLoader height={400}>
    <div className="mt-6 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 rounded bg-gray-300"></div>
      ))}
    </div>
  </ComponentLoader>
);

export const ProjectListLoader = () => (
  <ComponentLoader height={200}>
    <div className="mt-4 space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-8 rounded bg-gray-300"></div>
      ))}
    </div>
  </ComponentLoader>
);

export const TodayFocusLoader = () => (
  <ComponentLoader height={300}>
    <div className="mt-4 space-y-4">
      <div className="h-16 rounded bg-gray-300"></div>
      <div className="h-8 w-2/3 rounded bg-gray-300"></div>
      <div className="h-8 w-1/2 rounded bg-gray-300"></div>
    </div>
  </ComponentLoader>
);

export const TaskDetailLoader = () => (
  <div className="container mx-auto px-4 py-8">
    <div className="mx-auto max-w-4xl">
      <div className="animate-pulse">
        <div className="mb-6 h-8 w-1/3 rounded bg-gray-300"></div>
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="mb-4 h-6 w-1/2 rounded bg-gray-300"></div>
          <div className="mb-2 h-4 w-3/4 rounded bg-gray-300"></div>
          <div className="mb-4 h-4 w-1/2 rounded bg-gray-300"></div>
          <div className="space-y-3">
            <div className="h-4 rounded bg-gray-300"></div>
            <div className="h-4 w-5/6 rounded bg-gray-300"></div>
            <div className="h-4 w-4/6 rounded bg-gray-300"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ModalLoader = () => (
  <div className="animate-pulse p-6">
    <div className="mb-4 h-6 w-1/2 rounded bg-gray-300"></div>
    <div className="space-y-3">
      <div className="h-4 rounded bg-gray-300"></div>
      <div className="h-4 w-3/4 rounded bg-gray-300"></div>
      <div className="mt-6 h-8 w-1/3 rounded bg-gray-300"></div>
    </div>
  </div>
);
