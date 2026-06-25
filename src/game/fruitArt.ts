import type { FruitType, EntityType } from '../types'

type Ctx = CanvasRenderingContext2D

function shade(ctx: Ctx, r: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.beginPath()
  ctx.ellipse(-r * 0.32, -r * 0.36, r * 0.3, r * 0.22, -0.5, 0, Math.PI * 2)
  ctx.fill()
}

export function drawFruit(ctx: Ctx, type: FruitType, r: number): void {
  switch (type) {
    case 'watermelon': drawWatermelon(ctx, r); break
    case 'apple': drawApple(ctx, r); break
    case 'orange': drawOrange(ctx, r); break
    case 'lime': drawLime(ctx, r); break
    case 'strawberry': drawStrawberry(ctx, r); break
    case 'pineapple': drawPineapple(ctx, r); break
    case 'peach': drawPeach(ctx, r); break
    case 'kiwi': drawKiwi(ctx, r); break
  }
}

export function drawBomb(ctx: Ctx, r: number): void {
  ctx.fillStyle = '#141414'
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#2a2a2a'
  ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.35, r * 0.3, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#ff5630'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = '#8B4513'
  ctx.fillRect(-3, -r - 12, 6, 14)
  ctx.fillStyle = '#ff7a45'
  ctx.beginPath(); ctx.arc(0, -r - 14, 5, 0, Math.PI * 2); ctx.fill()
}

function drawWatermelon(ctx: Ctx, r: number): void {
  const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 0, 0, 0, r)
  grad.addColorStop(0, '#3d7a1f')
  grad.addColorStop(1, '#1a4d0e')
  ctx.fillStyle = grad
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#0d3508'; ctx.lineWidth = 2.5
  for (let i = -2; i <= 2; i++) {
    const angle = (i / 5) * Math.PI
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.92, angle - 0.1, angle + 0.1)
    ctx.stroke()
  }
  shade(ctx, r)
}

function drawApple(ctx: Ctx, r: number): void {
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r)
  grad.addColorStop(0, '#e84a4a')
  grad.addColorStop(0.7, '#c6303a')
  grad.addColorStop(1, '#8b1a20')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 0.95, r, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#5a3a1a'
  ctx.fillRect(-2.5, -r - 8, 5, 10)
  ctx.fillStyle = '#5fa83a'
  ctx.beginPath()
  ctx.ellipse(8, -r - 4, 10, 5, -0.4, 0, Math.PI * 2)
  ctx.fill()
  shade(ctx, r)
}

function drawOrange(ctx: Ctx, r: number): void {
  const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.3, 0, 0, 0, r)
  grad.addColorStop(0, '#ffb347')
  grad.addColorStop(0.8, '#f59226')
  grad.addColorStop(1, '#c66e10')
  ctx.fillStyle = grad
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(180,100,10,0.3)'
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const px = Math.cos(a) * r * 0.6
    const py = Math.sin(a) * r * 0.6
    ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill()
  }
  ctx.fillStyle = '#3d7a1f'
  ctx.beginPath(); ctx.arc(0, -r - 2, 4, 0, Math.PI * 2); ctx.fill()
  shade(ctx, r)
}

function drawLime(ctx: Ctx, r: number): void {
  const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.3, 0, 0, 0, r)
  grad.addColorStop(0, '#a8d835')
  grad.addColorStop(0.8, '#7ac043')
  grad.addColorStop(1, '#4d8a1e')
  ctx.fillStyle = grad
  ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(50,100,10,0.25)'
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const px = Math.cos(a) * r * 0.5
    const py = Math.sin(a) * r * 0.5
    ctx.beginPath(); ctx.arc(px, py, 1.2, 0, Math.PI * 2); ctx.fill()
  }
  shade(ctx, r * 0.95)
}

function drawStrawberry(ctx: Ctx, r: number): void {
  const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 0, 0, 0, r)
  grad.addColorStop(0, '#ff4d6d')
  grad.addColorStop(0.8, '#e01e3c')
  grad.addColorStop(1, '#a01029')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(0, r * 0.95)
  ctx.bezierCurveTo(r * 0.9, r * 0.6, r * 0.85, -r * 0.5, 0, -r * 0.65)
  ctx.bezierCurveTo(-r * 0.85, -r * 0.5, -r * 0.9, r * 0.6, 0, r * 0.95)
  ctx.fill()
  ctx.fillStyle = '#ffe066'
  for (let i = -2; i <= 2; i++) {
    for (let j = -1; j <= 1; j++) {
      const px = i * r * 0.28
      const py = j * r * 0.32 + Math.abs(i) * 2
      if (px * px + py * py < r * r * 0.5) {
        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(Math.atan2(py, px))
        ctx.beginPath(); ctx.ellipse(0, 0, 2.5, 1.5, 0, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }
    }
  }
  ctx.fillStyle = '#3d7a1f'
  for (let i = -2; i <= 2; i++) {
    ctx.save()
    ctx.translate(0, -r * 0.6)
    ctx.rotate((i / 4) * 0.8)
    ctx.beginPath(); ctx.ellipse(0, -6, 5, 9, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
}

function drawPineapple(ctx: Ctx, r: number): void {
  const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r)
  grad.addColorStop(0, '#ffd23f')
  grad.addColorStop(0.7, '#e8a820')
  grad.addColorStop(1, '#b07d10')
  ctx.fillStyle = grad
  ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.92, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(120,70,5,0.4)'; ctx.lineWidth = 1.5
  const step = r * 0.28
  for (let dx = -r; dx <= r; dx += step) {
    ctx.beginPath(); ctx.moveTo(dx - r * 0.2, -r); ctx.lineTo(dx + r * 0.2, r); ctx.stroke()
  }
  for (let dy = -r; dy <= r; dy += step) {
    ctx.beginPath(); ctx.moveTo(-r, dy + r * 0.2); ctx.lineTo(r, dy - r * 0.2); ctx.stroke()
  }
  ctx.fillStyle = '#3d7a1f'
  for (let i = -2; i <= 2; i++) {
    ctx.save()
    ctx.translate(0, -r * 0.75)
    ctx.rotate((i / 4) * 0.5)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-4, -r * 0.5)
    ctx.lineTo(0, -r * 0.65)
    ctx.lineTo(4, -r * 0.5)
    ctx.closePath(); ctx.fill()
    ctx.restore()
  }
}

