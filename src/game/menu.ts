import type { Vec2 } from '../types'

type Ctx = CanvasRenderingContext2D

export type MenuIcon = 'play' | 'calibrate' | 'camera' | 'cameraOff' | 'sound' | 'soundOff' | 'restart' | 'pause' | 'quit'

export interface MenuButton {
  id: string
  label: string
  icon: MenuIcon
  x: number       // center x
  y: number       // center y
  w: number
  h: number
  hover: number         // 0..1 smoothed
  holdProgress: number  // 0..1
  small: boolean        // pill-shaped toggle
  toggled: boolean
}

export function hitTestButtons(buttons: MenuButton[], pos: Vec2): number {
  for (let i = 0; i < buttons.length; i++) {
    const b = buttons[i]
    if (pos.x >= b.x - b.w / 2 && pos.x <= b.x + b.w / 2 &&
        pos.y >= b.y - b.h / 2 && pos.y <= b.y + b.h / 2) {
      return i
    }
  }
  return -1
}

export function pointInButton(btn: MenuButton, px: number, py: number): boolean {
  return px >= btn.x - btn.w / 2 && px <= btn.x + btn.w / 2 &&
         py >= btn.y - btn.h / 2 && py <= btn.y + btn.h / 2
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  r = Math.min(r, w / 2, h / 2)
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
}

