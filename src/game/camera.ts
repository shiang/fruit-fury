import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { Vec2 } from '../types'
import { CONFIG } from '../config'

export interface HandSample { hands: Vec2[]; t: number } // normalized 0..1 fingertips

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
      const hands: Vec2[] = (res.landmarks ?? [])
        .map((lm) => lm[tip])
        .filter(Boolean)
        .map((p) => ({ x: p.x, y: p.y }))
      onSample({ hands, t: now })
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
  private handler = (e: MouseEvent) => {
    const r = this.el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    // Mirror so it matches the camera pipeline's mirror in mapToGame.
    this.listener?.({ hands: [{ x: 1 - x, y }], t: performance.now() })
  }

  constructor(private el: HTMLElement) {}

  async start(onSample: HandListener): Promise<void> {
    this.listener = onSample
    this.el.addEventListener('mousemove', this.handler)
  }

  stop(): void {
    this.el.removeEventListener('mousemove', this.handler)
    this.listener = null
  }
}

/** Try the camera; fall back to mouse on any failure. */
export async function createHandSource(
  video: HTMLVideoElement,
  fallbackEl: HTMLElement,
): Promise<HandSource> {
  const cam = new CameraSource(video)
  try {
    // Probe permissions/availability early by constructing+starting later;
    // here we just return camera and let game.ts handle start() errors.
    void cam
    await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((s) => s.getTracks().forEach((t) => t.stop()))
    return cam
  } catch {
    return new MouseSource(fallbackEl)
  }
}
