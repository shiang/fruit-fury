import type { Entity, TrailPoint, Vec2 } from '../types'
import { CONFIG } from '../config'

export interface Particle { pos: Vec2; vel: Vec2; life: number; maxLife: number; color: string }
export interface Half { pos: Vec2; vel: Vec2; rotation: number; angularVel: number; color: string; side: -1 | 1; radius: number; life: number }

const FRUIT_COLORS: Record<string, string> = {
  watermelon: '#e0394e',
  apple: '#c6303a',
  orange: '#f59226',
  lime: '#7ac043',
  bomb: '#1a1a1a',
}

export function fruitColor(type: string): string {
  return FRUIT_COLORS[type] ?? '#ccc'
}

export interface RenderInput {
  ctx: CanvasRenderingContext2D
  video: HTMLVideoElement | null
  showFeed: boolean
  entities: Entity[]
  halves: Half[]
  particles: Particle[]
  trails: TrailPoint[][]      // one trail per hand
  score: number
  lives: number
  highScore: number
  comboText: string | null
  shake: number               // 0..1 intensity
  flash: number               // 0..1 white flash alpha
  now: number
}

export function render(input: RenderInput): void {
  const { ctx } = input
  const { width, height } = CONFIG.canvas
  ctx.save()

  // screen shake
  if (input.shake > 0) {
    const m = 16 * input.shake
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m)
  }

  // background: dojo wood gradient
  const bg = ctx.createLinearGradient(0, 0, 0, height)
  bg.addColorStop(0, '#5a4226')
  bg.addColorStop(1, '#2e2012')
  ctx.fillStyle = bg
  ctx.fillRect(-40, -40, width + 80, height + 80)

  // dimmed mirrored webcam feed
  if (input.showFeed && input.video && input.video.readyState >= 2) {
    ctx.save()
    ctx.globalAlpha = 0.28
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(input.video, 0, 0, width, height)
    ctx.restore()
  }

  drawParticles(ctx, input.particles)
  drawHalves(ctx, input.halves)
  drawEntities(ctx, input.entities)
  for (const trail of input.trails) drawBlade(ctx, trail, input.now)

  // combo banner
  if (input.comboText) {
    ctx.save()
    ctx.font = 'bold 64px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffd35e'
    ctx.strokeStyle = '#6b4a12'
    ctx.lineWidth = 6
    ctx.strokeText(input.comboText, width / 2, height / 2)
    ctx.fillText(input.comboText, width / 2, height / 2)
    ctx.restore()
  }

  drawHud(ctx, input)

  // white flash overlay
  if (input.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${input.flash})`
    ctx.fillRect(-40, -40, width + 80, height + 80)
  }
  ctx.restore()
}

function drawEntities(ctx: CanvasRenderingContext2D, entities: Entity[]) {
  for (const e of entities) {
    ctx.save()
    ctx.translate(e.pos.x, e.pos.y)
    ctx.rotate(e.rotation)
    if (e.type === 'bomb') {
      ctx.fillStyle = '#141414'
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#ff5630'; ctx.lineWidth = 3; ctx.stroke()
      ctx.fillStyle = '#ff7a45'
      ctx.fillRect(-3, -e.radius - 10, 6, 12) // fuse
    } else {
      ctx.fillStyle = fruitColor(e.type)
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath(); ctx.arc(-e.radius * 0.3, -e.radius * 0.3, e.radius * 0.22, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }
}

function drawHalves(ctx: CanvasRenderingContext2D, halves: Half[]) {
  for (const h of halves) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, h.life))
    ctx.translate(h.pos.x, h.pos.y)
    ctx.rotate(h.rotation)
    ctx.fillStyle = h.color
    ctx.beginPath()
    ctx.arc(0, 0, h.radius, h.side === 1 ? -Math.PI / 2 : Math.PI / 2, h.side === 1 ? Math.PI / 2 : (3 * Math.PI) / 2)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillRect(-2, -h.radius, 4, h.radius * 2) // cut face highlight
    ctx.restore()
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
    ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, 4, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
}

function drawBlade(ctx: CanvasRenderingContext2D, trail: TrailPoint[], now: number) {
  if (trail.length < 2) return
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1], b = trail[i]
    const age = (now - b.t) / CONFIG.slash.trailLifetimeMs
    const alpha = Math.max(0, 1 - age)
    const width = 2 + 14 * alpha
    ctx.strokeStyle = `rgba(255,255,255,${0.25 * alpha})`
    ctx.lineWidth = width + 10
    ctx.beginPath(); ctx.moveTo(a.pos.x, a.pos.y); ctx.lineTo(b.pos.x, b.pos.y); ctx.stroke()
    ctx.strokeStyle = `rgba(255,255,255,${0.95 * alpha})`
    ctx.lineWidth = width
    ctx.beginPath(); ctx.moveTo(a.pos.x, a.pos.y); ctx.lineTo(b.pos.x, b.pos.y); ctx.stroke()
  }
  ctx.restore()
}

function drawHud(ctx: CanvasRenderingContext2D, input: RenderInput) {
  ctx.save()
  ctx.font = 'bold 32px sans-serif'
  ctx.fillStyle = '#fff8e7'
  ctx.textAlign = 'left'
  ctx.fillText(`Score ${input.score}`, 24, 44)
  ctx.font = '20px sans-serif'
  ctx.fillText(`Best ${input.highScore}`, 24, 72)
  ctx.textAlign = 'right'
  ctx.font = '32px sans-serif'
  ctx.fillText('❤'.repeat(input.lives) + '·'.repeat(Math.max(0, CONFIG.lives - input.lives)), CONFIG.canvas.width - 24, 44)
  ctx.restore()
}
