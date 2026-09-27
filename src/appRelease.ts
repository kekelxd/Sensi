export const APP_VERSION = '0.1'
export const RELEASE_CHANNEL = 'alpha'

const releaseChannelLabels: Record<typeof RELEASE_CHANNEL, string> = {
  alpha: 'Alpha',
}

export const APP_RELEASE_LABEL = `XENSI ${releaseChannelLabels[RELEASE_CHANNEL]} · ${APP_VERSION}`
