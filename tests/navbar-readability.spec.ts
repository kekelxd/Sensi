import { expect, test } from '@playwright/test'

test.describe('Readable XENSI navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { if (!localStorage.getItem('sensi-locale')) localStorage.setItem('sensi-locale', 'pt') })
    await page.goto('./')
  })

  test('opens only Minigames and Routines and preserves their destinations', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'TREINAR', exact: true })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const menu = page.getByRole('menu', { name: 'TREINAR', exact: true })
    await expect(menu.getByRole('menuitem')).toHaveCount(2)
    await expect(menu.locator('.xensi-nav-dropdown-label')).toHaveCount(0)
    await page.keyboard.press('Tab')
    await expect(menu.getByRole('menuitem', { name: /Minigames/ })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('.warmup-exercises > button')).toHaveCount(7)
    await trigger.focus()
    await page.keyboard.press('ArrowDown')
    await expect(menu.getByRole('menuitem', { name: /Minigames/ })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(menu.getByRole('menuitem', { name: /Rotinas/ })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('.routine-workspace')).toBeVisible()
    await trigger.click()
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await expect(page).toHaveURL(/\/Sensi\/$/)
  })

  test('renders readable menus, aligned user controls and contained dropdowns', async ({ page }, info) => {
    const nav = page.locator('.xensi-navigation')
    const primary = page.locator('.xensi-primary-nav')
    expect(await primary.getByRole('button', { name: 'TREINAR', exact: true }).evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12)
    if (page.viewportSize()!.width > 1080) {
      expect(await primary.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
      const user = page.locator('.xensi-user-trigger')
      await expect(user.locator('b')).toBeVisible()
      await expect(user.locator('b')).toHaveCSS('font-size', '14px')
      const avatar = await user.locator('.xensi-avatar').boundingBox()
      const nick = await user.locator('b').boundingBox()
      expect(Math.abs(avatar!.y + avatar!.height / 2 - nick!.y - nick!.height / 2)).toBeLessThan(3)
    }
    for (const type of ['train', 'calibrate', 'diagnostic', 'profile']) {
      const trigger = type === 'profile' ? page.locator('.xensi-user-trigger') : primary.getByRole('button', { name: { train: 'TREINAR', calibrate: 'CALIBRAR', diagnostic: 'DIAGNÓSTICO' }[type], exact: true })
      await trigger.click()
      const menu = page.locator('.xensi-nav-dropdown')
      await expect(menu).toBeVisible()
      await expect(menu).toHaveCSS('opacity', '1')
      await expect(menu.locator('button b').first()).toHaveCSS('font-size', '15px')
      if (type === 'train' || type === 'diagnostic') {
        await expect(menu.locator('small').first()).toHaveCSS('font-size', '13px')
        await expect(menu.locator('small').first()).toHaveCSS('color', 'rgb(167, 175, 184)')
      }
      const box = (await menu.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width)
      await page.screenshot({ path: `test-results/navbar-${type}-${info.project.name}.png`, animations: 'disabled' })
      if (type === 'profile') {
        await menu.getByRole('button', { name: 'Meu perfil', exact: true }).click()
        await expect(page.getByRole('heading', { name: 'Perfil', exact: true })).toBeVisible()
      } else await page.keyboard.press('Escape')
    }
    expect((await nav.boundingBox())!.height).toBeLessThanOrEqual(74)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })

  test('translates both training entries', async ({ page }) => {
    for (const [locale, trigger, names] of [
      ['en', 'TRAIN', ['Minigames Individual exercises', 'Routines Training sequences']],
      ['es', 'ENTRENAR', ['Minijuegos Ejercicios individuales', 'Rutinas Secuencias de entrenamiento']],
    ] as const) {
      await page.evaluate(value => localStorage.setItem('sensi-locale', value), locale)
      await page.reload()
      await page.getByRole('button', { name: trigger, exact: true }).click()
      const items = page.getByRole('menu', { name: trigger, exact: true }).getByRole('menuitem')
      await expect(items).toHaveCount(2)
      await expect(items.nth(0)).toHaveAccessibleName(names[0])
      await expect(items.nth(1)).toHaveAccessibleName(names[1])
    }
  })
})
