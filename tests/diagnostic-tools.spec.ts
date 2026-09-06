import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function openDiagnostic(page: Page, name: RegExp) {
  await page.getByRole('button', { name: 'DIAGNÓSTICO', exact: true }).click()
  await page.getByRole('menuitem', { name }).click()
}

test.describe('Diagnostic tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('sensi-locale', 'pt'))
  })

  test('measures browser-observed refresh and invalidates focus loss', async ({ page }) => {
    await page.clock.install()
    await page.goto('./')
    await openDiagnostic(page, /Refresh Rate/)
    await page.getByRole('button', { name: 'Iniciar teste' }).click()
    await page.clock.runFor(5000)
    await expect(page.getByText('Teste concluído')).toBeVisible()
    await expect(page.getByText('Refresh observado')).toBeVisible()
    await expect(page.getByText(/não confirma a especificação física do monitor/i)).toBeVisible()

    await page.getByRole('button', { name: 'Testar novamente' }).click()
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await expect(page.getByText('Teste interrompido')).toBeVisible()
  })

  test('measures raw controller drift and handles disconnects', async ({ page }) => {
    await page.addInitScript(() => {
      const state = { connected: false, axes: [0.012, -0.008, 0.02, 0.006] }
      Object.defineProperty(window, '__xensiMockPad', { value: state })
      Object.defineProperty(navigator, 'getGamepads', {
        configurable: true,
        value: () => state.connected ? [{
          index: 0,
          id: 'XENSI Test Controller',
          connected: true,
          mapping: 'standard',
          timestamp: performance.now(),
          axes: state.axes,
          buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
          vibrationActuator: null,
          hapticActuators: [],
        }] : [],
      })
    })
    await page.clock.install()
    await page.goto('./')
    await openDiagnostic(page, /Drift do Controle/)
    await expect(page.getByText('Nenhum controle detectado')).toBeVisible()
    await page.evaluate(() => { (window as unknown as { __xensiMockPad: { connected: boolean } }).__xensiMockPad.connected = true })
    await page.clock.runFor(100)
    await expect(page.getByText('XENSI Test Controller')).toBeVisible()

    await page.getByRole('button', { name: 'Iniciar medição' }).click()
    await page.clock.runFor(7200)
    await expect(page.getByText('Medição concluída')).toBeVisible()
    await expect(page.getByText('Deslocamento do centro').first()).toBeVisible()
    await expect(page.getByText(/não confirma defeito físico/i)).toBeVisible()

    await page.getByRole('button', { name: 'Medir novamente' }).click()
    await page.evaluate(() => { (window as unknown as { __xensiMockPad: { connected: boolean } }).__xensiMockPad.connected = false })
    await page.clock.runFor(100)
    await expect(page.getByText(/controle foi desconectado/i)).toBeVisible()
  })
})
