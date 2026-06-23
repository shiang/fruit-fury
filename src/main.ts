import { CONFIG } from './config'
import { createHandSource } from './game/camera'
import { Game } from './game/game'

async function boot() {
  const canvas = document.getElementById('game') as HTMLCanvasElement
  const video = document.getElementById('cam') as HTMLVideoElement
  canvas.width = CONFIG.canvas.width
  canvas.height = CONFIG.canvas.height
  const ctx = canvas.getContext('2d')!
  const source = await createHandSource(video, canvas)
  const game = new Game(ctx, video, source)
  await game.start()
}

boot().catch((err) => {
  console.error(err)
  document.body.innerHTML = `<p style="color:#fff;font:20px sans-serif;padding:2rem">Failed to start: ${err}</p>`
})
