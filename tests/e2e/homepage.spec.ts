import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/Pomofly/i);
    
    // Check for key elements
    await expect(page.locator('text=Pomofly')).toBeVisible();
  });

  test('displays pomodoro timer', async ({ page }) => {
    await page.goto('/');
    
    // Check for timer elements
    await expect(page.locator('[data-testid="timer-display"]')).toBeVisible();
    await expect(page.locator('button[data-testid="start-timer"]')).toBeVisible();
  });

  test('displays task management section', async ({ page }) => {
    await page.goto('/');
    
    // Check for task-related elements
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible();
    await expect(page.locator('button[data-testid="add-task"]')).toBeVisible();
  });
});