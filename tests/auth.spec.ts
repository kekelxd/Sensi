import { expect, test } from '@playwright/test'

test.describe('XENSI auth routes', () => {
  test('renders login, handles unavailable auth, and keeps the desktop viewport contained', async ({ page }, testInfo) => {
    await page.goto('./login')

    await expect(page).toHaveURL(/\/Sensi\/login$/)
    await expect(page.getByRole('heading', { name: 'TREINE. CALIBRE. EVOLUA.' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible()
    await expect(page.getByText('Treine sua mira, calibre sua sensibilidade e acompanhe sua evolução.')).toBeVisible()
    await expect(page.getByText('TREINE', { exact: true })).toBeVisible()
    await expect(page.getByText('CALIBRE', { exact: true })).toBeVisible()
    await expect(page.getByText('ANALISE', { exact: true })).toBeVisible()

    const overflow = await page.evaluate(() => ({
      viewportHeight: document.documentElement.clientHeight,
      contentHeight: document.documentElement.scrollHeight,
      viewportWidth: document.documentElement.clientWidth,
      contentWidth: document.documentElement.scrollWidth,
    }))
    expect(overflow.contentHeight).toBeLessThanOrEqual(overflow.viewportHeight)
    expect(overflow.contentWidth).toBeLessThanOrEqual(overflow.viewportWidth)

    await page.getByLabel('E-mail').fill('player@xensi.test')
    const password = page.locator('#auth-password')
    await password.fill('controle123')
    await expect(password).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Mostrar senha' }).click()
    await expect(password).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Ocultar senha' }).click()
    await expect(password).toHaveAttribute('type', 'password')

    await page.locator('.xensi-auth-submit').click()
    await expect(page.getByRole('alert')).toContainText('Autenticação ainda não configurada')

    await testInfo.attach(`login-${testInfo.project.name}`, {
      body: await page.screenshot({ fullPage: false, animations: 'disabled' }),
      contentType: 'image/png',
    })
  })

  test('links to register and forgot password routes with the same auth surface', async ({ page }) => {
    await page.goto('./login')

    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page).toHaveURL(/\/Sensi\/register$/)
    await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible()
    await expect(page.locator('#auth-password')).toHaveAttribute('autocomplete', 'new-password')

    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/Sensi\/login$/)

    await page.getByRole('button', { name: 'Esqueceu a senha?' }).click()
    await expect(page).toHaveURL(/\/Sensi\/forgot-password$/)
    await expect(page.getByRole('heading', { name: 'Recuperar senha' })).toBeVisible()
    await expect(page.getByLabel('E-mail')).toHaveAttribute('autocomplete', 'email')
    await expect(page.locator('#auth-password')).toHaveCount(0)
  })
})
