import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { Vec2 } from '../types'
import { CONFIG } from '../config'

export interface HandSample { hands: Vec2[]; handedness: string[]; pinching: boolean[]; t: number }

export type HandListener = (sample: HandSample) => void

/** Source of fingertip samples. Either webcam+MediaPipe or a mouse fallback. */
export interface HandSource {
  start(onSample: HandListener): Promise<void>
  stop(): void
  readonly mode: 'camera' | 'mouse'
}

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export class CameraSource implements HandSource {
  readonly mode = 'camera' as const
  private landmarker: HandLandmarker | null = null
  private stream: MediaStream | null = null
  private raf = 0
  private running = false
  private pinchState: boolean[] = [false, false]

  constructor(private video: HTMLVideoElement) {}

  async start(onSample: HandListener): Promise<void> {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE)
    this.landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: CONFIG.hand.maxHands,
    })
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: 'user' },
      audio: false,
    })
    this.video.srcObject = this.stream
    await this.video.play()
    this.running = true

    const tick = () => {
      if (!this.running || !this.landmarker) return
      const now = performance.now()
      const res = this.landmarker.detectForVideo(this.video, now)
      const tip = CONFIG.hand.fingertipLandmark
      const lms = res.landmarks ?? []
      const hd = (res as any).handednesses ?? (res as any).handedness ?? []
      const hands: Vec2[] = []
      const handedness: string[] = []
      const pinching: boolean[] = []
      for (let i = 0; i < lms.length; i++) {
        const lm = lms[i]
        const p = lm[tip]
        if (!p) continue
        hands.push({ x: p.x, y: p.y })
        handedness.push(hd[i]?.[0]?.categoryName ?? hd[i]?.[0]?.displayName ?? 'Right')
        // Pinch detection: distance between thumb tip (4) and index tip (8)
        // normalized by hand reference length (wrist 0 -> middle MCP 9)
        const thumb = lm[4], index = lm[8], wrist = lm[0], mcp = lm[9]
        const ref = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y)
        const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y)
        const ratio = ref > 1e-6 ? pinchDist / ref : 1
        // Hysteresis: start pinch at <0.35, release at >0.5
        const wasPinch = this.pinchState[i] ?? false
        const isPinch = wasPinch ? ratio < 0.5 : ratio < 0.35
        this.pinchState[i] = isPinch
        pinching.push(isPinch)
      }
      // Reset unused slots
      for (let i = lms.length; i < this.pinchState.length; i++) this.pinchState[i] = false
      onSample({ hands, handedness, pinching, t: now })
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.stream?.getTracks().forEach((t) => t.stop())
    this.landmarker?.close()
    this.landmarker = null
  }
}

/** Mouse fallback: reports the cursor as a single normalized hand. */
export class MouseSource implements HandSource {
  readonly mode = 'mouse' as const
  private listener: HandListener | null = null
  private mouseDown = false

  private handler = (e: MouseEvent) => {
    const r = this.el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    this.listener?.({ hands: [{ x: 1 - x, y }], handedness: ['Right'], pinching: [this.mouseDown], t: performance.now() })
  }

  constructor(private el: HTMLElement) {}

  async start(onSample: HandListener): Promise<void> {
    this.listener = onSample
    this.el.addEventListener('mousemove', this.handler)
    this.el.addEventListener('mousedown', this.onDown)
    window.addEventListener('mouseup', this.onUp)
  }

  private onDown = (e: MouseEvent): void => {
    if (e.button === 0) this.mouseDown = true
  }

  private onUp = (): void => {
    this.mouseDown = false
  }

  stop(): void {
    this.el.removeEventListener('mousemove', this.handler)
    this.el.removeEventListener('mousedown', this.onDown)
    window.removeEventListener('mouseup', this.onUp)
    this.listener = null
  }
}
