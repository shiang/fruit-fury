import type { Entity, TrailPoint, Vec2, CanvasSize } from '../types'
import { CONFIG } from '../config'
import { drawEntity, drawFruitHalf } from './fruitArt'

export interface Particle { pos: Vec2; vel: Vec2; life: number; maxLife: number; color: string }
export interface Half { pos: Vec2; vel: Vec2; rotation: number; angularVel: number; color: string; type: string; side: -1 | 1; radius: number; life: number }

const FRUIT_COLORS: Record<string, string> = {
  watermelon: '#e0394e', apple: '#c6303a', orange: '#f59226', lime: '#7ac043',
  strawberry: '#e01e3c', pineapple: '#e8a820', peach: '#ff9e6d', kiwi: '#7ac043',
  bomb: '#1a1a1a', heart: '#ff4d6d', 'golden-heart': '#ffd700',
}

export function fruitColor(type: string): string {
  return FRUIT_COLORS[type] ?? '#ccc'
}

export interface RenderInput {
  ctx: CanvasRenderingContext2D
  video: HTMLVideoElement | null
  showFeed: boolean
  showHud: boolean
  canvas: CanvasSize
  entities: Entity[]
  halves: Half[]
  particles: Particle[]
  trails: TrailPoint[][]
  cursors: Vec2[]
  score: number
  lives: number
  maxLives: number
  highScore: number
  level: number
  levelName: string
  fruitsThisLevel: number
  fruitsToAdvance: number
  comboCount: number
  comboText: string | null
  levelUpText: string | null
  shake: number
  flash: number
  slowMoOverlay: number
  freezeOverlay: number
  shrinkOverlay: number
  furyOverlay: number
  rainbowOverlay: number
  now: number
  mode: 'classic' | 'zen' | 'time-attack'
  timeAttackElapsedMs?: number
  timeAttackDurationMs?: number
}

