import React from 'react';
import { render } from '@testing-library/react';
import TaskList from '../TaskList';
import { runAccessibilityTests, testAccessibility } from '@/lib/__tests__/accessibility-helpers';
import { AuthContext } from '@/app/contexts/AuthContext';
import { defaultSettings } from '@/hooks/usePomodoro';

// Mock the useTasks hook
jest.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: [
      { 
        id: '1', 
        text: 'Test task 1', 
        completed: false, 
        createdAt: new Date(),
        priority: 'medium',
        estimatedPomodoros: 2 
      },
      { 
        id: '2', 
        text: 'Test task 2', 
        completed: true, 
        createdAt: new Date(),
        priority: 'high',
        estimatedPomodoros: 1 
      }
    ],
    loading: false,
    error: null,
    addTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    toggleTask: jest.fn()
  })
}));

// Mock useProjects hook
jest.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({
    projects: [
      { id: '1', name: 'Test Project', color: '#3B82F6', createdAt: new Date() }
    ],
    loading: false,
    error: null,
    addProject: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn()
  })
}));

// Mock useGoogleAnalytics hook
jest.mock('@/hooks/useGoogleAnalytics', () => ({
  useGoogleAnalytics: () => ({
    event: jest.fn(),
  }),
}));

// Mock useMonitoring hook
jest.mock('@/hooks/useMonitoring', () => ({
  useMonitoring: () => ({
    trackAction: jest.fn(),
    trackFeature: jest.fn(),
    reportError: jest.fn(),
  }),
}));

// Mock the Claude AI hook
jest.mock('@/hooks/useClaudeAI', () => ({
  useClaudeAI: () => ({
    breakdown: null,
    loading: false,
    error: null,
    generateTaskBreakdown: jest.fn(),
    clearBreakdown: jest.fn()
  })
}));

const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User'
};

const renderTaskListWithContext = () => (
  <AuthContext.Provider value={{
    user: mockUser,
    loading: false,
    signOut: jest.fn()
  }}>
    <TaskList settings={defaultSettings} />
  </AuthContext.Provider>
);

// Run common accessibility tests
runAccessibilityTests('TaskList', renderTaskListWithContext);

describe('TaskList specific accessibility features', () => {
  it('should have proper list structure with ARIA', async () => {
    const { container, getByRole } = render(renderTaskListWithContext());
    
    // Should have a proper list structure
    const list = getByRole('list');
    expect(list).toBeInTheDocument();
    
    // List items should have proper roles
    const listItems = container.querySelectorAll('[role="listitem"], li');
    expect(listItems.length).toBeGreaterThan(0);
    
    await testAccessibility(renderTaskListWithContext());
  });

  it('should have accessible task checkboxes', async () => {
    const { getAllByRole } = render(renderTaskListWithContext());
    
    // Get all checkboxes
    const checkboxes = getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    
    checkboxes.forEach(checkbox => {
      // Each checkbox should have a label
      expect(checkbox).toHaveAccessibleName();
      
      // Should indicate checked state
      expect(checkbox).toHaveAttribute('aria-checked');
    });
    
    await testAccessibility(renderTaskListWithContext());
  });

  it('should have accessible task action buttons', async () => {
    const { container } = render(renderTaskListWithContext());
    
    // Find action buttons (edit, delete, etc.)
    const actionButtons = container.querySelectorAll('button');
    
    actionButtons.forEach(button => {
      // Should have accessible name (aria-label or text content)
      expect(button).toHaveAccessibleName();
      
      // Should be keyboard accessible
      expect(button.tabIndex).not.toBe(-1);
    });
    
    await testAccessibility(renderTaskListWithContext());
  });

  it('should have proper form structure for adding tasks', async () => {
    const { container } = render(renderTaskListWithContext());
    
    // Look for input fields
    const inputs = container.querySelectorAll('input[type="text"], textarea');
    
    inputs.forEach(input => {
      // Should have labels or aria-label
      expect(input).toHaveAccessibleName();
    });
    
    await testAccessibility(renderTaskListWithContext());
  });

  it('should announce task completion changes', async () => {
    const { container } = render(renderTaskListWithContext());
    
    // Should have aria-live regions for dynamic updates
    const liveRegions = container.querySelectorAll('[aria-live]');
    expect(liveRegions.length).toBeGreaterThan(0);
    
    await testAccessibility(renderTaskListWithContext());
  });

  it('should have proper priority indicators', async () => {
    const { container } = render(renderTaskListWithContext());
    
    // Look for priority indicators
    const priorityElements = container.querySelectorAll('[data-priority], .priority');
    
    priorityElements.forEach(element => {
      // Priority should be announced to screen readers
      expect(element).toHaveAttribute('aria-label', expect.stringMatching(/priority/i));
    });
    
    await testAccessibility(renderTaskListWithContext());
  });

  it('should support keyboard navigation between tasks', async () => {
    const { getAllByRole } = render(renderTaskListWithContext());
    
    const checkboxes = getAllByRole('checkbox');
    
    if (checkboxes.length > 1) {
      // First checkbox should be focusable
      checkboxes[0].focus();
      expect(document.activeElement).toBe(checkboxes[0]);
      
      // Should be able to navigate with Tab
      expect(checkboxes[0].tabIndex).not.toBe(-1);
    }
    
    await testAccessibility(renderTaskListWithContext());
  });

  it('should have proper heading structure for sections', async () => {
    const { container } = render(renderTaskListWithContext());
    
    // Should have headings for task sections
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    expect(headings.length).toBeGreaterThan(0);
    
    // Headings should follow proper hierarchy
    const headingLevels = Array.from(headings).map(h => parseInt(h.tagName.charAt(1)));
    expect(headingLevels[0]).toBeLessThanOrEqual(3); // Should start with appropriate level
    
    await testAccessibility(renderTaskListWithContext());
  });

  it('should handle empty state accessibly', async () => {
    // Mock empty task list
    jest.resetModules();
    jest.mock('@/hooks/useTasks', () => ({
      useTasks: () => ({
        tasks: [],
        loading: false,
        error: null,
        addTask: jest.fn(),
        updateTask: jest.fn(),
        deleteTask: jest.fn(),
        toggleTask: jest.fn()
      })
    }));
    
    const { container } = render(renderTaskListWithContext());
    
    // Empty state should be announced to screen readers
    const emptyMessage = container.querySelector('[role="status"], .empty-state');
    if (emptyMessage) {
      expect(emptyMessage).toHaveTextContent();
    }
    
    await testAccessibility(renderTaskListWithContext());
  });
});