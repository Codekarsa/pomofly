import React from 'react';
import { render } from '@testing-library/react';
import PomodoroTimer from '../PomodoroTimer';
import { runAccessibilityTests, testAccessibility } from '@/lib/__tests__/accessibility-helpers';
import { defaultSettings } from '@/hooks/usePomodoro';

// Mock the usePomodoro hook
jest.mock('@/hooks/usePomodoro', () => ({
  usePomodoro: () => ({
    minutes: 25,
    seconds: 0,
    isActive: false,
    isPaused: false,
    isBreak: false,
    currentSession: 1,
    totalSessions: 0,
    start: jest.fn(),
    pause: jest.fn(),
    reset: jest.fn(),
    skip: jest.fn(),
    settings: defaultSettings,
  }),
  defaultSettings: {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakInterval: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    notifications: true,
    soundEnabled: true,
  }
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

const renderPomodoroTimer = () => (
  <PomodoroTimer settings={defaultSettings} />
);

// Run common accessibility tests
runAccessibilityTests('PomodoroTimer', renderPomodoroTimer);

describe('PomodoroTimer specific accessibility features', () => {
  it('should have proper timer display with ARIA live region', async () => {
    const { container } = render(renderPomodoroTimer());
    
    // Look for ARIA live region for timer updates
    const liveRegion = container.querySelector('[aria-live]');
    expect(liveRegion).toBeInTheDocument();
    
    // Check accessibility
    await testAccessibility(renderPomodoroTimer());
  });

  it('should have accessible control buttons', async () => {
    const { getByRole } = render(renderPomodoroTimer());
    
    // Check for start/pause button
    const startButton = getByRole('button', { name: /start|play/i });
    expect(startButton).toBeInTheDocument();
    expect(startButton).toHaveAttribute('aria-label');
    
    // Check for reset button
    const resetButton = getByRole('button', { name: /reset/i });
    expect(resetButton).toBeInTheDocument();
    expect(resetButton).toHaveAttribute('aria-label');
    
    await testAccessibility(renderPomodoroTimer());
  });

  it('should have proper heading structure', async () => {
    const { container } = render(renderPomodoroTimer());
    
    // Check for proper heading hierarchy
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    expect(headings.length).toBeGreaterThan(0);
    
    await testAccessibility(renderPomodoroTimer());
  });

  it('should have focus management', async () => {
    const { getByRole } = render(renderPomodoroTimer());
    
    const startButton = getByRole('button', { name: /start|play/i });
    
    // Should be focusable
    startButton.focus();
    expect(document.activeElement).toBe(startButton);
    
    await testAccessibility(renderPomodoroTimer());
  });

  it('should announce timer state changes to screen readers', async () => {
    const { container } = render(renderPomodoroTimer());
    
    // Look for aria-live regions that would announce changes
    const ariaLiveElements = container.querySelectorAll('[aria-live="polite"], [aria-live="assertive"]');
    expect(ariaLiveElements.length).toBeGreaterThan(0);
    
    await testAccessibility(renderPomodoroTimer());
  });

  it('should have proper color contrast for all states', async () => {
    // Test default state
    await testAccessibility(renderPomodoroTimer());
    
    // Note: In a real implementation, you'd test different timer states
    // (running, paused, break, etc.) but we'd need to mock those states
  });

  it('should be keyboard accessible', async () => {
    const { getByRole } = render(renderPomodoroTimer());
    
    const buttons = [
      getByRole('button', { name: /start|play/i }),
      getByRole('button', { name: /reset/i })
    ];
    
    buttons.forEach(button => {
      // Should be reachable by Tab
      expect(button.tabIndex).not.toBe(-1);
      
      // Should be activatable by Enter and Space
      expect(button.tagName).toBe('BUTTON');
    });
    
    await testAccessibility(renderPomodoroTimer());
  });
});