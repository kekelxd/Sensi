import { expect, test } from '@playwright/test'

const openRoutine = async (page: import('@playwright/test').Page) => {
  await page.goto('./')
  await page.getByRole('button', { name: /TREINAR/ }).click()
  await page.getByRole('menuitem', { name: /Rotinas/ }).click()
  await expect(page.getByRole('heading', { name: 'Monte sua playlist de treino' })).toBeVisible()
}

test.describe('Custom routine builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('custom-routine-builder-ready')) {
        localStorage.clear()
        sessionStorage.setItem('custom-routine-builder-ready', 'true')
      }
      localStorage.setItem('sensi-locale', 'pt')
    })
  })

  test('creates, edits, reorders, repeats, saves and reloads a playlist', async ({ page }) => {
    await openRoutine(page)

    const routineName = page.getByLabel('Nome da rotina')
    await routineName.fill('Rotina ranked')
    await expect(page.getByText('6 min', { exact: true })).toBeVisible()

    await page.locator('.routine-builder-footer').getByRole('button', { name: /Adicionar exercício/ }).click()
    await expect(page.getByRole('dialog', { name: 'Adicionar exercício' })).toBeVisible()
    const addDialog = page.getByRole('dialog', { name: 'Adicionar exercício' })
    await page.getByRole('button', { name: /Gridshot/ }).click()
    await addDialog.getByRole('button', { name: '5 min' }).click()
    await addDialog.getByRole('button', { name: 'Difícil' }).click()
    await addDialog.getByRole('button', { name: /Adicionar exercício/ }).click()

    await expect(page.locator('.routine-builder-item')).toHaveCount(4)
    await expect(page.getByText('11 min', { exact: true })).toBeVisible()
    await expect(page.locator('.routine-builder-preview').first()).toBeVisible()
    expect(await page.locator('.routine-builder-preview').first().evaluate(el => el.getAnimations({ subtree: true }).some(animation => animation.playState === 'running'))).toBe(true)

    await page.locator('.routine-builder-item').first().getByLabel('Repetir minigame').click()
    await expect(page.locator('.routine-builder-item')).toHaveCount(5)
    await expect(page.getByText('13 min', { exact: true })).toBeVisible()

    const firstTitleBefore = await page.locator('.routine-builder-title strong').first().innerText()
    await page.locator('.routine-builder-item').nth(1).getByLabel('Mover para cima').click()
    await expect(page.locator('.routine-builder-title strong').first()).not.toHaveText(firstTitleBefore)

    await page.locator('.routine-builder-item').last().getByLabel('Remover exercício').click()
    await expect(page.locator('.routine-builder-item')).toHaveCount(4)
    await expect(page.getByText('11 min', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /^Salvar$/ }).click()
    await expect(page.getByRole('button', { name: 'Salvo' })).toBeVisible()
    await page.reload()
    await openRoutine(page)

    await expect(page.getByLabel('Nome da rotina')).toHaveValue('Rotina ranked')
    await expect(page.locator('.routine-builder-item')).toHaveCount(4)
    await expect(page.getByText('11 min', { exact: true })).toBeVisible()
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('xensi-custom-routine:v1')!))
    expect(saved.name).toBe('Rotina ranked')
    expect(saved.items.map((item: { order: number }) => item.order)).toEqual([0, 1, 2, 3])
    expect(saved.items.some((item: { modeId: string; durationSeconds: number; difficulty: string }) => item.modeId === 'gridshot' && item.durationSeconds === 300 && item.difficulty === 'hard')).toBe(true)
  })

  test('does not start an empty routine', async ({ page }) => {
    await openRoutine(page)
    while (await page.locator('.routine-builder-item').count()) {
      await page.locator('.routine-builder-item').first().getByLabel('Remover exercício').click()
    }

    await expect(page.getByText('Sua rotina está vazia.')).toBeVisible()
    await expect(page.getByRole('button', { name: /Iniciar rotina/ })).toBeDisabled()
  })
})

test.describe('Custom routine execution', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'Pointer-lock execution is validated on desktop.')
    await page.addInitScript(() => {
      localStorage.clear()
      localStorage.setItem('sensi-locale', 'pt')
      localStorage.setItem('xensi-custom-routine:v1', JSON.stringify({
        id: 'routine-test',
        name: 'Rotina smoke',
        gameId: 'cs2',
        items: [
          { id: 'one', modeId: 'flick', durationSeconds: 60, difficulty: 'easy', order: 0 },
          { id: 'two', modeId: 'tracking', durationSeconds: 60, difficulty: 'medium', order: 1 },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
      Math.random = () => .5
    })
  })

  test('runs real exercises, auto-transitions and records comparable PB duration context', async ({ page }) => {
    test.setTimeout(90000)
    await openRoutine(page)
    await page.clock.install()

    await page.getByRole('button', { name: /Iniciar rotina/ }).click()
    await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe('CANVAS')
    await page.clock.runFor(3500)
    await expect(page.getByText('Exercício 1 de 2')).toBeVisible()

    await page.clock.runFor(61000)
    await expect(page.getByText('Próximo: Tracking')).toBeVisible()
    await page.clock.runFor(3500)
    await expect(page.getByText('Exercício 2 de 2')).toBeVisible()

    await page.clock.runFor(61000)
    await expect(page.getByRole('heading', { name: 'Rotina smoke' })).toBeVisible()
    await expect(page.getByText('Rotina concluída')).toBeVisible()
    await expect(page.locator('.routine-result-list article')).toHaveCount(2)

    const flick = await page.evaluate(() => JSON.parse(localStorage.getItem('sensi-warmup-session:v1:flick')!))
    const tracking = await page.evaluate(() => JSON.parse(localStorage.getItem('sensi-warmup-session:v1:tracking')!))
    expect(flick.history[0].sessionContext.configuration).toMatchObject({ difficulty: 'easy', durationSeconds: 60 })
    expect(tracking.history[0].sessionContext.configuration).toMatchObject({ difficulty: 'medium', durationSeconds: 60 })
  })
})
