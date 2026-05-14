# Active Goal: Rust/Tauri Rewrite to Full Feature Parity

Owner request: keep this project moving until Tyler explicitly pauses or cancels it.

## Definition of done

The rewrite is not complete until all of these are true:

- The Rust/Tauri app implements feature parity with the Python/Tkinter version documented in `FEATURE_PARITY.md` and `PORTING_BACKLOG.md`.
- Core miner behavior works: Twitch auth/session persistence, campaign discovery, eligible stream discovery, websocket tracking/sharding, channel switching, stream-less mining loop, drop progress tracking, claiming, settings/cache/localization, tray/autostart/notifications where supported.
- Windows is validated as a first-class target, including WebView2, packaging, portable storage expectations, cookie/settings paths, tray, notifications, and autostart behavior.
- Linux/WSL validation uses WSL-native Cargo by default. Windows Cargo/Tauri is used for Windows release validation.
- The old Python implementation remains available as behavioral reference until Tyler explicitly approves replacing release entrypoints.
- Manual parity matrix in `PORTING_BACKLOG.md` has been run or explicitly marked with blockers.

## Operating rules

- Do not stop advancing this goal unless Tyler says pause/cancel, a safety/credential blocker prevents progress, or a decision is genuinely needed.
- Keep main chat responsive; use background workers/subagents for long implementation slices.
- Prefer small, reviewable commits on `rust-tauri-rewrite` and push to `Vq-x/TwitchDropsMiner` when validated.
- Keep `docs/rewrite/ACTIVE_STATE.md` updated with current milestone, blockers, and next actions.
- Keep Windows support visible in every architecture decision.

## Current external blocker

WSL Tauri `cargo check` needs native system packages in Ubuntu/WSL. Tyler needs to run:

```bash
sudo apt-get update && sudo apt-get install -y build-essential pkg-config libssl-dev libgtk-3-dev libwebkit2gtk-4.0-dev libayatana-appindicator3-dev librsvg2-dev
```

Until that is installed, use non-Tauri Rust/library checks where possible and use Windows Cargo only for Windows-specific validation/fallback.
