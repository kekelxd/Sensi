import { useEffect, useRef } from 'react'

type LiveMetrics = {
  accuracy: number
  meanError: number
  smoothness: number
}

type Props = {
  active: boolean
  paused: boolean
  multiplier: number
  onMetrics: (metrics: LiveMetrics) => void
  onRoundComplete: (distances: number[], speeds: number[], targetRadius: number) => void
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function TrackingArena({ active, paused, multiplier, onMetrics, onRoundComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)
  const pausedRef = useRef(paused)
  const multiplierRef = useRef(multiplier)
  const onMetricsRef = useRef(onMetrics)
  const onCompleteRef = useRef(onRoundComplete)
  const stateRef = useRef({
    aimX: 0,
    aimY: 0,
    targetX: 0,
    targetY: 0,
    startTime: 0,
    distances: [] as number[],
    speeds: [] as number[],
    lastAimX: 0,
    lastAimY: 0,
    lastSample: 0,
    complete: false,
  })

  useEffect(() => { activeRef.current = active }, [active])
  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => { multiplierRef.current = multiplier }, [multiplier])
  useEffect(() => { onMetricsRef.current = onMetrics }, [onMetrics])
  useEffect(() => { onCompleteRef.current = onRoundComplete }, [onRoundComplete])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMove = (event: MouseEvent) => {
      if (!activeRef.current || pausedRef.current || document.pointerLockElement !== canvas) return
      const state = stateRef.current
      state.aimX = clamp(state.aimX + event.movementX * multiplierRef.current, 0, canvas.clientWidth)
      state.aimY = clamp(state.aimY + event.movementY * multiplierRef.current, 0, canvas.clientHeight)
    }

    document.addEventListener('mousemove', handleMove)
    return () => document.removeEventListener('mousemove', handleMove)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let animationFrame = 0

    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      const ctx = canvas.getContext('2d')
      ctx?.setTransform(ratio, 0, 0, ratio, 0, 0)
      const state = stateRef.current
      if (!state.aimX) {
        state.aimX = rect.width / 2
        state.aimY = rect.height / 2
        state.lastAimX = state.aimX
        state.lastAimY = state.aimY
      }
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const render = (time: number) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const state = stateRef.current
      const radius = Math.max(22, Math.min(width, height) * 0.045)

      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#0b0e14'
      ctx.fillRect(0, 0, width, height)

      ctx.strokeStyle = 'rgba(255,255,255,.035)'
      ctx.lineWidth = 1
      for (let x = 0; x < width; x += 42) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke()
      }
      for (let y = 0; y < height; y += 42) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
      }

      if (activeRef.current && !pausedRef.current) {
        if (!state.startTime) state.startTime = time
        const elapsed = (time - state.startTime) / 1000
        const safeW = Math.max(0, width - radius * 3)
        const safeH = Math.max(0, height - radius * 3)
        state.targetX = radius * 1.5 + safeW * (0.5 + Math.sin(elapsed * 1.16) * 0.36 + Math.sin(elapsed * 0.37) * 0.11)
        state.targetY = radius * 1.5 + safeH * (0.5 + Math.cos(elapsed * 0.91) * 0.33 + Math.sin(elapsed * 1.73) * 0.12)

        if (time - state.lastSample > 40) {
          const distance = Math.hypot(state.aimX - state.targetX, state.aimY - state.targetY)
          const speed = Math.hypot(state.aimX - state.lastAimX, state.aimY - state.lastAimY)
          state.distances.push(distance)
          state.speeds.push(speed)
          state.lastAimX = state.aimX
          state.lastAimY = state.aimY
          state.lastSample = time
          const recentDistances = state.distances.slice(-30)
          const recentSpeeds = state.speeds.slice(-30)
          const accuracy = recentDistances.filter((value) => value <= radius).length / recentDistances.length * 100
          const meanError = recentDistances.reduce((sum, value) => sum + value, 0) / recentDistances.length
          const changes = recentSpeeds.slice(1).map((value, index) => Math.abs(value - recentSpeeds[index]))
          const smoothness = Math.max(0, 100 - (changes.reduce((sum, value) => sum + value, 0) / Math.max(1, changes.length)) * 4)
          onMetricsRef.current({ accuracy, meanError, smoothness })
        }
      }

      if (state.targetX) {
        const glow = ctx.createRadialGradient(state.targetX, state.targetY, 0, state.targetX, state.targetY, radius * 2)
        glow.addColorStop(0, 'rgba(255,111,78,.28)')
        glow.addColorStop(1, 'rgba(255,111,78,0)')
        ctx.fillStyle = glow
        ctx.beginPath(); ctx.arc(state.targetX, state.targetY, radius * 2, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ff7251'
        ctx.beginPath(); ctx.arc(state.targetX, state.targetY, radius, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,.72)'
        ctx.beginPath(); ctx.arc(state.targetX, state.targetY, radius * .27, 0, Math.PI * 2); ctx.fill()
      }

      const onTarget = Math.hypot(state.aimX - state.targetX, state.aimY - state.targetY) <= radius
      ctx.strokeStyle = onTarget ? '#8dfbd3' : '#f4f2eb'
      ctx.lineWidth = 1.5
      const gap = 7
      const length = 14
      ctx.beginPath()
      ctx.moveTo(state.aimX - gap - length, state.aimY); ctx.lineTo(state.aimX - gap, state.aimY)
      ctx.moveTo(state.aimX + gap, state.aimY); ctx.lineTo(state.aimX + gap + length, state.aimY)
      ctx.moveTo(state.aimX, state.aimY - gap - length); ctx.lineTo(state.aimX, state.aimY - gap)
      ctx.moveTo(state.aimX, state.aimY + gap); ctx.lineTo(state.aimX, state.aimY + gap + length)
      ctx.stroke()
      ctx.beginPath(); ctx.arc(state.aimX, state.aimY, 2, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill()

      animationFrame = requestAnimationFrame(render)
    }

    animationFrame = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (active) {
      const canvas = canvasRef.current
      const state = stateRef.current
      const width = canvas?.clientWidth ?? 0
      const height = canvas?.clientHeight ?? 0
      state.aimX = width / 2
      state.aimY = height / 2
      state.targetX = width / 2
      state.targetY = height / 2
      state.startTime = 0
      state.distances = []
      state.speeds = []
      state.lastSample = 0
      state.complete = false
      canvas?.requestPointerLock()
    }
  }, [active, multiplier])

  const finishRound = () => {
    const state = stateRef.current
    if (!state.complete) {
      state.complete = true
      const radius = Math.max(22, Math.min(canvasRef.current?.clientWidth ?? 0, canvasRef.current?.clientHeight ?? 0) * 0.045)
      onCompleteRef.current(state.distances, state.speeds, radius)
    }
  }

  useEffect(() => {
    if (!active || paused) return
    const timer = window.setTimeout(finishRound, 12000)
    return () => window.clearTimeout(timer)
  }, [active, paused, multiplier])

  return (
    <div className="arena-wrap">
      <canvas ref={canvasRef} className="arena" onClick={() => active && canvasRef.current?.requestPointerLock()} />
      {!active && <div className="arena-prompt"><span>Mova com precisão, não com pressa.</span>Clique em iniciar para capturar o mouse.</div>}
      {active && document.pointerLockElement !== canvasRef.current && (
        <button className="lock-prompt" onClick={() => canvasRef.current?.requestPointerLock()}>Clique para retomar o tracking</button>
      )}
    </div>
  )
}
