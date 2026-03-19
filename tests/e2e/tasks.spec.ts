import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('adds a new task', async ({ page }) => {
    // Click add task button
    await page.click('button[data-testid="add-task"]');
    
    // Fill in task details
    await page.fill('input[data-testid="task-title"]', 'Test Task');
    await page.fill('textarea[data-testid="task-description"]', 'This is a test task description');
    
    // Save the task
    await page.click('button[data-testid="save-task"]');
    
    // Check that task appears in the list
    await expect(page.locator('[data-testid="task-list"]')).toContainText('Test Task');
  });

  test('marks task as complete', async ({ page }) => {
    // First add a task
    await page.click('button[data-testid="add-task"]');
    await page.fill('input[data-testid="task-title"]', 'Complete Me');
    await page.click('button[data-testid="save-task"]');
    
    // Mark task as complete
    await page.click('input[data-testid="task-checkbox"]:first');
    
    // Check that task shows as completed
    await expect(page.locator('[data-testid="task-item"]:first')).toHaveClass(/completed/);
  });

  test('edits existing task', async ({ page }) => {
    // First add a task
    await page.click('button[data-testid="add-task"]');
    await page.fill('input[data-testid="task-title"]', 'Original Task');
    await page.click('button[data-testid="save-task"]');
    
    // Edit the task
    await page.click('button[data-testid="edit-task"]:first');
    await page.fill('input[data-testid="task-title"]', 'Updated Task');
    await page.click('button[data-testid="save-task"]');
    
    // Check that task shows updated title
    await expect(page.locator('[data-testid="task-list"]')).toContainText('Updated Task');
    await expect(page.locator('[data-testid="task-list"]')).not.toContainText('Original Task');
  });

  test('deletes task', async ({ page }) => {
    // First add a task
    await page.click('button[data-testid="add-task"]');
    await page.fill('input[data-testid="task-title"]', 'Delete Me');
    await page.click('button[data-testid="save-task"]');
    
    // Delete the task
    await page.click('button[data-testid="delete-task"]:first');
    
    // Confirm deletion if confirmation dialog appears
    if (await page.locator('button[data-testid="confirm-delete"]').isVisible()) {
      await page.click('button[data-testid="confirm-delete"]');
    }
    
    // Check that task is no longer in the list
    await expect(page.locator('[data-testid="task-list"]')).not.toContainText('Delete Me');
  });

  test('filters tasks by completion status', async ({ page }) => {
    // Add multiple tasks
    await page.click('button[data-testid="add-task"]');
    await page.fill('input[data-testid="task-title"]', 'Completed Task');
    await page.click('button[data-testid="save-task"]');
    
    await page.click('button[data-testid="add-task"]');
    await page.fill('input[data-testid="task-title"]', 'Pending Task');
    await page.click('button[data-testid="save-task"]');
    
    // Mark first task as complete
    await page.click('input[data-testid="task-checkbox"]:first');
    
    // Filter to show only completed tasks
    await page.click('button[data-testid="filter-completed"]');
    
    // Check that only completed task is visible
    await expect(page.locator('[data-testid="task-list"]')).toContainText('Completed Task');
    await expect(page.locator('[data-testid="task-list"]')).not.toContainText('Pending Task');
    
    // Filter to show only pending tasks
    await page.click('button[data-testid="filter-pending"]');
    
    // Check that only pending task is visible
    await expect(page.locator('[data-testid="task-list"]')).toContainText('Pending Task');
    await expect(page.locator('[data-testid="task-list"]')).not.toContainText('Completed Task');
  });
});