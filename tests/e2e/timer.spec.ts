import { test, expect } from '@playwright/test';

test.describe('Pomodoro Timer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('starts and pauses timer', async ({ page }) => {
    // Start the timer
    await page.click('button[data-testid="start-timer"]');
    
    // Check that timer is running (play button becomes pause button)
    await expect(page.locator('button[data-testid="pause-timer"]')).toBeVisible();
    
    // Pause the timer
    await page.click('button[data-testid="pause-timer"]');
    
    // Check that timer is paused (pause button becomes play button)
    await expect(page.locator('button[data-testid="start-timer"]')).toBeVisible();
  });

  test('resets timer', async ({ page }) => {
    // Start timer first
    await page.click('button[data-testid="start-timer"]');
    
    // Wait a moment for timer to tick
    await page.waitForTimeout(2000);
    
    // Reset timer
    await page.click('button[data-testid="reset-timer"]');
    
    // Check that timer is back to initial state
    await expect(page.locator('[data-testid="timer-display"]')).toContainText('25:00');
    await expect(page.locator('button[data-testid="start-timer"]')).toBeVisible();
  });

  test('displays timer settings', async ({ page }) => {
    // Open settings
    await page.click('button[data-testid="timer-settings"]');
    
    // Check settings modal/panel is visible
    await expect(page.locator('[data-testid="timer-settings-panel"]')).toBeVisible();
    
    // Check for duration inputs
    await expect(page.locator('input[data-testid="pomodoro-duration"]')).toBeVisible();
    await expect(page.locator('input[data-testid="short-break-duration"]')).toBeVisible();
    await expect(page.locator('input[data-testid="long-break-duration"]')).toBeVisible();
  });

  test('updates timer duration from settings', async ({ page }) => {
    // Open settings
    await page.click('button[data-testid="timer-settings"]');
    
    // Change pomodoro duration to 30 minutes
    await page.fill('input[data-testid="pomodoro-duration"]', '30');
    
    // Save settings
    await page.click('button[data-testid="save-timer-settings"]');
    
    // Check that timer display reflects new duration
    await expect(page.locator('[data-testid="timer-display"]')).toContainText('30:00');
  });
});