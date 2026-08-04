import { describe, expect, it } from 'vitest'
import { pressInput, releaseInput } from './inputState'

describe('input state', () => {
  it('mantém várias teclas pressionadas simultaneamente', () => {
    const first = pressInput(new Set<string>(), 'KeyW')
    const second = pressInput(first.pressed, 'ShiftLeft')
    const third = pressInput(second.pressed, 'Space')

    expect([...third.pressed]).toEqual(['KeyW', 'ShiftLeft', 'Space'])
    expect(third.isNew).toBe(true)
  })

  it('ignora repetição e solta apenas a tecla informada', () => {
    const initial = new Set(['KeyW', 'ShiftLeft'])
    const repeated = pressInput(initial, 'KeyW')
    const released = releaseInput(repeated.pressed, 'KeyW')

    expect(repeated.isNew).toBe(false)
    expect([...released]).toEqual(['ShiftLeft'])
  })
})
