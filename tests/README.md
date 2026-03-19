# End-to-End Testing with Playwright

This directory contains E2E tests for the Pomofly application using Playwright.

## Setup

### Prerequisites

Install system dependencies for running browsers (Linux):
```bash
# Ubuntu/Debian
sudo apt-get install libxcb-shm0 libx11-xcb1 libxrandr2 libxcomposite1 libxcursor1 libxdamage1 libxfixes3 libxi6 libgtk-3-0t64 libpangocairo-1.0-0 libpango-1.0-0 libatk1.0-0t64 libcairo-gobject2 libcairo2 libgdk-pixbuf-2.0-0 libxrender1 libasound2t64

# Or use Playwright's install command
npx playwright install-deps
```

### Installing Browsers

```bash
# Install Playwright browsers
npx playwright install
```

## Running Tests

### Development
```bash
# Run all E2E tests
yarn test:e2e

# Run tests in headed mode (with browser UI)
yarn test:e2e:headed

# Run tests in debug mode
yarn test:e2e:debug

# View test report
yarn test:e2e:report
```

### CI/CD
Tests automatically run on:
- Push to main/develop branches
- Pull requests to main/develop branches

## Test Structure

- `homepage.spec.ts` - Basic page loading and element visibility tests
- `timer.spec.ts` - Pomodoro timer functionality tests
- `tasks.spec.ts` - Task management functionality tests
- `auth.spec.ts` - Authentication flow tests

## Configuration

Configuration is in `playwright.config.ts`:
- Tests run against `http://localhost:3000`
- Supports Chrome, Firefox, Safari, and mobile viewports
- Automatically starts dev server before running tests
- Generates HTML reports
- Captures traces on test failures

## Test Patterns

### Data Test IDs
Tests use `data-testid` attributes for reliable element selection:
```html
<button data-testid="start-timer">Start</button>
```

### Page Object Pattern
For complex flows, consider implementing page object pattern:
```typescript
class TimerPage {
  constructor(private page: Page) {}
  
  async startTimer() {
    await this.page.click('[data-testid="start-timer"]');
  }
}
```

### Visual Testing
Playwright supports visual regression testing:
```typescript
await expect(page).toHaveScreenshot('timer-page.png');
```

## Debugging

### VS Code Extension
Install the Playwright VS Code extension for:
- Running tests from the editor
- Setting breakpoints
- Step-by-step debugging

### Debug Mode
```bash
yarn test:e2e:debug
```
Opens Playwright Inspector for interactive debugging.

### Trace Viewer
View detailed execution traces:
```bash
npx playwright show-trace trace.zip
```

## Best Practices

1. **Use data-testid attributes** for test-specific element selection
2. **Wait for elements** instead of using fixed timeouts
3. **Test user flows**, not implementation details
4. **Keep tests independent** - each test should work in isolation
5. **Use meaningful test names** that describe the behavior being tested
6. **Group related tests** using `test.describe()` blocks

## Continuous Integration

Tests run automatically on GitHub Actions with:
- Multiple browser engines (Chrome, Firefox, Safari)
- Mobile viewport testing
- Artifact collection for failed tests
- HTML report generation