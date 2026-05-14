# Twitch Drops Miner Rust/Tauri Rewrite - Feature Parity Map

Source project: `DevilXD/TwitchDropsMiner` Python/Tkinter app.

## Core miner behavior

- Twitch login/session persistence using cookie jar storage.
- Fetch available Twitch drops campaigns for the logged-in account.
- Detect linked-account eligibility and campaign/drop status.
- Discover eligible live channels/streams for active campaigns.
- Validate stream tags and campaign eligibility before mining.
- Mine drops without downloading video/audio by periodically sending the minimum watch/progress requests.
- Track drop progress, remaining time estimates, claimed/completed state, and campaign completion.
- Automatically claim claimable drops where supported by the current Python app.
- Automatically start mining when eligible campaigns appear and stop when nothing remains.
- Switch channels when current stream goes offline or a higher-priority campaign/game becomes available.
- Maintain websocket subscriptions for stream online/offline/viewer updates with sharding limits around the original app's 199-channel target.

## User-facing features

- Main dashboard: current status, selected channel, game/campaign/drop progress, logs/status messages.
- Inventory view: campaigns, drops, progress, linked/eligible state, claim/completion state.
- Settings view: priority list, exclusion list, priority mode, reload/restart mining controls, autostart where supported, theme/language/options parity.
- Manual channel switching.
- Persistent settings file.
- Persistent cache for Twitch metadata and assets.
- Persistent cookies with clear warning/security handling.
- Localization parity with existing `lang/*.json` translations where possible.
- System tray/background behavior and native notifications where Tauri supports them.
- Cross-platform packaging for Windows, Linux, and macOS.

## Python modules to port

- `twitch.py` -> Rust Twitch GraphQL/API client, auth/session, campaign discovery, mining requests.
- `websocket.py` -> async Rust websocket manager with sharding/reconnect/backoff.
- `inventory.py` -> campaign/drop domain models and state transitions.
- `channel.py` -> stream/channel domain models, online/offline events, selection metadata.
- `settings.py` -> serde-backed persistent config.
- `cache.py` -> local cache layer.
- `translate.py` + `lang/*.json` -> frontend i18n resources.
- `gui.py` -> Tauri frontend components and command/event bridge.
- `registry.py` -> platform autostart abstraction, likely via Tauri plugin or platform-specific Rust.

## Suggested Rust/Tauri architecture

- Backend: Tauri v2 + Tokio async runtime.
- Crates: `reqwest`, `tokio-tungstenite`, `serde`, `serde_json`, `thiserror`, `tracing`, `cookie_store`/`reqwest_cookie_store`, `chrono`, `directories`, `tauri-plugin-store`, `tauri-plugin-autostart`, `tauri-plugin-notification`.
- Frontend: React + TypeScript + Vite, responsive CSS (mobile/tablet/desktop), componentized dashboard/inventory/settings/logs.
- State bridge: Rust backend owns miner state; frontend invokes commands and subscribes to Tauri events for status/progress/log updates.
- Testing: backend unit tests for priority selection/state transitions; mocked Twitch API fixtures; frontend component tests once UI stabilizes.

## Milestones

1. Scaffold Tauri app and CI/build skeleton.
2. Port models/settings/cache/i18n loading.
3. Port Twitch auth/session and campaign discovery.
4. Port stream discovery + websocket tracking.
5. Implement miner loop and channel selection logic.
6. Implement full responsive UI parity.
7. Package/release for Windows/Linux/macOS.
8. Run parity audit against Python behavior before replacing legacy entrypoints.
