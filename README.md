# 🍉 Fruit Fury

Webcam-controlled Fruit Ninja clone. Slash falling fruit by swiping your hands
in front of the camera — from any direction. Built with TypeScript, Vite,
MediaPipe HandLandmarker, and Canvas 2D.

## Run

```bash
npm install
npm run dev
```

Open the printed URL and allow camera access.

## Controls

- **Enter** — start / restart
- **C** — calibrate your reach (wave both hands around your comfortable area for 3s)
- **F** — toggle the dimmed webcam feed
- No camera? It falls back to mouse control automatically.

## How it works

- MediaPipe tracks up to two index-fingertips at ~30fps.
- A calibration step maps your comfortable reach onto the full game canvas (mirrored).
- A velocity gate turns fast hand motion into cutting segments; segment-vs-circle
  tests decide what gets sliced — so slashing works from any direction.
- Slicing 3+ fruit in one quick swipe scores a combo.

## Test

```bash
npm run test
```

## Tuning

All gameplay constants live in `src/config.ts` (slash velocity threshold, combo
window, spawn ramp, gravity, lives, etc.).
