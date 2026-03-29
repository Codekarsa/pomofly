import { render, RenderResult } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ReactElement } from 'react';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

/**
 * Test a component for accessibility violations
 * @param ui - React component to test
 * @param options - Render options
 * @returns Promise that resolves when accessibility test passes
 */
export const testAccessibility = async (
  ui: ReactElement,
  options?: Parameters<typeof render>[1]
): Promise<void> => {
  const { container } = render(ui, options);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};

/**
 * Test a component for specific accessibility rules
 * @param ui - React component to test
 * @param rules - Array of axe rule IDs to test
 * @param options - Render options
 */
export const testAccessibilityWithRules = async (
  ui: ReactElement,
  rules: string[],
  options?: Parameters<typeof render>[1]
): Promise<void> => {
  const { container } = render(ui, options);
  const results = await axe(container, {
    rules: rules.reduce((acc, rule) => ({ ...acc, [rule]: { enabled: true } }), {})
  });
  expect(results).toHaveNoViolations();
};

/**
 * Common accessibility test suite for components
 * @param componentName - Name of the component for test descriptions
 * @param renderComponent - Function that renders the component
 */
export const runAccessibilityTests = (
  componentName: string,
  renderComponent: () => ReactElement
) => {
  describe(`${componentName} accessibility`, () => {
    it('should not have any accessibility violations', async () => {
      await testAccessibility(renderComponent());
    });

    it('should have proper keyboard navigation', async () => {
      await testAccessibilityWithRules(renderComponent(), [
        'keyboard',
        'focus-order-semantics',
        'tabindex'
      ]);
    });

    it('should have proper ARIA labels and roles', async () => {
      await testAccessibilityWithRules(renderComponent(), [
        'aria-allowed-attr',
        'aria-required-attr',
        'aria-valid-attr-value',
        'aria-valid-attr',
        'role-img-alt'
      ]);
    });

    it('should have proper color contrast', async () => {
      await testAccessibilityWithRules(renderComponent(), [
        'color-contrast',
        'color-contrast-enhanced'
      ]);
    });

    it('should be screen reader friendly', async () => {
      await testAccessibilityWithRules(renderComponent(), [
        'landmark-one-main',
        'landmark-complementary-is-top-level',
        'region',
        'aria-hidden-focus'
      ]);
    });
  });
};

/**
 * Keyboard navigation test helper
 * @param element - Element to test keyboard navigation on
 */
export const testKeyboardNavigation = (element: HTMLElement) => {
  // Test Tab navigation
  element.focus();
  expect(document.activeElement).toBe(element);
  
  // Test Enter/Space for buttons
  if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
    const clickSpy = jest.fn();
    element.addEventListener('click', clickSpy);
    
    // Simulate Enter key
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(clickSpy).toHaveBeenCalled();
    
    clickSpy.mockClear();
    
    // Simulate Space key
    element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(clickSpy).toHaveBeenCalled();
  }
};

/**
 * Check if element has proper ARIA attributes
 * @param element - Element to check
 * @param requiredAttrs - Array of required ARIA attributes
 */
export const checkAriaAttributes = (element: HTMLElement, requiredAttrs: string[]) => {
  requiredAttrs.forEach(attr => {
    expect(element.getAttribute(attr)).toBeTruthy();
  });
};

/**
 * Mock data for testing components that require context
 */
export const mockAccessibilityContext = {
  // Add any necessary context mocks here
};