function drawPeach(ctx: Ctx, r: number): void {
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r)
  grad.addColorStop(0, '#ffc88a')
  grad.addColorStop(0.5, '#ff9e6d')
  grad.addColorStop(1, '#d4624a')
  ctx.fillStyle = grad
  ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(160,60,30,0.25)'; ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, -r * 0.9)
  ctx.quadraticCurveTo(r * 0.15, 0, 0, r * 0.85)
  ctx.stroke()
  ctx.fillStyle = '#5fa83a'
  ctx.beginPath()
  ctx.ellipse(6, -r - 2, 8, 4, -0.3, 0, Math.PI * 2)
  ctx.fill()
  shade(ctx, r * 0.95)
}

function drawKiwi(ctx: Ctx, r: number): void {
  const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 0, 0, 0, r)
  grad.addColorStop(0, '#9a7654')
  grad.addColorStop(0.8, '#7a5a3e')
  grad.addColorStop(1, '#5a3e28')
  ctx.fillStyle = grad
  ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(40,25,10,0.2)'; ctx.lineWidth = 1
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + (i % 2) * 0.1
    const px = Math.cos(a) * r * (0.3 + (i % 3) * 0.2)
    const py = Math.sin(a) * r * (0.3 + (i % 3) * 0.2)
    ctx.beginPath(); ctx.arc(px, py, 0.8, 0, Math.PI * 2); ctx.stroke()
  }
  shade(ctx, r * 0.95)
}

export function drawEntity(ctx: Ctx, type: EntityType, radius: number): void {
  if (type === 'bomb') drawBomb(ctx, radius)
  else drawFruit(ctx, type, radius)
}

export function drawFruitHalf(ctx: Ctx, type: EntityType, r: number, side: -1 | 1): void {
  const start = side === 1 ? -Math.PI / 2 : Math.PI / 2
  const end = side === 1 ? Math.PI / 2 : (3 * Math.PI) / 2

  // Outer rind
  if (type === 'watermelon') {
    ctx.fillStyle = '#3d7a1f'
  } else if (type === 'bomb') {
    ctx.fillStyle = '#141414'
  } else {
    ctx.fillStyle = 'rgba(255,240,220,0.9)'
  }
  ctx.beginPath(); ctx.arc(0, 0, r, start, end); ctx.closePath(); ctx.fill()

  // Inner flesh
  if (type === 'watermelon') {
    ctx.fillStyle = '#ff3060'
    ctx.beginPath(); ctx.arc(0, 0, r * 0.82, start, end); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#1a0a0a'
    for (let i = 0; i < 8; i++) {
      const a = start + (i / 7) * (end - start)
      const px = Math.cos(a) * r * 0.5
      const py = Math.sin(a) * r * 0.5
      ctx.beginPath(); ctx.ellipse(px, py, 2, 3, a, 0, Math.PI * 2); ctx.fill()
    }
  } else if (type === 'orange' || type === 'lime') {
    ctx.fillStyle = type === 'orange' ? '#ffb347' : '#a8d835'
    ctx.beginPath(); ctx.arc(0, 0, r * 0.85, start, end); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5
    for (let i = 0; i < 6; i++) {
      const a = start + (i / 5) * (end - start)
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); ctx.stroke()
    }
  } else if (type === 'kiwi') {
    ctx.fillStyle = '#7ac043'
    ctx.beginPath(); ctx.arc(0, 0, r * 0.85, start, end); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.arc(0, 0, r * 0.2, start, end); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#1a1a0a'
    for (let i = 0; i < 12; i++) {
      const a = start + (i / 11) * (end - start)
      const px = Math.cos(a) * r * 0.55
      const py = Math.sin(a) * r * 0.55
      ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill()
    }
  } else if (type !== 'bomb') {
    const fleshColors: Record<string, string> = {
      apple: '#f5e6e0', strawberry: '#ff90a0', pineapple: '#ffe066', peach: '#ffcc99',
    }
    ctx.fillStyle = fleshColors[type] ?? '#f0e0d0'
    ctx.beginPath(); ctx.arc(0, 0, r * 0.85, start, end); ctx.closePath(); ctx.fill()
  }

  // Cut face line
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fillRect(-2, -r, 4, r * 2)
}
