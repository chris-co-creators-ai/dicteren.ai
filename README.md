# Dicteren.ai

Dicteren.ai is a paid, one-time-purchase desktop dictation app for people who want fast local speech-to-text without sending recordings to a cloud service.

The product is based on an upstream MIT-licensed local dictation codebase and is being repositioned as a commercial desktop app with Dutch-first branding, privacy-first positioning, and a direct purchase model.

## Product Positioning

- **Local by default:** speech processing runs on the user's computer.
- **One-time purchase:** no subscription requirement for the core desktop app.
- **Global shortcut workflow:** press a shortcut, speak, release, and insert text into the active app.
- **Power-user controls:** model selection, microphone settings, history, post-processing, custom words, and debug tooling remain available.

## Development

Prerequisites:

- Rust, latest stable
- Bun
- Platform dependencies listed in [BUILD.md](BUILD.md)

Install dependencies:

```bash
bun install
```

Run the frontend only:

```bash
bun run dev
```

Run the Tauri app:

```bash
bun run tauri dev
```

Build the frontend:

```bash
bun run build
```

Build the desktop app:

```bash
bun run tauri build
```

## Model Assets

The current fork still downloads speech models from the upstream model CDN. Before a public commercial launch, migrate those artifacts to infrastructure controlled by Dicteren.ai and update the model URLs in `src-tauri/src/managers/model.rs`.

Required local VAD model for development:

```bash
mkdir -p src-tauri/resources/models
curl -o src-tauri/resources/models/silero_vad_v4.onnx https://models.dicteren.ai/silero_vad_v4.onnx
```

## Commercialization Tasks

- Replace placeholder product URLs with final Dicteren.ai purchase, download, and update endpoints.
- Decide final license terms for the commercial distribution while preserving upstream MIT attribution.
- Replace app icons and tray assets with final Dicteren.ai assets.
- Configure signing identities for macOS and Windows.
- Host release update metadata at `https://dicteren.ai/releases/latest.json`.
- Add a license activation or receipt-checking flow if the paid build requires enforcement.

## Verification

```bash
bun run build
cd src-tauri && cargo check
```

For full packaging verification:

```bash
bun run tauri build
```
