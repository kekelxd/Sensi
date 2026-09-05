import { expect, test } from '@playwright/test'

const diagnostics = () => ({ name: 'DIAGNÓSTICO', exact: true })

test.describe('Diagnostics navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('sensi-locale', 'pt'))
    await page.goto('./')
  })

  test('opens the submenu and navigates to both existing diagnostic views', async ({ page }) => {
    const trigger = page.getByRole('button', diagnostics())
    await expect(trigger).toBeVisible()
    await trigger.click()

    const menu = page.getByRole('menu', { name: 'DIAGNÓSTICO' })
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /Teste de Polling Rate/ })).toContainText('Meça a frequência real de atualização do mouse.')
    await expect(menu.getByRole('menuitem', { name: /Diagnóstico de Entrada/ })).toContainText('Analise estabilidade e comportamento do input.')

    await menu.getByRole('menuitem', { name: /Teste de Polling Rate/ }).click()
    await expect(page.getByRole('heading', { name: /Teste de polling rate/i })).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-current', 'page')
    await expect(page).toHaveURL(/\/Sensi\/$/)

    await trigger.click()
    await expect(page.getByRole('menuitem', { name: /Teste de Polling Rate/ })).toHaveAttribute('aria-current', 'page')
    await page.getByRole('menuitem', { name: /Diagnóstico de Entrada/ }).click()
    await expect(page.getByRole('heading', { name: 'Diagnóstico de entrada', exact: true })).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-current', 'page')
    await expect(page).toHaveURL(/\/Sensi\/$/)
  })

  test('closes with Escape and restores focus to the trigger', async ({ page }) => {
    const trigger = page.getByRole('button', diagnostics())
    await trigger.click()
    await expect(page.getByRole('menu', { name: 'DIAGNÓSTICO' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu', { name: 'DIAGNÓSTICO' })).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('closes when the user clicks outside', async ({ page }) => {
    await page.getByRole('button', diagnostics()).click()
    await page.getByRole('heading', { name: /Treine sua mira/i }).click()
    await expect(page.getByRole('menu', { name: 'DIAGNÓSTICO' })).toBeHidden()
  })

  test('supports keyboard opening and arrow navigation', async ({ page }) => {
    const trigger = page.getByRole('button', diagnostics())
    await trigger.focus()
    await page.keyboard.press('ArrowDown')
    const polling = page.getByRole('menuitem', { name: /Teste de Polling Rate/ })
    const input = page.getByRole('menuitem', { name: /Diagnóstico de Entrada/ })
    await expect(polling).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(input).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Diagnóstico de entrada', exact: true })).toBeVisible()
  })
})
