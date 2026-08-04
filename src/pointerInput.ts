export const POINTER_LOCK_SETTLE_MS = 100
export const AIM_EDGE_PADDING = 18

type PointerMovement = {
  movementX: number
  movementY: number
  gain: number
  width: number
  height: number
  elapsedSinceLock: number
}

export function sanitizePointerMovement({ movementX, movementY, gain, width, height, elapsedSinceLock }: PointerMovement) {
  if (elapsedSinceLock < POINTER_LOCK_SETTLE_MS) return null
  if (![movementX, movementY, gain, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null

  const deltaX = movementX * gain
  const deltaY = movementY * gain
  const distance = Math.hypot(deltaX, deltaY)
  if (!distance) return { x: 0, y: 0 }

  // Pointer-lock transitions can emit a synthetic desktop-sized jump.
  const maximumDistance = Math.max(36, Math.min(width, height) * 0.14)
  const scale = Math.min(1, maximumDistance / distance)
  return { x: deltaX * scale, y: deltaY * scale }
}

export function clampAimCoordinate(value: number, size: number, padding = AIM_EDGE_PADDING) {
  if (!Number.isFinite(value) || !Number.isFinite(size) || size <= 0) return 0
  if (size <= padding * 2) return size / 2
  return Math.max(padding, Math.min(size - padding, value))
}

const pendingLocks = new WeakSet<HTMLCanvasElement>()

export async function requestStablePointerLock(canvas: HTMLCanvasElement | null) {
  if (!canvas || pendingLocks.has(canvas) || document.pointerLockElement === canvas) return
  pendingLocks.add(canvas)
  canvas.focus({ preventScroll: true })

  try {
    const fullscreenTarget = canvas.parentElement
    if (fullscreenTarget && !document.fullscreenElement) {
      try {
        await fullscreenTarget.requestFullscreen?.({ navigationUI: 'hide' } as FullscreenOptions)
      } catch {
        // Pointer lock can still work when fullscreen is unavailable or denied.
      }
    }

    if (document.pointerLockElement === canvas) return
    try {
      await canvas.requestPointerLock({ unadjustedMovement: true })
    } catch {
      try {
        await canvas.requestPointerLock()
      } catch {
        // The visible lock prompt lets the user retry with a fresh gesture.
      }
    }
  } finally {
    pendingLocks.delete(canvas)
  }
}
