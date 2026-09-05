import { expect, test } from '@playwright/test'

test.describe('Compact XENSI home', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('sensi-locale', 'pt')
    })
    await page.goto('./')
  })

  test('keeps the hero and control summary prioritized in the first viewport', async ({ page }, testInfo) => {
    const hero = page.locator('.xensi-reference-hero')
    const control = page.locator('.xensi-home-control')
    await expect(hero).toBeVisible()
    await expect(control).toBeVisible()

    const viewport = page.viewportSize()
    const heroBox = await hero.boundingBox()
    const controlBox = await control.boundingBox()
    expect(heroBox).not.toBeNull()
    expect(controlBox).not.toBeNull()
    if (viewport && viewport.width >= 1366) {
      expect(heroBox!.height).toBeLessThanOrEqual(410)
      expect(controlBox!.y + controlBox!.height).toBeLessThanOrEqual(viewport.height)
    }

    await testInfo.attach(`home-${testInfo.project.name}`, {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png',
    })
  })

  test('shows an honest empty state without zero-valued performance metrics', async ({ page }) => {
    await expect(page.getByText('Nenhuma sessão ainda.')).toBeVisible()
    await expect(page.getByText('0%', { exact: true })).toHaveCount(0)
    await expect(page.getByText('0ms', { exact: true })).toHaveCount(0)
  })

  test('keeps each primary metric in one visual source', async ({ page }) => {
    await page.evaluate(() => {
      const now = new Date().toISOString()
      window.localStorage.setItem('sensi-warmup-session:v1:tracking', JSON.stringify({ score: 100, accuracy: 84, hits: 10, shots: 10, onTargetMs: 30000, reactionTimeMs: 184, clickErrors: 0, bestStreak: 4, bestTrackingStreakMs: 2000, overshootCount: 1, correctionCount: 10 }))
      window.localStorage.setItem('sensi-calibration-history:v1:cs2', JSON.stringify([{ id: 'home-test', completedAt: now, sensitivity: .68, rangeMinSensitivity: .65, rangeMaxSensitivity: .7, multiplier: 1, score: 90, accuracy: 92, meanError: 21, smoothness: 89, overshoots: 2, confidenceScore: 90, collectionQualityScore: 90, playerConsistencyScore: 87, recommendationStrengthScore: 90, resultKind: 'recommended', dpi: 800, horizontalFov: 106, cmPer360: 38.2 }]))
    })
    await page.reload()
    const control = page.locator('.xensi-home-control')
    await expect(control.getByText('Precisão', { exact: true })).toHaveCount(1)
    await expect(control.getByText('Tracking', { exact: true })).toHaveCount(1)
    await expect(control.getByText('Reação', { exact: true })).toHaveCount(1)
    await expect(control.getByText('Sensibilidade atual', { exact: true })).toHaveCount(1)
    await expect(page.locator('.xensi-reference-metrics')).toHaveCount(0)
    await expect(page.locator('.xensi-reference-status')).toHaveCount(0)
    await expect(page.locator('.xensi-reference-mode-list')).toHaveCount(0)
  })

  test('opens every home destination and preserves the navigation background', async ({ page }) => {
    const header = page.locator('.app-header')
    const initialBackground = await header.evaluate((element) => getComputedStyle(element).backgroundImage)
    const assertHeader = async () => expect(await header.evaluate((element) => getComputedStyle(element).backgroundImage)).toBe(initialBackground)

    await page.getByRole('button', { name: 'Começar treino' }).first().click()
    await expect(page.getByRole('heading', { name: /Prepare a mira antes da partida/i })).toBeVisible()
    await assertHeader()
    await page.getByRole('button', { name: /XENSI home/i }).click()

    await page.getByRole('button', { name: /Calibrar/i }).last().click()
    await expect(page.getByRole('heading', { name: /Encontre sua sensibilidade ideal/i })).toBeVisible()
    await assertHeader()
    await page.getByRole('button', { name: /XENSI home/i }).click()

    await page.getByRole('button', { name: /Converter/i }).last().click()
    await expect(page.getByRole('heading', { name: /Conversor/i })).toBeVisible()
    await assertHeader()
    await page.getByRole('button', { name: /XENSI home/i }).click()

    await page.getByRole('button', { name: /Testar polling rate/i }).click()
    await expect(page.getByRole('heading', { name: /Teste de polling rate/i })).toBeVisible()
    await assertHeader()
    await page.getByRole('button', { name: /XENSI home/i }).click()

    await page.getByRole('button', { name: /Abrir diagnóstico/i }).click()
    await expect(page.getByRole('heading', { name: 'Diagnóstico de entrada', exact: true })).toBeVisible()
    await assertHeader()

    await page.getByRole('button', { name: 'ANÁLISE', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Análise', exact: true })).toBeVisible()
    await assertHeader()
  })

  test('does not create horizontal page overflow', async ({ page }) => {
    const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }))
    expect(sizes.content).toBeLessThanOrEqual(sizes.viewport)
  })
})
