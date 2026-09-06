import { expect, test } from '@playwright/test'

async function openProfile(page: import('@playwright/test').Page) {
  await page.goto('./')
  await page.locator('.xensi-user-trigger').click()
  await page.getByRole('button', { name: 'Meu perfil', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Perfil', exact: true })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('xensi-player-profile')
    localStorage.setItem('sensi-locale', 'pt')
  })
})

test('empty profile, avatar picker and navbar share normalized assets', async ({ page }, testInfo) => {
  await openProfile(page)
  await expect(page.getByText('Nenhuma sensibilidade salva.')).toBeVisible()

  await page.getByRole('button', { name: 'Editar perfil' }).click()
  const avatarButtons = page.locator('.profile-avatar-picker > button')
  await expect(avatarButtons).toHaveCount(21)
  await page.screenshot({ path: testInfo.outputPath('avatar-picker.png'), fullPage: true })
  await page.getByRole('button', { name: 'Cachorro feliz' }).click()
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()

  const profileAvatar = page.locator('.profile-v1-person .xensi-avatar img')
  const navbarAvatar = page.locator('.xensi-user-trigger .xensi-avatar img')
  await expect(profileAvatar).toHaveAttribute('src', /dog-happy\.png$/)
  await expect(navbarAvatar).toHaveAttribute('src', /dog-happy\.png$/)
  await expect(profileAvatar).toHaveCSS('object-fit', 'contain')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('profile-avatar.png'), fullPage: true })
})

test('creates a preset and prefills converter and calibrator', async ({ page }, testInfo) => {
  await openProfile(page)
  await page.getByRole('button', { name: 'Adicionar sensibilidade' }).click()
  await page.getByLabel('Jogo').selectOption('cs2')
  await page.getByRole('textbox', { name: 'Sensibilidade', exact: true }).fill('0.65')
  await page.getByRole('textbox', { name: 'DPI', exact: true }).fill('800')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()

  await expect(page.getByText('79.93 cm/360')).toBeVisible()
  const card = page.locator('.profile-preset-card').first()
  await expect(card.getByText('Principal')).toBeVisible()
  await expect(card.locator('.xensi-game-badge')).toHaveText('CS')
  await page.screenshot({ path: testInfo.outputPath('profile-preset.png'), fullPage: true })

  await card.getByRole('button', { name: /Converter/ }).click()
  await expect(page.getByRole('heading', { name: /Conversor/i })).toBeVisible()
  await expect(page.getByLabel('Sensibilidade atual')).toHaveValue('0.65')
  await expect(page.getByLabel('DPI de origem')).toHaveValue('800')

  await page.locator('.xensi-user-trigger').click()
  await page.getByRole('button', { name: 'Meu perfil', exact: true }).click()
  await page.locator('.profile-preset-card').first().getByRole('button', { name: /Calibrar/ }).click()
  await expect(page.getByRole('heading', { name: /Configure o calibrador/i })).toBeVisible()
  await expect(page.getByLabel(/Sensibilidade atual/)).toHaveValue('0.65')
  await expect(page.getByRole('textbox', { name: 'DPI do mouse' })).toHaveValue('800')
})

test('avatar cells remain square and visually contained', async ({ page }) => {
  await openProfile(page)
  await page.getByRole('button', { name: 'Editar perfil' }).click()
  const cells = page.locator('.profile-avatar-picker > button')
  const count = await cells.count()
  for (let index = 0; index < count; index += 1) {
    const cell = cells.nth(index)
    const box = await cell.boundingBox()
    expect(box).not.toBeNull()
    expect(Math.abs((box?.width ?? 0) - (box?.height ?? 0))).toBeLessThan(1)
    await expect(cell.locator('img')).toHaveCSS('object-fit', 'contain')
  }
})
