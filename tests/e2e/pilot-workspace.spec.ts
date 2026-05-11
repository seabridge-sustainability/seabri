import { test, expect } from '@playwright/test'

test.describe('OpenSeaBri Pilot Workspace', () => {
  test('renders guided workflows, profile controls, and activity history', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Demos').click()

    await expect(page.getByRole('heading', { name: 'OpenSeaBri Pilot Workspace' })).toBeVisible()
    await expect(page.getByText('Personal Sustainability')).toBeVisible()
    await expect(page.getByText('Community & NGO Tools')).toBeVisible()
    await expect(page.getByText('Sustainable AI / Agent Harness')).toBeVisible()
    await expect(page.getByLabel('Pilot profile')).toBeVisible()
    await page.getByLabel('Name', { exact: true }).fill('Pilot User')
    await page.getByLabel('Street address', { exact: true }).fill('123 Water St')
    await page.getByLabel('City', { exact: true }).fill('Miami')
    await page.getByLabel('State', { exact: true }).fill('FL')
    await page.getByLabel('ZIP', { exact: true }).fill('33101')
    await page.getByLabel('Phone', { exact: true }).fill('+13055550100')
    await page.getByLabel('Preferred language', { exact: true }).fill('English')
    await page.getByRole('button', { name: 'Save profile' }).click()

    await expect(page.getByLabel('Recent activity')).toContainText('Profile')
    await expect(page.getByLabel('Living Companion workflow')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create action plan' })).toBeVisible()

    await page.getByRole('button', { name: 'Product Comparison' }).click()
    await expect(page.getByLabel('Product comparison workflow')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Compare products' })).toBeVisible()

    await page.getByRole('button', { name: 'Carbon Footprint' }).click()
    await expect(page.getByLabel('Household carbon footprint workflow')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Estimate footprint' })).toBeVisible()

    await page.getByRole('button', { name: 'Home Energy' }).click()
    await expect(page.getByLabel('Home energy planner workflow')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Plan energy actions' })).toBeVisible()

    await page.getByRole('button', { name: 'Project Planner' }).click()
    await expect(page.getByLabel('Community project workflow')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Plan project' })).toBeVisible()

    await page.getByRole('button', { name: 'Certification' }).click()
    await expect(page.getByLabel('Certification navigator workflow')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Find certification path' })).toBeVisible()

    await page.getByRole('button', { name: 'Offset Checker' }).click()
    await expect(page.getByLabel('Carbon offset checker workflow')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Check offset quality' })).toBeVisible()

    await page.getByRole('button', { name: 'Purchasing' }).click()
    await expect(page.getByLabel('Sustainable purchasing workflow')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Build buying checklist' })).toBeVisible()

    await page.getByRole('button', { name: 'Resilience' }).click()
    await expect(page.getByLabel('Community resilience workflow')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Build resilience checklist' })).toBeVisible()

    await page.getByRole('button', { name: 'Sustainable Compute' }).click()
    await expect(page.getByLabel('Sustainable compute workflow')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Optimize workflow' })).toBeVisible()

    await page.getByRole('button', { name: 'Skills & Tools' }).click()
    await expect(page.getByLabel('Skills and tools catalog')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Load catalog' })).toBeVisible()

    await page.getByRole('button', { name: 'Delete profile' }).click()
    await expect(page.getByText('Profile deleted from this browser and delete was attempted on the gateway when configured.')).toBeVisible()
  })
})
