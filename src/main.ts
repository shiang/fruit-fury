import { CONFIG } from './config'
import { CameraSource } from './game/camera'
import { Game } from './game/game'

async function boot() {
  const canvas = document.getElementById('game') as HTMLCanvasElement
  const video = document.getElementById('cam') as HTMLVideoElement
  canvas.width = CONFIG.canvas.width
  canvas.height = CONFIG.canvas.height
  const ctx = canvas.getContext('2d')!
  const camera = new CameraSource(video)
  const game = new Game(ctx, video, camera, canvas)
  await game.start()
}

boot().catch((err) => {
  console.error(err)
})
