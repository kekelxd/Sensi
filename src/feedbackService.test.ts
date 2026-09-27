import { describe, expect, it } from 'vitest'
import { APP_VERSION, RELEASE_CHANNEL } from './appRelease'
import { createAlphaFeedbackPayload } from './feedbackService'

describe('alpha feedback payload', () => {
  it('captures only feedback content and basic technical context', () => {
    const payload = createAlphaFeedbackPayload({
      type: 'bug',
      title: '  Modal quebrou  ',
      message: '  Ao abrir o feedback, o estado duplicou.  ',
      language: 'pt',
      reproducibility: 'always',
    }, {
      page: '/',
      user_agent: 'Vitest',
      viewport: '1440x900 @1x',
      user_id: null,
      created_at: '2026-09-26T12:00:00.000Z',
    })

    expect(payload).toEqual({
      user_id: null,
      type: 'bug',
      title: 'Modal quebrou',
      message: 'Ao abrir o feedback, o estado duplicou.',
      page: '/',
      app_version: APP_VERSION,
      release_channel: RELEASE_CHANNEL,
      user_agent: 'Vitest',
      viewport: '1440x900 @1x',
      language: 'pt',
      reproducibility: 'always',
      status: 'new',
      created_at: '2026-09-26T12:00:00.000Z',
    })
    expect(payload).not.toHaveProperty('presets')
    expect(payload).not.toHaveProperty('sessions')
    expect(payload).not.toHaveProperty('trainingResults')
    expect(payload).not.toHaveProperty('password')
    expect(payload).not.toHaveProperty('token')
  })

  it('keeps reproducibility nullable for suggestions and preserves authenticated user id', () => {
    const payload = createAlphaFeedbackPayload({
      type: 'suggestion',
      title: 'Atalho no hub',
      message: 'Seria útil acessar diagnóstico direto pelo footer.',
      language: 'pt',
      reproducibility: 'once',
    }, {
      page: '/diagnostics',
      user_agent: 'Vitest',
      viewport: '1920x1080 @1x',
      user_id: 'user-alpha-1',
      created_at: '2026-09-26T12:10:00.000Z',
    })

    expect(payload.reproducibility).toBeNull()
    expect(payload.user_id).toBe('user-alpha-1')
  })
})
