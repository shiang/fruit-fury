import type { Vec2 } from '../types'

type Ctx = CanvasRenderingContext2D

export interface TutorialCard {
  title: string
  description: string
  icon: string
}

export const TUTORIAL_CARDS: TutorialCard[] = [
  {
    title: 'Swipe to Slice',
    description: 'Move your hand in the air to slice the fruit. Your hand position is tracked by the webcam!',
    icon: '✋',
  },
  {
    title: 'Avoid Bombs',
    description: 'In Classic mode, do not slice the black bombs. They cost you a life.',
    icon: '💣',
  },
  {
    title: 'Slow-Mo Fruit',
    description: 'Slice the blue glowing fruit to slow down time. Chain combos for bonus points!',
    icon: '🔵',
  },
  {
    title: 'Pinch to Select',
    description: 'Hover your hand over a menu button, then pinch and hold to activate it.',
    icon: '👌',
  },
  {
    title: 'Calibrate',
    description: 'If your reach feels off, use Calibrate to map your comfortable hand area.',
    icon: '🎯',
  },
]

export interface TutorialState {
  currentCard: number
  isShowing: boolean
  startTime: number
  cardTransition: number
}

export function createTutorialState(): TutorialState {
  return {
    currentCard: 0,
    isShowing: false,
    startTime: 0,
    cardTransition: 0,
  }
}

const STORAGE_KEY = 'fruitFury.hasSeenTutorial'

export function shouldShowTutorial(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== 'true'
}

export function markTutorialSeen(): void {
  localStorage.setItem(STORAGE_KEY, 'true')
}

/** Geometry of the primary tutorial button, so the game can hit-test it. */
export interface TutorialButtonRect {
  x: number
  y: number
  w: number
  h: number
}

interface TutorialCardRect {
  x: number
  y: number
  w: number
  h: number
}

function getTutorialCardRect(width: number, height: number): TutorialCardRect {
  const cardW = Math.min(560, width * 0.86)
  const cardH = Math.min(390, Math.max(320, height * 0.56), height - 80)
  return {
    x: (width - cardW) / 2,
    y: (height - cardH) / 2,
    w: cardW,
    h: cardH,
  }
}

export function getTutorialButtonRect(width: number, height: number): TutorialButtonRect {
  const card = getTutorialCardRect(width, height)
  return { x: width / 2, y: card.y + card.h - 64, w: 150, h: 46 }
}

export function drawTutorialOverlay(
  ctx: Ctx,
  state: TutorialState,
  now: number,
  width: number,
  height: number,
): void {
  if (!state.isShowing) return

  const card = TUTORIAL_CARDS[state.currentCard]
  if (!card) return

  const cardRect = getTutorialCardRect(width, height)
  const cardW = cardRect.w
  const cardH = cardRect.h
  const cardX = cardRect.x
  const cardY = cardRect.y

  // Fade in
  const fadeAlpha = Math.min(1, (now - state.startTime) / 300)

  ctx.save()

  // Dark backdrop
  ctx.fillStyle = `rgba(0, 0, 0, ${0.72 * fadeAlpha})`
  ctx.fillRect(0, 0, width, height)

  // Card shadow + bg
  ctx.globalAlpha = fadeAlpha
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
  ctx.shadowBlur = 30
  ctx.shadowOffsetY = 10

  const grad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH)
  grad.addColorStop(0, '#3c2814')
  grad.addColorStop(1, '#1e140a')
  ctx.fillStyle = grad

  roundRectPath(ctx, cardX, cardY, cardW, cardH, 20)
  ctx.fill()

  ctx.shadowColor = 'transparent'

  // Border
  ctx.strokeStyle = 'rgba(255, 211, 94, 0.35)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Icon
  ctx.font = `${Math.round(cardH * 0.22)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(card.icon, width / 2, cardY + cardH * 0.22)

  // Title
  ctx.font = `bold ${Math.round(Math.min(42, Math.max(30, height * 0.045)))}px sans-serif`
  ctx.fillStyle = '#ffd35e'
  ctx.fillText(card.title, width / 2, cardY + cardH * 0.39)

  // Description (wrapped)
  ctx.font = `${Math.round(Math.min(25, Math.max(17, height * 0.028)))}px sans-serif`
  ctx.fillStyle = 'rgba(255, 248, 231, 0.88)'
  const descLines = wrapText(ctx, card.description, cardW - 60)
  const lineH = Math.round(Math.min(30, Math.max(22, height * 0.036)))
  descLines.forEach((line, i) => {
    ctx.fillText(line, width / 2, cardY + cardH * 0.50 + i * lineH)
  })

  // Navigation dots
  const dotCount = TUTORIAL_CARDS.length
  const dotSpacing = 22
  const dotsTotalW = (dotCount - 1) * dotSpacing
  const dotStartX = width / 2 - dotsTotalW / 2
  const dotY = cardY + cardH - 92
  for (let i = 0; i < dotCount; i++) {
    const isActive = i === state.currentCard
    ctx.beginPath()
    ctx.arc(dotStartX + i * dotSpacing, dotY, isActive ? 6 : 4, 0, Math.PI * 2)
    ctx.fillStyle = isActive ? '#ffd35e' : 'rgba(255, 248, 231, 0.35)'
    ctx.fill()
  }

  // Primary button (Next / Got it!)
  const btn = getTutorialButtonRect(width, height)
  const isLastCard = state.currentCard >= TUTORIAL_CARDS.length - 1
  const pulse = 0.85 + 0.15 * Math.sin(now * 0.004)

  const btnGrad = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h)
  btnGrad.addColorStop(0, `rgba(107, 192, 67, ${pulse})`)
  btnGrad.addColorStop(1, `rgba(74, 138, 42, ${pulse})`)
  ctx.fillStyle = btnGrad
  roundRectPath(ctx, btn.x - btn.w / 2, btn.y, btn.w, btn.h, btn.h / 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.font = `bold ${Math.round(height * 0.022)}px sans-serif`
  ctx.fillStyle = '#fff8e7'
  ctx.fillText(isLastCard ? 'Got it!' : 'Next  >', btn.x, btn.y + btn.h / 2)

  ctx.restore()
}

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(ctx: Ctx, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

export function hitTestTutorialButton(rect: TutorialButtonRect, pos: Vec2): boolean {
  return pos.x >= rect.x - rect.w / 2 &&
         pos.x <= rect.x + rect.w / 2 &&
         pos.y >= rect.y &&
         pos.y <= rect.y + rect.h
}
