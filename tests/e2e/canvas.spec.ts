import { test, expect } from '@playwright/test'

test.describe('Sustainability Canvas pane', () => {
  test('renders text, chart, table, and citations blocks injected via store', async ({ page }) => {
    await page.goto('/')

    await page.locator('#specialists button').first().click()
    await expect(page.getByRole('button', { name: 'Canvas' })).toBeVisible()

    await page.getByRole('button', { name: 'Canvas' }).click()
    const pane = page.locator('aside').filter({ hasText: 'Sustainability Canvas' })
    await expect(pane).toBeVisible()
    await expect(pane.getByText(/Waiting for sustainability insights/)).toBeVisible()

    await page.evaluate(() => {
      const store = (window as unknown as {
        __canvasStore: { getState: () => { append: (b: unknown) => void; clear: () => void } }
      }).__canvasStore
      store.getState().clear()
      store.getState().append({
        kind: 'text',
        id: 'text-1',
        title: 'ISSB Brief',
        tags: ['ISSB', 'TCFD'],
        body: 'Scope 1+2 emissions rose 3% YoY; disclosure aligns with IFRS S2.',
      })
      store.getState().append({
        kind: 'chart',
        id: 'chart-1',
        title: 'Emissions by scope',
        unit: 'tCO2e',
        tags: ['GHG_PROTOCOL'],
        series: [
          { label: 'Scope 1', value: 120 },
          { label: 'Scope 2', value: 340 },
          { label: 'Scope 3', value: 980 },
        ],
      })
      store.getState().append({
        kind: 'table',
        id: 'table-1',
        title: 'Material topics',
        tags: ['ESRS'],
        columns: ['Topic', 'Impact', 'Financial'],
        rows: [
          ['Climate change', 'High', 'High'],
          ['Biodiversity', 'Medium', 'Low'],
        ],
      })
      store.getState().append({
        kind: 'citations',
        id: 'cite-1',
        title: 'Sources',
        sources: [
          { label: 'IFRS S2', url: 'https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/ifrs-s2-climate-related-disclosures/' },
          { label: 'ESRS E1', url: 'https://www.efrag.org/' },
        ],
      })
    })

    await expect(pane.getByText('ISSB Brief')).toBeVisible()
    await expect(pane.getByText(/Scope 1\+2 emissions rose 3% YoY/)).toBeVisible()
    await expect(pane.locator('span', { hasText: 'ISSB' }).first()).toBeVisible()

    await expect(pane.getByText('Emissions by scope')).toBeVisible()
    await expect(pane.getByText('Scope 1', { exact: true })).toBeVisible()
    await expect(pane.getByText('Scope 2', { exact: true })).toBeVisible()
    await expect(pane.getByText('Scope 3', { exact: true })).toBeVisible()

    await expect(pane.getByText('Material topics')).toBeVisible()
    await expect(pane.locator('th', { hasText: 'Topic' })).toBeVisible()
    await expect(pane.locator('td', { hasText: 'Climate change' })).toBeVisible()
    await expect(pane.locator('td', { hasText: 'Biodiversity' })).toBeVisible()

    await expect(pane.getByRole('link', { name: 'IFRS S2' })).toHaveAttribute('href', /ifrs\.org/)
    await expect(pane.getByRole('link', { name: 'ESRS E1' })).toBeVisible()

    await pane.getByRole('button', { name: 'clear' }).click()
    await expect(pane.getByText(/Waiting for sustainability insights/)).toBeVisible()
  })
})
