import { CANVAS_SIZE } from './config'
import { CameraSource } from './game/camera'
import { Game } from './game/game'

async function boot() {
  const canvas = document.getElementById('game') as HTMLCanvasElement
  const video = document.getElementById('cam') as HTMLVideoElement
  CANVAS_SIZE.width = canvas.width = window.innerWidth
  CANVAS_SIZE.height = canvas.height = window.innerHeight
  const ctx = canvas.getContext('2d')!
  const camera = new CameraSource(video)
  const game = new Game(ctx, video, camera, canvas)
  await game.start()
}

boot().catch((err) => {
  console.error(err)
})
