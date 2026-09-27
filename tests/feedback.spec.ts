import { expect, test, type Page } from '@playwright/test'

type FeedbackTestPayload = {
  user_id: string | null
  type: string
  title: string
  message: string
  page: string
  app_version: string
  release_channel: string
  user_agent: string
  viewport: string
  language: string
  reproducibility: string | null
  status: string
  created_at: string
}

type FeedbackTestWindow = Window & {
  __xensiFeedbackPayloads?: FeedbackTestPayload[]
  __XENSI_CURRENT_USER_ID__?: string | null
  __XENSI_FEEDBACK_SUBMIT__?: (payload: FeedbackTestPayload) => Promise<{ ok: true; id: string } | { ok: false; message: string }>
}

const installSuccessfulAdapter = async (page: Page, userId: string | null = null) => {
  await page.addInitScript((initialUserId) => {
    window.localStorage.clear()
    window.localStorage.setItem('sensi-locale', 'pt')
    const feedbackWindow = window as FeedbackTestWindow
    feedbackWindow.__xensiFeedbackPayloads = []
    feedbackWindow.__XENSI_CURRENT_USER_ID__ = initialUserId
    feedbackWindow.__XENSI_FEEDBACK_SUBMIT__ = async (payload) => {
      feedbackWindow.__xensiFeedbackPayloads?.push(payload)
      await new Promise((resolve) => window.setTimeout(resolve, 180))
      return { ok: true, id: 'fb-playwright' }
    }
  }, userId)
}

const installFailingAdapter = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('sensi-locale', 'pt')
    const feedbackWindow = window as FeedbackTestWindow
    feedbackWindow.__XENSI_FEEDBACK_SUBMIT__ = async () => ({ ok: false, message: 'Falha simulada ao registrar feedback.' })
  })
}

async function openFeedback(page: Page) {
  await page.goto('./')
  const footer = page.locator('.xensi-home-v3-footer')
  await expect(footer.getByText('XENSI Alpha · 0.1')).toBeVisible()
  await footer.getByRole('button', { name: 'Enviar feedback' }).click()
  return page.getByRole('dialog', { name: 'AJUDE A MELHORAR O XENSI' })
}

test.describe('Alpha feedback', () => {
  test.skip(({ isMobile }) => isMobile, 'XENSI Alpha feedback MVP is desktop-only')

  test('allows a visitor to submit bug feedback and captures route and release context', async ({ page }) => {
    await installSuccessfulAdapter(page)
    const dialog = await openFeedback(page)

    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('Título')).toBeFocused()
    await expect(dialog.getByRole('button', { name: 'Bug' })).toHaveAttribute('aria-pressed', 'true')
    await expect(dialog.getByText('Conseguiu reproduzir?')).toBeVisible()

    await dialog.getByRole('button', { name: 'Sugestão' }).click()
    await expect(dialog.getByText('Conseguiu reproduzir?')).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Bug' }).click()
    await dialog.getByRole('button', { name: 'Às vezes' }).click()
    await dialog.getByLabel('Título').fill('Refresh mostra valor instável')
    await dialog.getByLabel('Descrição').fill('O número oscilou muito quando reabri a tela de diagnóstico.')

    await dialog.getByRole('button', { name: 'Enviar feedback' }).click()
    await expect(dialog.getByRole('button', { name: 'Enviando...' })).toBeDisabled()
    await expect(dialog.getByText('Obrigado. Seu feedback foi registrado.')).toBeVisible()

    const payloads = await page.evaluate(() => (window as FeedbackTestWindow).__xensiFeedbackPayloads ?? [])
    expect(payloads).toHaveLength(1)
    expect(payloads[0]).toMatchObject({
      user_id: null,
      type: 'bug',
      title: 'Refresh mostra valor instável',
      message: 'O número oscilou muito quando reabri a tela de diagnóstico.',
      app_version: '0.1',
      release_channel: 'alpha',
      language: 'pt',
      reproducibility: 'sometimes',
      status: 'new',
    })
    expect(payloads[0].page).toMatch(/\/Sensi\/?$/)
    expect(payloads[0].viewport).toContain('x')
    expect(payloads[0].user_agent.length).toBeGreaterThan(0)
    expect(payloads[0]).not.toHaveProperty('presets')
    expect(payloads[0]).not.toHaveProperty('sessions')
    expect(payloads[0]).not.toHaveProperty('trainingResults')
    expect(payloads[0]).not.toHaveProperty('password')
    expect(payloads[0]).not.toHaveProperty('token')
  })

  test('shows an inline error when persistence fails', async ({ page }) => {
    await installFailingAdapter(page)
    const dialog = await openFeedback(page)

    await dialog.getByLabel('Título').fill('Erro de Alpha')
    await dialog.getByLabel('Descrição').fill('Simulando falha de persistência.')
    await dialog.getByRole('button', { name: 'Enviar feedback' }).click()

    await expect(dialog.getByRole('alert')).toHaveText('Falha simulada ao registrar feedback.')
    await expect(dialog.getByRole('button', { name: 'Enviar feedback' })).toBeEnabled()
  })

  test('includes the authenticated user id when one is available', async ({ page }) => {
    await installSuccessfulAdapter(page, 'user-alpha-1')
    const dialog = await openFeedback(page)

    await dialog.getByRole('button', { name: 'Sugestão' }).click()
    await dialog.getByLabel('Título').fill('Hub de feedback')
    await dialog.getByLabel('Descrição').fill('Adicionar um atalho permanente para feedback seria útil.')
    await dialog.getByRole('button', { name: 'Enviar feedback' }).click()
    await expect(dialog.getByText('Obrigado. Seu feedback foi registrado.')).toBeVisible()

    const payloads = await page.evaluate(() => (window as FeedbackTestWindow).__xensiFeedbackPayloads ?? [])
    expect(payloads[0]).toMatchObject({
      user_id: 'user-alpha-1',
      type: 'suggestion',
      reproducibility: null,
    })
  })

  test('fits the desktop MVP breakpoints without horizontal overflow', async ({ page }) => {
    await installSuccessfulAdapter(page)
    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
    ]) {
      await page.setViewportSize(viewport)
      const dialog = await openFeedback(page)
      await expect(dialog).toBeVisible()
      const layout = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }))
      expect(layout.content).toBeLessThanOrEqual(layout.viewport)
      const box = await dialog.boundingBox()
      expect(box?.width ?? 0).toBeLessThanOrEqual(viewport.width - 48)
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
    }
  })
})
