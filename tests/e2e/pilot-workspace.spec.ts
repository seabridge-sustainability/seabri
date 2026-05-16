import { test, expect } from '@playwright/test'

test.describe('OpenSeaBri Pilot Workspace', () => {
  test('renders guided workflows, profile controls, and activity history', async ({ page }) => {
    await page.route('**/api/seabri/**', async (route) => {
      const url = route.request().url()
      const payload =
        url.includes('water-conservation-plan')
          ? {
              summary: 'Water plan ready',
              confidence: 'medium',
              leakCheckSteps: ['Check the meter during a no-use hour.'],
              noCostActions: ['Run full laundry loads.'],
              assumptions: ['Local watering rules were not verified.'],
              unknowns: ['Exact fixture flow rates.'],
            }
          : url.includes('waste-recycling-guide')
            ? {
                summary: 'Waste guide ready',
                confidence: 'medium',
                reuseRepairRecycleDisposeGuidance: ['Use a certified battery drop-off before disposal.'],
                hazardousWarning: 'Battery-like items may be hazardous.',
                assumptions: ['Local acceptance was not verified.'],
                unknowns: ['Municipal drop-off site hours.'],
              }
          : url.includes('grant-opportunities')
            ? {
                summary: 'Grant guidance ready',
                confidence: 'low',
                dataStatus: 'not_verified',
                searchStrategies: ['Search source grant portals and verify deadlines.'],
                assumptions: ['No live grant database was queried.'],
                unknowns: ['Current deadlines and eligibility.'],
              }
          : url.includes('repair-vs-replace')
            ? {
                summary: 'Repair guidance ready',
                confidence: 'medium',
                repairRecommendation: 'Repair first if safe and reliable.',
                nextSteps: ['Get a written repair quote.'],
                assumptions: ['No product database was queried.'],
                unknowns: ['Exact remaining life.'],
              }
          : url.includes('home-resilience-retrofit-plan')
            ? {
                summary: 'Retrofit plan ready',
                confidence: 'medium',
                prioritizedResilienceUpgrades: ['Inspect drainage before buying equipment.'],
                assumptions: ['Local hazard maps were not verified.'],
                unknowns: ['Permit requirements.'],
              }
          : url.includes('building-material-comparison')
            ? {
                summary: 'Material comparison ready',
                confidence: 'medium',
                materialOptions: ['Durable repairable option with low-VOC documentation.'],
                assumptions: ['No product EPD database was queried.'],
                unknowns: ['Product-specific documentation.'],
              }
          : url.includes('emergency-preparedness-plan')
            ? {
                summary: 'Emergency plan ready',
                confidence: 'medium',
                emergencyChecklist: ['Sign up for verified local alerts.'],
                supplyList: ['Water and battery packs.'],
                assumptions: ['Official local guidance was not queried.'],
                unknowns: ['Evacuation zone.'],
              }
          : url.includes('utility-bill-interpreter')
              ? {
                  summary: 'Utility bill interpreted',
                  confidence: 'medium',
                  nextSteps: ['Compare the unit cost with the previous bill.'],
                  assumptions: ['Rate schedule was not verified.'],
                  unknowns: ['Taxes and rider details.'],
                }
              : { ok: true }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      })
    })

    await page.goto('/')
    await page.getByText('Demos').click()

    await expect(page.getByRole('heading', { name: 'OpenSeaBri Pilot Workspace' })).toBeVisible()
    await expect(page.getByText('Personal Sustainability')).toBeVisible()
    await expect(page.getByText('Community & NGO Tools')).toBeVisible()
    await expect(page.getByText('Sustainable Compute / Agent Harness')).toBeVisible()
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

    await page.getByRole('button', { name: 'Repair or Replace' }).click()
    const repairWorkflow = page.getByLabel('Repair versus replace workflow')
    await expect(repairWorkflow).toBeVisible()
    await page.getByRole('button', { name: 'Advise repair or replace' }).click()
    await expect(repairWorkflow.getByText('Repair guidance ready', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Retrofit Plan' }).click()
    const retrofitWorkflow = page.getByLabel('Home resilience retrofit workflow')
    await expect(retrofitWorkflow).toBeVisible()
    await page.getByRole('button', { name: 'Plan resilience retrofits' }).click()
    await expect(retrofitWorkflow.getByText('Retrofit plan ready', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Materials' }).click()
    const materialsWorkflow = page.getByLabel('Building material comparison workflow')
    await expect(materialsWorkflow).toBeVisible()
    await page.getByRole('button', { name: 'Compare materials' }).click()
    await expect(materialsWorkflow.getByText('Material comparison ready', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Emergency Prep' }).click()
    const preparednessWorkflow = page.getByLabel('Emergency preparedness workflow')
    await expect(preparednessWorkflow).toBeVisible()
    await page.getByRole('button', { name: 'Build emergency plan' }).click()
    await expect(preparednessWorkflow.getByText('Emergency plan ready', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Grant Funding' }).click()
    const grantWorkflow = page.getByLabel('Grant funding workflow')
    await expect(grantWorkflow).toBeVisible()
    await page.getByRole('button', { name: 'Build funding search' }).click()
    await expect(grantWorkflow.getByText('Grant guidance ready', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Water' }).click()
    const waterWorkflow = page.getByLabel('Water conservation workflow')
    await expect(waterWorkflow).toBeVisible()
    await page.getByRole('button', { name: 'Plan water savings' }).click()
    await expect(waterWorkflow.getByText('Water plan ready', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Waste & Recycling' }).click()
    const wasteWorkflow = page.getByLabel('Waste and recycling workflow')
    await expect(wasteWorkflow).toBeVisible()
    await page.getByRole('button', { name: 'Build local guide' }).click()
    await expect(wasteWorkflow.getByText('Waste guide ready', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Utility Bill' }).click()
    const utilityWorkflow = page.getByLabel('Utility bill workflow')
    await expect(utilityWorkflow).toBeVisible()
    await page.getByRole('button', { name: 'Interpret bill' }).click()
    await expect(utilityWorkflow.getByText('Utility bill interpreted', { exact: true })).toBeVisible()

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
