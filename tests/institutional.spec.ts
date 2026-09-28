import { expect, test, type Page } from '@playwright/test'

async function useStoredLocale(page: Page, locale: 'pt' | 'en') {
  await page.addInitScript((value) => {
    window.localStorage.setItem('sensi-locale', value)
  }, locale)
}

test.describe('XENSI institutional pages', () => {
  test('opens every footer link and keeps the shared layout in Portuguese', async ({ page }) => {
    await useStoredLocale(page, 'pt')
    await page.goto('./')

    const pages = [
      ['Sobre', /\/sobre$/, 'Sobre o XENSI'],
      ['Privacidade', /\/privacidade$/, 'Privacidade'],
      ['Termos', /\/termos$/, 'Termos de Uso'],
      ['Contato', /\/contato$/, 'Contato'],
    ] as const

    for (const [link, url, heading] of pages) {
      await page.locator('.xensi-home-v3-footer').getByRole('link', { name: link }).click()
      await expect(page).toHaveURL(url)
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
      await expect(page.locator('.app-header')).toBeVisible()
      await expect(page.locator('.xensi-home-v3-footer')).toBeVisible()
      await page.reload()
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()

      const layout = await page.evaluate(() => ({
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        footerBottomGap: (() => {
          const footer = document.querySelector('.xensi-home-v3-footer')
          if (!footer) return -1
          const rect = footer.getBoundingClientRect()
          return Math.round(document.documentElement.scrollHeight - (window.scrollY + rect.bottom))
        })(),
      }))
      expect(layout.horizontalOverflow).toBe(0)
      expect(Math.abs(layout.footerBottomGap)).toBeLessThanOrEqual(1)

      await page.getByRole('button', { name: /XENSI home/i }).click()
      await expect(page).toHaveURL(/\/$/)
    }
  })

  test('renders English copy from saved language preference', async ({ page }) => {
    await useStoredLocale(page, 'en')
    await page.goto('./about')

    await expect(page).toHaveURL(/\/sobre$/)
    await expect(page.getByRole('heading', { name: 'About XENSI', level: 1 })).toBeVisible()
    await expect(page.getByText('Made by players, for players.')).toBeVisible()
    await page.getByRole('link', { name: 'Privacy' }).click()
    await expect(page).toHaveURL(/\/privacidade$/)
    await expect(page.getByRole('heading', { name: 'Privacy', level: 1 })).toBeVisible()
    await expect(page.getByText('This policy summarizes how XENSI handles data')).toBeVisible()
  })
})
