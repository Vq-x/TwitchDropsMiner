# Active Rewrite State

Status: active until paused/cancelled by Tyler.
Branch: `rust-tauri-rewrite`
Fork: `https://github.com/Vq-x/TwitchDropsMiner`

## Current milestone

Milestone 1: stabilize project scaffolding and port pure foundations.

Targets:
- Rust module layout for settings, domain models, utilities, Twitch API scaffolding, and miner engine boundaries.
- Serde-backed settings defaults and persistence skeleton.
- Domain structs/enums for games, campaigns, drops, channels, websocket topics, and miner status snapshots.
- Tauri command/event boundary that can return typed status/settings/inventory snapshots.
- Frontend state shell remains responsive and ready for real backend data.

## Validation status

- Frontend `npm run build`: passed.
- Windows Cargo `cargo check`: passed using Windows-side toolchain, before WSL Cargo preference was clarified.
- WSL Cargo: installed and preferred. Current blocker is missing WSL native build dependencies (`cc`/`build-essential`; likely GTK/WebKit dev packages after).

## Next actions

1. Start implementation worker for Milestone 1 Rust foundations.
2. After Tyler installs WSL native deps, rerun WSL `cargo check`.
3. Continue in small commits until Milestone 1 definition of done is met, then proceed to auth/session milestone.

## Pause protocol

If Tyler says pause/cancel, stop starting new workers, record current state here, and leave active work in a clean committed or clearly-stashed state.
