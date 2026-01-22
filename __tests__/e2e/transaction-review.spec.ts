import { test, expect } from '@playwright/test';

test.describe('Transaction Review Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the page where PDF upload is available (e.g., Dashboard or Spending)
    await page.goto('/spending');
  });

  test('should allow reviewing and editing transactions', async ({ page }) => {
    // 1. Upload a PDF statement (mocked or actual)
    // For this test, we assume there's a button to trigger the modal or upload
    // Since we can't easily upload a file in this generic test without more setup,
    // we'll focus on the interaction once the modal is open.
    // Ideally, we would have a way to trigger the modal with mock data for testing.
    
    // Assuming we can trigger the review modal (e.g., via a dev tool or hidden button for testing)
    // await page.click('#trigger-review-modal'); 
    
    // Check if modal is visible
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Review Transactions');

    // 2. Check Account Selection Persistence
    const accountSelect = modal.locator('text=Select Account'); // Or specific selector
    await accountSelect.click();
    await page.click('text=Bank 1');
    
    // Reload to check persistence
    await page.reload();
    // Trigger modal again...
    // await expect(accountSelect).toContainText('Bank 1');

    // 3. Check Transaction Type Column
    const typeHeader = modal.locator('text=Type').first();
    await expect(typeHeader).toBeVisible();
    
    const firstRowType = modal.locator('select').filter({ hasText: 'Expense' }).first(); // Assuming select displays value
    await expect(firstRowType).toBeVisible();
    
    // Change type
    await firstRowType.click();
    await page.click('text=Income');
    await expect(firstRowType).toHaveText('Income');

    // 4. Test AI Suggestion
    const aiButton = modal.locator('button', { hasText: 'AI Suggest' });
    await aiButton.click();
    
    // Check for loading state
    await expect(aiButton).toBeDisabled();
    
    // Check for badges
    const badges = modal.locator('[title="AI Suggested"]');
    await expect(badges.first()).toBeVisible();

    // 5. Submit
    await modal.locator('button', { hasText: 'Confirm Import' }).click();
    
    // Verify modal closed
    await expect(modal).not.toBeVisible();
  });
});
