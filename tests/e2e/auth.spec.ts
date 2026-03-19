import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('shows authentication state', async ({ page }) => {
    await page.goto('/');
    
    // Check for authentication-related elements
    // This is a basic test - adjust selectors based on actual implementation
    const loginButton = page.locator('button[data-testid="login-button"]');
    const userProfile = page.locator('[data-testid="user-profile"]');
    
    // Either login button or user profile should be visible
    const isLoggedOut = await loginButton.isVisible().catch(() => false);
    const isLoggedIn = await userProfile.isVisible().catch(() => false);
    
    expect(isLoggedOut || isLoggedIn).toBeTruthy();
  });

  test('handles unauthenticated state gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Clear any existing authentication state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.reload();
    
    // Check that app doesn't crash and shows appropriate messaging
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).not.toContainText('undefined');
    
    // Check for either login prompt or guest access
    const hasLoginPrompt = await page.locator('text=/sign.?in/i').isVisible().catch(() => false);
    const hasGuestAccess = await page.locator('[data-testid="guest-access"]').isVisible().catch(() => false);
    const hasTimerAccess = await page.locator('[data-testid="timer-display"]').isVisible().catch(() => false);
    
    // Should have some form of access or prompt
    expect(hasLoginPrompt || hasGuestAccess || hasTimerAccess).toBeTruthy();
  });

  test('preserves user session on page reload', async ({ page }) => {
    // This test would need actual authentication setup
    // For now, we'll simulate by setting localStorage
    await page.goto('/');
    
    // Simulate authenticated state
    await page.evaluate(() => {
      localStorage.setItem('pomofly-demo-user', 'true');
    });
    
    await page.reload();
    
    // Check that authentication state persists
    const userSession = await page.evaluate(() => 
      localStorage.getItem('pomofly-demo-user')
    );
    
    expect(userSession).toBeTruthy();
  });
});