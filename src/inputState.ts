export function pressInput<T>(current: ReadonlySet<T>, input: T) {
  const pressed = new Set(current)
  const isNew = !pressed.has(input)
  pressed.add(input)
  return { pressed, isNew }
}

export function releaseInput<T>(current: ReadonlySet<T>, input: T) {
  const pressed = new Set(current)
  pressed.delete(input)
  return pressed
}