export function render(input: RenderInput): void {
  const { ctx } = input
  const { width, height } = input.canvas
  ctx.save()

  if (input.shake > 0) {
    const m = 16 * input.shake
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m)
  }

  const bg = ctx.createLinearGradient(0, 0, 0, height)
  if (input.mode === 'zen') {
    bg.addColorStop(0, '#b8d4e3')
    bg.addColorStop(1, '#7ab8d4')
  } else if (input.mode === 'time-attack') {
    bg.addColorStop(0, '#4a2010')
    bg.addColorStop(1, '#1a0800')
  } else {
    bg.addColorStop(0, '#5a4226')
    bg.addColorStop(1, '#2e2012')
  }
  ctx.fillStyle = bg
  ctx.fillRect(-40, -40, width + 80, height + 80)

  if (input.showFeed && input.video && input.video.readyState >= 2) {
    ctx.save()
    ctx.globalAlpha = 0.22
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(input.video, 0, 0, width, height)
    ctx.restore()
  }

  drawParticles(ctx, input.particles)
  drawHalves(ctx, input.halves)
  drawEntities(ctx, input.entities)
  for (const trail of input.trails) drawBlade(ctx, trail, input.now)
  drawCursors(ctx, input.cursors)

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

  if (input.levelUpText) {
    ctx.save()
    ctx.textAlign = 'center'
    ctx.font = 'bold 72px sans-serif'
    ctx.fillStyle = '#ffd35e'
    ctx.strokeStyle = '#6b4a12'
    ctx.lineWidth = 7
    ctx.strokeText(input.levelUpText, width / 2, height / 2 - 40)
    ctx.fillText(input.levelUpText, width / 2, height / 2 - 40)
    ctx.font = 'bold 36px sans-serif'
    ctx.fillStyle = '#fff8e7'
    ctx.fillText(input.levelName, width / 2, height / 2 + 20)
    ctx.restore()
  }

  if (input.showHud) drawHud(ctx, input)

  if (input.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${input.flash})`
    ctx.fillRect(-40, -40, width + 80, height + 80)
  }

  if (input.slowMoOverlay > 0) {
    ctx.fillStyle = `rgba(100,180,255,${input.slowMoOverlay * 0.12})`
    ctx.fillRect(-40, -40, width + 80, height + 80)
  }
  if (input.freezeOverlay > 0) {
    ctx.fillStyle = `rgba(200,230,255,${input.freezeOverlay * 0.15})`
    ctx.fillRect(-40, -40, width + 80, height + 80)
  }
  if (input.shrinkOverlay > 0) {
    ctx.fillStyle = `rgba(217,70,239,${input.shrinkOverlay * 0.12})`
    ctx.fillRect(-40, -40, width + 80, height + 80)
  }
  ctx.restore()
}

function drawEntities(ctx: CanvasRenderingContext2D, entities: Entity[]) {
  for (const e of entities) {
    ctx.save()
    ctx.translate(e.pos.x, e.pos.y)
    ctx.rotate(e.rotation)
    drawEntity(ctx, e.type, e.radius)
    ctx.restore()
  }
}

function drawHalves(ctx: CanvasRenderingContext2D, halves: Half[]) {
  for (const h of halves) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, h.life))
    ctx.translate(h.pos.x, h.pos.y)
    ctx.rotate(h.rotation)
    drawFruitHalf(ctx, h.type as Entity['type'], h.radius, h.side)
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
  const { width } = input.canvas
  ctx.save()
  ctx.font = 'bold 32px sans-serif'
  ctx.fillStyle = '#fff8e7'
  ctx.textAlign = 'left'
  ctx.fillText(`Score ${input.score}`, 24, 44)
  ctx.font = '20px sans-serif'
  ctx.fillText(`Best ${input.highScore}`, 24, 72)

  // Zen mode: show pulsing ZEN badge
  if (input.mode === 'zen') {
    const pulse = 1 + 0.05 * Math.sin(input.now * 0.004)
    ctx.textAlign = 'right'
    ctx.font = 'bold 26px sans-serif'
    ctx.fillStyle = '#87ceeb'
    ctx.save()
    ctx.translate(width - 24, 40)
    ctx.scale(pulse, pulse)
    ctx.fillText('ZEN', 0, 0)
    ctx.restore()
  } else if (input.mode === 'time-attack') {
    // Time attack: show countdown timer
    const elapsed = input.timeAttackElapsedMs ?? 0
    const duration = input.timeAttackDurationMs ?? 60000
    const remaining = Math.max(0, duration - elapsed)
    const seconds = Math.ceil(remaining / 1000)
    const urgency = remaining < 10000 ? '#ff4d6d' : remaining < 30000 ? '#ff781e' : '#ffd35e'
    ctx.textAlign = 'right'
    ctx.font = 'bold 28px sans-serif'
    ctx.fillStyle = urgency
    ctx.fillText(`${seconds}s`, width - 24, 40)
    ctx.font = '16px sans-serif'
    ctx.fillStyle = '#fff8e7'
    ctx.fillText('TIME ATTACK', width - 24, 62)
  } else {
    // Classic mode: show level
    ctx.textAlign = 'right'
    ctx.font = 'bold 26px sans-serif'
    ctx.fillStyle = '#ffd35e'
    ctx.fillText(`Lv ${input.level}`, width - 24, 40)
    ctx.font = '16px sans-serif'
    ctx.fillStyle = '#fff8e7'
    ctx.fillText(input.levelName, width - 24, 62)
  }

  // Combo multiplier display
  if (input.comboCount > 1) {
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillStyle = input.mode === 'zen' ? '#b8d4e3' : '#ffd35e'
    ctx.fillText(`x${input.comboCount}`, 24, 100)
  }

  // Level progress bar (only in classic mode)
  if (input.mode === 'classic') {
    const barW = 160
    const barX = width - 24 - barW
    const barY = 70
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.fillRect(barX, barY, barW, 6)
    const prog = input.fruitsToAdvance > 0 ? input.fruitsThisLevel / input.fruitsToAdvance : 0
    ctx.fillStyle = '#7ac043'
    ctx.fillRect(barX, barY, barW * Math.min(1, prog), 6)
  }

  // Hearts (only in classic mode)
  if (input.mode === 'classic') {
    ctx.font = '28px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ff4d6d'
    const hearts = '\u2764'.repeat(input.lives) + '\u00b7'.repeat(Math.max(0, input.maxLives - input.lives))
    ctx.fillText(hearts, width / 2, 44)
  }
  ctx.restore()
}

function drawCursors(ctx: CanvasRenderingContext2D, cursors: Vec2[]) {
  for (const c of cursors) {
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.beginPath(); ctx.arc(c.x, c.y, 7, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(c.x, c.y, 14, 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
  }
}
