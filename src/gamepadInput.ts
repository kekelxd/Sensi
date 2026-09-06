import { rawAxis } from './gamepadMetrics'

export type GamepadSnapshot = {
  index: number
  id: string
  connected: boolean
  timestamp: number
  axes: number[]
  buttons: Array<{ pressed: boolean; value: number }>
}

export type GamepadSubscriber = (gamepads: GamepadSnapshot[], frameTime: number) => void

const subscribers = new Set<GamepadSubscriber>()
let frame = 0

export function snapshotGamepad(gamepad: Gamepad): GamepadSnapshot {
  return {
    index: gamepad.index,
    id: gamepad.id,
    connected: gamepad.connected,
    timestamp: gamepad.timestamp,
    axes: Array.from(gamepad.axes, rawAxis),
    buttons: Array.from(gamepad.buttons, (button) => ({ pressed: button.pressed, value: button.value })),
  }
}

export function readGamepads(source: Pick<Navigator, 'getGamepads'> = navigator) {
  return Array.from(source.getGamepads?.() ?? [])
    .filter((gamepad): gamepad is Gamepad => Boolean(gamepad?.connected))
    .map(snapshotGamepad)
}

export function selectActiveGamepad(gamepads: GamepadSnapshot[], requestedIndex: number) {
  return gamepads.find((gamepad) => gamepad.index === requestedIndex) ?? gamepads[0] ?? null
}

function pollGamepads(frameTime: number) {
  if (!subscribers.size) {
    frame = 0
    return
  }
  const gamepads = readGamepads()
  subscribers.forEach((subscriber) => subscriber(gamepads, frameTime))
  frame = window.requestAnimationFrame(pollGamepads)
}

export function subscribeGamepads(subscriber: GamepadSubscriber) {
  subscribers.add(subscriber)
  if (!frame) frame = window.requestAnimationFrame(pollGamepads)
  return () => {
    subscribers.delete(subscriber)
    if (!subscribers.size && frame) {
      window.cancelAnimationFrame(frame)
      frame = 0
    }
  }
}