export function drawButton(ctx: Ctx, btn: MenuButton, now: number): void {
  const hover = btn.hover
  const scale = 1 + hover * 0.05
  const w = btn.w * scale
  const h = btn.h * scale
  const x = btn.x - w / 2
  const y = btn.y - h / 2
  const radius = btn.small ? h / 2 : 14

  ctx.save()

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 10 + hover * 10
  ctx.shadowOffsetY = 3 + hover * 3

  // Background fill
  const grad = ctx.createLinearGradient(x, y, x, y + h)
  if (btn.small) {
    if (btn.toggled) {
      grad.addColorStop(0, '#5fa83a')
      grad.addColorStop(1, '#3d7a1f')
    } else {
      grad.addColorStop(0, '#4a3520')
      grad.addColorStop(1, '#382818')
    }
  } else if (hover > 0.15) {
    grad.addColorStop(0, '#6bc043')
    grad.addColorStop(1, '#4a8a2a')
  } else {
    grad.addColorStop(0, '#4a3520')
    grad.addColorStop(1, '#352515')
  }
  ctx.beginPath()
  roundRect(ctx, x, y, w, h, radius)
  ctx.fillStyle = grad
  ctx.fill()

  ctx.shadowColor = 'transparent'

  // Border
  const borderColor = hover > 0.15
    ? `rgba(122,192,67,${0.5 + hover * 0.5})`
    : 'rgba(255,255,255,0.12)'
  ctx.strokeStyle = borderColor
  ctx.lineWidth = 2 + hover * 2
  ctx.beginPath()
  roundRect(ctx, x, y, w, h, radius)
  ctx.stroke()

  // Hold progress fill
  if (btn.holdProgress > 0.01) {
    ctx.save()
    ctx.beginPath()
    roundRect(ctx, x, y, w, h, radius)
    ctx.clip()
    ctx.fillStyle = 'rgba(255,211,94,0.25)'
    ctx.fillRect(x, y, w * btn.holdProgress, h)
    ctx.restore()
  }

  // Glow ring when selected
  if (hover > 0.15) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.006)
    ctx.strokeStyle = `rgba(255,211,94,${0.15 * hover * pulse})`
    ctx.lineWidth = 5
    ctx.beginPath()
    roundRect(ctx, x - 3, y - 3, w + 6, h + 6, radius + 3)
    ctx.stroke()
  }

  // Icon + label
  const iconSize = h * 0.42
  const iconX = x + h * 0.45
  const iconY = btn.y
  drawIcon(ctx, btn.icon, iconX, iconY, iconSize)

  ctx.fillStyle = '#fff8e7'
  ctx.font = `bold ${Math.round(h * (btn.small ? 0.34 : 0.36))}px sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(btn.label, iconX + iconSize * 0.7, btn.y)

  ctx.restore()
}

export function drawMenuCursor(ctx: Ctx, pos: Vec2, pinching: boolean, holdProgress: number): void {
  ctx.save()
  const r = pinching ? 11 : 8

  // Outer glow
  if (holdProgress > 0.01) {
    ctx.fillStyle = `rgba(255,211,94,${0.15 * holdProgress})`
    ctx.beginPath(); ctx.arc(pos.x, pos.y, r + 20, 0, Math.PI * 2); ctx.fill()
  }

  // Core dot
  ctx.fillStyle = pinching ? 'rgba(255,211,94,0.95)' : 'rgba(255,255,255,0.85)'
  ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.fill()

  // Outline ring
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(pos.x, pos.y, r + 6, 0, Math.PI * 2); ctx.stroke()

  // Hold progress arc
  if (holdProgress > 0.01) {
    ctx.strokeStyle = '#ffd35e'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, r + 12, -Math.PI / 2, -Math.PI / 2 + holdProgress * Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

export function drawIcon(ctx: Ctx, icon: MenuIcon, x: number, y: number, size: number): void {
  ctx.save()
  ctx.fillStyle = '#fff8e7'
  ctx.strokeStyle = '#fff8e7'

  switch (icon) {
    case 'play': {
      ctx.beginPath()
      ctx.moveTo(x - size * 0.3, y - size * 0.5)
      ctx.lineTo(x + size * 0.4, y)
      ctx.lineTo(x - size * 0.3, y + size * 0.5)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'restart': {
      ctx.lineWidth = size * 0.14
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(x, y, size * 0.42, Math.PI * 0.3, Math.PI * 1.9)
      ctx.stroke()
      const ang = Math.PI * 0.3
      const ax = x + Math.cos(ang) * size * 0.42
      const ay = y + Math.sin(ang) * size * 0.42
      ctx.beginPath()
      ctx.moveTo(ax, ay - size * 0.22)
      ctx.lineTo(ax, ay + size * 0.08)
      ctx.lineTo(ax + size * 0.28, ay - size * 0.07)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'calibrate': {
      ctx.lineWidth = size * 0.1
      ctx.beginPath(); ctx.arc(x, y, size * 0.48, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.arc(x, y, size * 0.28, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.arc(x, y, size * 0.08, 0, Math.PI * 2); ctx.fill()
      // Crosshair lines
      ctx.lineWidth = size * 0.06
      ctx.beginPath()
      ctx.moveTo(x - size * 0.6, y); ctx.lineTo(x - size * 0.38, y)
      ctx.moveTo(x + size * 0.38, y); ctx.lineTo(x + size * 0.6, y)
      ctx.moveTo(x, y - size * 0.6); ctx.lineTo(x, y - size * 0.38)
      ctx.moveTo(x, y + size * 0.38); ctx.lineTo(x, y + size * 0.6)
      ctx.stroke()
      break
    }
    case 'camera':
    case 'cameraOff': {
      ctx.beginPath()
      roundRect(ctx, x - size * 0.45, y - size * 0.28, size * 0.9, size * 0.56, size * 0.1)
      ctx.fill()
      // Viewfinder bump
      ctx.beginPath()
      roundRect(ctx, x - size * 0.15, y - size * 0.38, size * 0.3, size * 0.12, size * 0.04)
      ctx.fill()
      ctx.fillStyle = icon === 'cameraOff' ? '#c6303a' : '#1c130a'
      ctx.beginPath(); ctx.arc(x, y, size * 0.18, 0, Math.PI * 2); ctx.fill()
      if (icon === 'cameraOff') {
        ctx.strokeStyle = '#c6303a'
        ctx.lineWidth = size * 0.08
        ctx.beginPath()
        ctx.moveTo(x - size * 0.38, y - size * 0.38)
        ctx.lineTo(x + size * 0.38, y + size * 0.38)
        ctx.stroke()
      }
      break
    }
    case 'sound':
    case 'soundOff': {
      ctx.beginPath()
      ctx.moveTo(x - size * 0.38, y - size * 0.14)
      ctx.lineTo(x - size * 0.12, y - size * 0.14)
      ctx.lineTo(x + size * 0.1, y - size * 0.34)
      ctx.lineTo(x + size * 0.1, y + size * 0.34)
      ctx.lineTo(x - size * 0.12, y + size * 0.14)
      ctx.lineTo(x - size * 0.38, y + size * 0.14)
      ctx.closePath()
      ctx.fill()
      if (icon === 'sound') {
        ctx.lineWidth = size * 0.06
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.arc(x + size * 0.15, y, size * 0.18, -Math.PI / 4, Math.PI / 4)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x + size * 0.15, y, size * 0.32, -Math.PI / 4, Math.PI / 4)
        ctx.stroke()
      } else {
        ctx.strokeStyle = '#c6303a'
        ctx.lineWidth = size * 0.08
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x + size * 0.2, y - size * 0.18)
        ctx.lineTo(x + size * 0.4, y + size * 0.18)
        ctx.moveTo(x + size * 0.4, y - size * 0.18)
        ctx.lineTo(x + size * 0.2, y + size * 0.18)
        ctx.stroke()
      }
      break
    }
    case 'pause': {
      const bw = size * 0.12
      const gap = size * 0.1
      ctx.fillRect(x - gap - bw, y - size * 0.35, bw, size * 0.7)
      ctx.fillRect(x + gap, y - size * 0.35, bw, size * 0.7)
      break
    }
    case 'quit': {
      ctx.lineWidth = size * 0.12
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x - size * 0.35, y - size * 0.35)
      ctx.lineTo(x + size * 0.35, y + size * 0.35)
      ctx.moveTo(x + size * 0.35, y - size * 0.35)
      ctx.lineTo(x - size * 0.35, y + size * 0.35)
      ctx.stroke()
    }
  }
  ctx.restore()
}
