# Accessibility Guidelines

This document outlines the accessibility standards and testing procedures for Pomofly to ensure WCAG 2.1 AA compliance and inclusive design.

## Overview

Accessibility testing is automated in our CI pipeline to catch accessibility violations early and ensure all users can effectively use Pomofly regardless of their abilities or assistive technologies.

## Testing Strategy

### 1. Automated Testing

#### Unit Tests with jest-axe
- Every component has dedicated accessibility tests
- Tests run automatically on every pull request
- Located in `__tests__/*.accessibility.test.tsx` files

```bash
# Run accessibility unit tests
npm run test:a11y

# Run all tests including accessibility
npm test
```

#### Lighthouse CI Integration
- Automated accessibility audits on every PR
- Tests against WCAG 2.1 AA standards
- Minimum accessibility score: 95%

```bash
# Run Lighthouse accessibility audit locally
npm run lighthouse
```

### 2. Manual Testing Checklist

Use this checklist for manual accessibility validation:

#### Keyboard Navigation
- [ ] All interactive elements are reachable via Tab key
- [ ] Tab order follows logical visual flow
- [ ] Focus indicators are clearly visible
- [ ] Enter/Space activate buttons and links
- [ ] Escape key closes modals/dropdowns

#### Screen Reader Testing
- [ ] All images have appropriate alt text
- [ ] Form fields have clear labels
- [ ] Headings follow proper hierarchy (h1 → h2 → h3)
- [ ] Lists are properly structured
- [ ] Status changes are announced (via aria-live regions)

#### Color and Contrast
- [ ] Text meets WCAG AA color contrast ratios (4.5:1 for normal text, 3:1 for large)
- [ ] Information is not conveyed through color alone
- [ ] Focus indicators have sufficient contrast

#### Mobile Accessibility
- [ ] Touch targets are at least 44px × 44px
- [ ] Content reflows properly when zoomed to 200%
- [ ] Horizontal scrolling is not required at standard zoom levels

## Component Accessibility Requirements

### Buttons
```tsx
// Good: Accessible button
<button 
  type="button"
  aria-label="Start pomodoro timer"
  onClick={handleStart}
>
  <PlayIcon aria-hidden="true" />
  Start
</button>
```

### Forms
```tsx
// Good: Accessible form field
<div>
  <label htmlFor="task-input">
    Task description
  </label>
  <input
    id="task-input"
    type="text"
    aria-describedby="task-help"
    required
  />
  <div id="task-help">
    Enter a brief description of your task
  </div>
</div>
```

### Lists
```tsx
// Good: Accessible task list
<div role="region" aria-labelledby="tasks-heading">
  <h2 id="tasks-heading">Today's Tasks</h2>
  <ul>
    {tasks.map(task => (
      <li key={task.id}>
        <input 
          type="checkbox"
          checked={task.completed}
          aria-labelledby={`task-${task.id}`}
        />
        <span id={`task-${task.id}`}>{task.title}</span>
      </li>
    ))}
  </ul>
</div>
```

### Timer/Status Updates
```tsx
// Good: Accessible timer with live updates
<div role="timer" aria-live="polite" aria-atomic="true">
  <span className="sr-only">
    {isActive ? 'Timer running' : 'Timer stopped'}
  </span>
  <time>{formatTime(minutes, seconds)}</time>
</div>
```

## ARIA Guidelines

### Live Regions
Use for dynamic content updates:
- `aria-live="polite"` - Announces when user is idle
- `aria-live="assertive"` - Announces immediately (use sparingly)

### Labels and Descriptions
- `aria-label` - When visible text isn't sufficient
- `aria-labelledby` - References another element's text
- `aria-describedby` - Additional description

### States and Properties
- `aria-expanded` - For collapsible content
- `aria-selected` - For selectable items
- `aria-checked` - For tri-state checkboxes
- `aria-disabled` - When disabled but still focusable

## Testing Tools

### Browser Extensions
- [axe DevTools](https://www.deque.com/axe/devtools/) - Free accessibility testing
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Built into Chrome DevTools
- [WAVE](https://wave.webaim.org/extension/) - Web Accessibility Evaluation Tool

### Screen Readers for Testing
- **Windows**: NVDA (free), JAWS
- **macOS**: VoiceOver (built-in)
- **Linux**: Orca
- **Mobile**: VoiceOver (iOS), TalkBack (Android)

## Common Accessibility Issues to Avoid

### ❌ Bad Practices
```tsx
// Missing alt text
<img src="chart.png" />

// Non-descriptive link text
<a href="/stats">Click here</a>

// Div acting as button without proper attributes
<div onClick={handleClick}>Submit</div>

// Color-only indication
<span style={{ color: 'red' }}>Error</span>
```

### ✅ Good Practices
```tsx
// Descriptive alt text
<img src="chart.png" alt="Pomodoro completion chart showing 80% completion rate this week" />

// Descriptive link text
<a href="/stats">View detailed statistics</a>

// Proper button semantics
<button type="button" onClick={handleClick}>Submit</button>

// Multiple indicators
<span className="error-text">
  <AlertIcon aria-hidden="true" />
  Error: Please enter a valid task name
</span>
```

## CI/CD Integration

The accessibility pipeline runs on every pull request:

1. **Jest accessibility tests** - Component-level a11y testing
2. **Lighthouse CI** - Full page accessibility audit
3. **ESLint jsx-a11y rules** - Static analysis for accessibility issues
4. **Manual review prompts** - Checklist for reviewers

### Pipeline Configuration

Tests fail if:
- Lighthouse accessibility score < 95%
- Jest accessibility tests fail
- Critical ESLint jsx-a11y rules are violated

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [React Accessibility Docs](https://reactjs.org/docs/accessibility.html)
- [axe-core Rule Descriptions](https://dequeuniversity.com/rules/axe/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

## Getting Help

If you need help with accessibility implementation:
1. Check this documentation first
2. Run the automated tests to identify specific issues
3. Consult the resources listed above
4. Ask in code review for accessibility guidance

Remember: Accessibility is not a feature to be added later—it should be considered from the beginning of every feature development.