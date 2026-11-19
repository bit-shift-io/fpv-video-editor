# FPV Video Editor CLI

A simple TypeScript-based CLI tool to process and join AVI files for YouTube upload. Designed for low-quality FPV footage where small file size is preferred.

## Features

1. **Join Videos**: Combine all `.avi` files in a directory into a single MP4.
2. **Convert for YouTube**: Convert AVI files to YouTube-optimized MP4 (H.264/AAC).
3. **Audio Management**: Strip audio from a video or replace it with background music.
4. **Frame Video**: Place a small clip centred over a background image at 720p or 1080p.

## Prerequisites

- **Node.js**: v14 or later.
- **FFmpeg**: Must be installed on your system.
  - Mac: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`

## Installation

```bash
git clone https://github.com/bit-shift-io/fpv-video-editor.git
cd fpv-video-editor
npm install
```

## Usage

You can run the tool using `npx ts-node src/index.ts`.

### 1. Join AVI files in a directory
```bash
npx ts-node src/index.ts join ./data -o ./full_session.mp4
```

### 2. Convert to YouTube format
```bash
npx ts-node src/index.ts convert ./full_session.mp4
```

### 3. Strip audio (not needed, just use step 4)
```bash
npx ts-node src/index.ts audio ./full_session.mp4
```

### 4. Replace audio with music
```bash
npx ts-node src/index.ts audio ./full_session.mp4 -r ./music/music.mp3
```

### 5. Frame a clip over a background image
```bash
npx ts-node src/index.ts frame ./joined_video.avi ./background.jpg --res 1080 --size maximum
```
- `--res`: `720` (1280×720) or `1080` (1920×1080).
- `--size`: `original` (clip unchanged), `maximum` (largest fit), or `halfway` (between the two).
- The background is scaled to cover the frame and centre-cropped.
- Output defaults to `<clip>_<res>p.mp4` beside the clip; override with `-o`.
- A clip larger than the chosen output aborts with a message and writes nothing.

## Developer notes

- Built with `commander`, `fluent-ffmpeg`, `ora`, and `chalk`.
- Uses TypeScript for safety and speed.
