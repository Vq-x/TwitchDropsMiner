# Rust/Tauri Porting Backlog

This backlog is an audit of the current Python/Tkinter TwitchDropsMiner codebase for the
`rust-tauri-rewrite` branch. It is intended to guide a parity-first rewrite without deleting or
rewriting the existing Python app.

The Python app's core behavior lives in `twitch.py`, `inventory.py`, `channel.py`,
`websocket.py`, `gui.py`, and the shared settings/cache/translation modules. The Rust/Tauri app
should keep the miner engine in Rust, expose command/event boundaries to the frontend, and treat
the Python implementation as the behavioral reference until parity tests replace it.

## Target Architecture

- Rust backend owns Twitch session/auth, HTTP/GQL requests, websocket subscriptions, miner state,
  scheduling, persistence, and domain models.
- Tauri frontend owns presentation, user input, filtering/sorting controls, notifications/tray
  affordances where Tauri plugins do not already abstract them, and log/status rendering.
- Backend emits typed events for state, inventory, channel list, websocket status, progress, logs,
  login prompts, notifications, and errors.
- Frontend invokes typed commands for start/stop/reload, login responses, settings updates,
  priority/exclusion edits, manual channel selection, link opens, cache clears, and shutdown.
- The Python modules remain in the repository as the reference implementation until replacement is
  explicitly approved.

## Core Data Models

Port these as serde-serializable Rust structs/enums with stable IDs and frontend-facing DTOs.
Separate internal mutable engine state from UI snapshots so frontend rendering never holds locks.

### Shared primitives

- `Game`: `id`, `name`, optional `slug`, `is_special_events()` for Twitch special-events game id
  `509663`.
- `ClientInfo`: Twitch client URL, client ID, user agent. Preserve current `WEB`, `MOBILE_WEB`,
  `ANDROID_APP`, and `SMARTBOX` values and random user-agent selection behavior.
- `AppState`: equivalent to Python `State`: `Idle`, `InventoryFetch`, `GamesUpdate`,
  `ChannelsFetch`, `ChannelsCleanup`, `ChannelSwitch`, `Exit`.
- `PriorityMode`: `PriorityOnly`, `EndingSoonest`, `LowAvailabilityFirst`.
- `Url`, `UtcDateTime`, `UserId`, `ChannelId`, `CampaignId`, `DropId`, `DropInstanceId` newtypes
  where helpful.

### Settings and persistence

- `Settings`: `proxy`, `language`, `dark_mode`, `exclude`, `priority`, `autostart_tray`,
  `connection_quality`, `tray_notifications`, `enable_badges_emotes`, `available_drops_check`,
  `priority_mode`, plus CLI/runtime-only flags currently supplied by `main.py`.
- `CookieStore`: persisted Twitch cookies compatible with `reqwest_cookie_store` or a migration
  path from `cookies.jar`.
- `ImageCacheEntry`: URL -> content hash + expiry timestamp, preserving seven-day expiry behavior.
- `LogConfig`: verbosity, file logging, websocket/GQL debug levels, and dump mode.

### Twitch auth/session

- `AuthState`: `user_id`, `device_id`, `session_id`, `access_token`, optional `client_version`,
  login event, validation lock, and clear/invalidate behavior.
- `LoginRequest`: username/password/token fields for credential login if kept.
- `DeviceCodeLogin`: `device_code`, `user_code`, `verification_uri`, `interval`, `expires_at`.
- `LoginStatus`: logging in, code required, 2FA required, bad credentials, captcha required,
  logged in, failed.

### Inventory and drops

- `BenefitType`: `Unknown`, `Badge`, `Emote`, `DirectEntitlement`.
- `Benefit`: `id`, `name`, `benefit_type`, `image_url`.
- `Drop`: common fields from `BaseDrop`: `id`, `name`, `campaign_id`, `benefits`, `starts_at`,
  `ends_at`, `claim_id`, `is_claimed`, `precondition_drop_ids`.
- `TimedDrop`: `Drop` plus `real_current_minutes`, `required_minutes`, `extra_current_minutes`,
  derived `current_minutes`, `remaining_minutes`, `total_required_minutes`,
  `total_remaining_minutes`, `progress`, `availability`, `can_claim`, `can_earn`.
- `DropsCampaign`: `id`, `name`, `game`, `linked`, `link_url`, `image_url`, `starts_at`,
  `ends_at`, `valid`, `allowed_channels`, `timed_drops`, derived active/upcoming/expired,
  eligible, finished, claimed/remaining counts, availability, first earnable drop.
- `ClaimedBenefit`: benefit id + `lastAwardedAt` timestamp, used to infer claimed drops when
  Twitch omits the `self` edge.

### Channels and streams

- `Channel`: `id`, `login`, optional `display_name`, `acl_based`, stream state, pending online
  timer, cached spade URL.
- `Stream`: `broadcast_id`, `viewers`, `drops_enabled`, optional `game`, `title`, cached stream
  URL, GQL/spade watch payload builders.
- `ChannelStatus`: offline, pending online, online with viewers/game/title/drops flag.
- `WatchSelection`: current channel id, manually selected channel id, reason for switch.

### Websocket

- `WebsocketTopic`: category (`User`, `Channel`), topic name, target id, raw topic string,
  handler kind.
- `WebsocketShard`: index, connected status, topics, submitted topics, reconnect state,
  ping/pong deadlines.
- `WebsocketPool`: up to `MAX_WEBSOCKETS = 8`, `WS_TOPICS_LIMIT = 50`, base user topics,
  channel topics, topic recycling logic.
- `PubSubMessage`: typed variants for `MESSAGE`, `PONG`, `RESPONSE`, `RECONNECT`, close/error.

## Module-by-Module Backlog

### `constants.py` -> `src/constants.rs`, `src/twitch/gql.rs`

- Port path constants through Tauri app data/cache/log directories instead of Python working-dir
  globals.
- Port timing constants: `PING_INTERVAL = 3m`, `PING_TIMEOUT = 10s`, `ONLINE_DELAY = 120s`,
  `WATCH_INTERVAL = 59s`, `MAX_EXTRA_MINUTES = 15`.
- Port capacity constants: `BASE_TOPICS = 2`, `MAX_WEBSOCKETS = 8`, `WS_TOPICS_LIMIT = 50`,
  `MAX_CHANNELS = ((8 * 50) - 2) / 2`.
- Port `ClientType` definitions and user-agent selection.
- Port all persisted GQL operation names, hashes, default variables, and variable merge behavior.
- Port websocket topic string construction:
  `user-drop-events`, `onsite-notifications`, `video-playback-by-id`,
  `broadcast-settings-update`.
- Add tests for persisted query variable merging, missing variable errors, topic string generation,
  and path selection under dev/package modes.

### `utils.py` -> `src/util/*`

- Port timestamp parsing for both fractional and whole-second Twitch UTC timestamps.
- Port `isonow()` with millisecond precision and `Z` suffix for watch payloads.
- Port minified JSON serialization for websocket and watch payloads.
- Port nonce generation for ASCII and lower-hex use cases.
- Port `ExponentialBackoff` with variance, shift, max, and reset behavior.
- Port `RateLimiter` semantics for GQL: capacity 5 per 1 second, concurrent requests counted
  against capacity.
- Replace `AwaitableValue` with `tokio::sync::watch`, `Notify`, or small state wrapper for current
  watching channel and websocket connection readiness.
- Preserve single-instance lock behavior in a Tauri-friendly way, preferably with a Tauri plugin or
  OS file lock in app data.
- Add unit tests for timestamp parsing, slug generation, backoff bounds/reset, rate limiter burst
  behavior, JSON serialization, and nonce length/character set.

### `settings.py` -> `src/settings.rs`

- Implement serde-backed settings with the same defaults and type cleanup/merge behavior.
- Preserve command-line/runtime override precedence for log/tray/dump/debug flags.
- Persist sets/enums/URLs in a versioned JSON format; include a migration shim if reading Python
  `settings.json` is required.
- Clamp `connection_quality` to 1..=6 before constructing HTTP timeouts.
- Expose Tauri commands/events for settings read/update/save and dirty-state tracking.
- Add tests for defaults, unknown-key cleanup, wrong-type replacement, enum serialization, and
  priority/exclude mutation.

### `twitch.py` -> `src/twitch/client.rs`, `src/miner/engine.rs`

- Build a `TwitchClient` around `reqwest` with proxy support, cookie store, default user agent,
  timeout scaling by connection quality, and max connection limits.
- Port `_AuthState.validate()`:
  - create `session_id` nonce;
  - load/get `device_id` from Twitch `unique_id` cookie;
  - restore `auth-token` cookie or start device OAuth login;
  - validate token via `https://id.twitch.tv/oauth2/validate`;
  - verify returned client id matches active `ClientInfo`;
  - persist user id and cookies.
- Decide whether to port username/password login. The current Python path handles 2FA and some
  captcha-proof behavior but falls back to `CaptchaRequired` for Chrome/captcha cases. Device OAuth
  is the safer first Rust milestone.
- Port `request()` wrapper with retry/backoff for 5xx and connection failures, proxy injection,
  GUI/close cancellation, invalidation deadline for OAuth polling, and response pre-read behavior.
- Port `gql_request()` with rate limiting, auth headers, persisted query retry for service errors
  and `PersistedQueryNotFound`, token invalidation/retry behavior, dump logging, and typed errors.
- Port state machine from `_run()` exactly before optimizing:
  `InventoryFetch -> GamesUpdate -> ChannelsCleanup -> ChannelsFetch -> ChannelSwitch -> Idle`.
- Port inventory fetch, campaign detail enrichment, claimed benefit inference, campaign maps, drop
  maps, and maintenance trigger generation.
- Port game priority calculation, priority modes, exclusions, channel sorting, max channel trim,
  and selected-channel override behavior.
- Port automatic claiming for active/expired claimable drops and claim notification emission.
- Add tests for state transitions, priority ordering, wanted-games selection, campaign filtering,
  claim-result parsing, GQL retry decisions, and close/reload error handling.

### `inventory.py` -> `src/domain/inventory.rs`

- Port `BenefitType`, `Benefit`, `Drop`, `TimedDrop`, and `DropsCampaign` as pure domain logic
  without UI dependencies.
- Preserve claimability rule: claimable until 24 hours after campaign end.
- Preserve eligibility rule: badge/emote campaigns require `enable_badges_emotes`; other campaigns
  require linked account.
- Preserve precondition chains and `first_drop` selection by lowest remaining minutes.
- Preserve `current_minutes = real_current_minutes + extra_current_minutes`, bounded real-minute
  updates, progress percentage, availability calculation, and `MAX_EXTRA_MINUTES` fallback trigger.
- Remove direct GUI calls from model methods; return domain events such as `DropUpdated`,
  `DropClaimed`, `CampaignProgressChanged`, `NeedsChannelSwitch`.
- Add fixture tests for active/upcoming/expired, preconditions, badge/emote opt-in, inferred
  claimed benefits, total remaining minutes, availability sorting, and max-extra-minutes behavior.

### `channel.py` -> `src/domain/channel.rs`, `src/twitch/streams.rs`

- Port `Channel` and `Stream` models and constructors from ACL, directory, and stream-info data.
- Port stream GQL info lookup and display-name fill-in.
- Port `AvailableDrops` check for streams when `available_drops_check` requires confirmation.
- Port live-stream discovery by game directory slug, including `SlugRedirect` fallback if needed.
- Port bulk online checks for ACL channels and external stream updates from GQL batches.
- Port `check_online()` delayed verification for `stream-up` websocket events, including pending
  online display state and cancellation on offline/remove.
- Port `send_watch()` using the GQL `SendEvents` mutation with gzip+base64 payload and expected
  status code 204.
- Keep playlist HEAD and spade POST paths as lower-priority compatibility tasks because the Python
  code marks them unused, but document them as fallback options.
- Add tests for drops-enabled detection, online/pending/offline transitions, stream equality,
  game slug generation, watch payload JSON shape, and channel switch eligibility.

### `websocket.py` -> `src/twitch/pubsub.rs`

- Implement PubSub websocket connection to `wss://pubsub-edge.twitch.tv/v1`.
- Port shard lifecycle: start, stop, reconnect, remove, connected wait, status events.
- Port exponential reconnect loop with maximum 3-minute backoff and proxy support.
- Port ping/pong handling: send `PING` every 3 minutes, reconnect if no `PONG` after 10 seconds,
  honor server `RECONNECT`.
- Port topic diffing and LISTEN/UNLISTEN batches of 20 topics with auth token.
- Port topic sharding and recycling after removals; enforce max topics with a typed error.
- Port message dispatch into nonblocking tasks for user drops, user notifications, stream state,
  and stream update handlers.
- Emit frontend websocket status with shard index, status string, and topic count.
- Add tests with a local mock websocket for reconnect, ping timeout, topic batching, duplicate
  topic suppression, topic recycling, and handler dispatch.

### `gui.py` -> `tauri-app/src/*`, `src/commands.rs`, `src/events.rs`

- Replace Tkinter widgets with React views backed by typed Tauri commands/events.
- Preserve main tabs/views: Main, Inventory, Settings, Help.
- Main view parity:
  - status bar;
  - websocket shard status list;
  - login/device-code form;
  - current campaign/drop progress, countdown, and claimed counts;
  - console/log output;
  - channel list with online/pending/offline, game, viewers, ACL/drops status, current watching
    marker, and manual selection.
- Inventory view parity:
  - filters for not linked, upcoming, expired, excluded, finished;
  - campaign cards/rows with image, status, starts/ends hover-equivalent, link state, allowed
    channels, drop rewards, claim/progress text, drop-specific starts/ends notes;
  - refresh behavior when opening the inventory view.
- Settings view parity:
  - proxy validation;
  - language selector;
  - dark mode;
  - tray notifications;
  - autostart + start-in-tray;
  - connection quality;
  - badges/emotes opt-in;
  - available-drops check;
  - priority list add/delete/reorder;
  - exclusion list add/delete;
  - priority mode;
  - reload mining command.
- Help view parity:
  - about/repository/donation links;
  - Twitch drops inventory/campaign links;
  - localized how-it-works and getting-started text.
- Tray/notification parity:
  - icon states: pickaxe, active, idle, maint, error;
  - minimize/restore/quit;
  - claimed drop notifications;
  - title text with game, rewards, progress, and claimed counts where supported.
- Window parity:
  - initial tray startup;
  - close request maps to engine `Exit`;
  - prevent close when fatal traceback/status must remain visible;
  - platform shutdown handling where Tauri exposes hooks.
- Add frontend tests after component boundaries stabilize: settings controls, priority reorder,
  inventory filters, channel selection, log rendering, and event reducer snapshots.

### `cache.py` -> `src/cache.rs`

- Port image cache directory and URL mapping database to Tauri cache/app data paths.
- Preserve seven-day expiry and orphan cleanup behavior.
- Preserve perceptual-ish 10x10 grayscale average hash naming if image de-duplication remains
  useful; otherwise explicitly migrate to content hash and adjust tests.
- Provide a command or asset protocol for cached images so React can render them safely.
- Preserve blank fallback image behavior for failed image loads.
- Add tests for expired URL cleanup, orphan cleanup, corrupt mapping recovery, cache hit refresh,
  and failed download fallback.

### `translate.py` + `lang/*.json` -> frontend/backend i18n

- Keep existing translation keys and language filenames as the source of truth.
- Load available languages from bundled resources and default to English.
- Preserve template/default merge behavior so missing translated keys fall back to English.
- For backend-generated messages, either emit translation keys + params or share the loaded catalog
  with Rust. Prefer translation keys to avoid backend/frontend drift.
- Add tests for language discovery, invalid language rejection, fallback merge, and no
  `language_name` override in translated files.

### `registry.py` and platform integration -> `src/platform/*`

- Replace Windows registry, Linux autostart desktop file, and macOS LaunchAgent code with
  `tauri-plugin-autostart` if it supports the required flags.
- If plugin support is insufficient, port platform-specific code behind a single `Autostart`
  trait/service.
- Preserve start-in-tray and verbosity/logging flags where possible.
- Add platform-gated tests or dry-run path generation tests for Windows, Linux, and macOS.

### `main.py`, `exceptions.py`, packaging scripts

- Map CLI flags to Tauri startup config where possible: `--version`, `-v`, `--tray`, `--log`,
  `--dump`, `--debug-ws`, `--debug-gql`.
- Port exception hierarchy to typed Rust errors using `thiserror` and frontend-safe error DTOs:
  exit, reload, request invalid, request failed, websocket closed, login failed, captcha required,
  GQL failure.
- Keep PyInstaller/build scripts for the Python app untouched until the rewrite fully replaces
  release packaging.
- Add Tauri packaging tasks for Windows, Linux, and macOS after runtime parity is functional.

## Async Task Inventory

- App bootstrap task: load settings/translations/cache, configure tracing/logging, enforce
  single-instance lock, create engine, start frontend.
- Auth validation task: serialize validation with a lock, update login UI state, persist cookies.
- OAuth device polling task: request device code, prompt user, poll token endpoint at Twitch
  interval until success, expiry, cancellation, or close.
- Miner state-machine task: owns high-level state transitions and reload/exit handling.
- Watch loop task: waits for current channel, sends watch payload every `WATCH_INTERVAL`, checks
  progress roughly 20 seconds after sends, performs current-drop GQL fallback or estimated minute
  bump, and supports restart notification.
- Maintenance task: schedules cleanup at campaign/drop start/end triggers and inventory reload at
  least hourly.
- Websocket shard tasks: one per PubSub connection, handling connect/reconnect, ping/pong,
  topic diffing, recv batching, and dispatch.
- Channel pending-online tasks: created by stream-up/update events, wait `ONLINE_DELAY`, then
  refresh stream info.
- Inventory image fetch/cache tasks: can run concurrently but must serialize cache mutation.
- Claim follow-up task: after a claim event, wait and poll current drop up to the Python app's
  4-second + 8x2-second cadence before restarting watch or reloading inventory.
- Frontend event pump: reduces backend events into UI state without blocking engine locks.
- Shutdown task: stop watch loop, maintenance, websockets, save cookies/settings/cache, close HTTP
  client, emit final status, and allow frontend window shutdown.

## Twitch API and Websocket Responsibilities

### HTTP and GQL

- `GET https://www.twitch.tv` or selected client URL: seeds `unique_id` device cookie.
- `POST https://id.twitch.tv/oauth2/device`: starts device-code login.
- `POST https://id.twitch.tv/oauth2/token`: polls for device token.
- `GET https://id.twitch.tv/oauth2/validate`: validates token and resolves user id/client id.
- `POST https://gql.twitch.tv/gql`: all persisted GraphQL operations and watch event mutation.
- `GET https://usher.ttvnw.net/api/channel/hls/{login}.m3u8`: unused playlist fallback support.
- Streamer HTML/config fetch for spade URL: unused spade fallback support.

### Persisted GQL operations

- `Inventory`: current user's in-progress inventory.
- `Campaigns`: available campaigns dashboard.
- `CampaignDetails`: expanded campaign/drop data.
- `ClaimDrop`: claim a drop instance.
- `CurrentDrop`: current watched drop session and minutes.
- `GetStreamInfo`: channel stream/title/game/viewer state.
- `AvailableDrops`: channel viewer-drop campaigns.
- `PlaybackAccessToken`: playlist fallback support.
- `GameDirectory`: live channels by game slug.
- `SlugRedirect`: game-name to slug redirect helper.
- `NotificationsDelete`: cleanup drop reward reminder notifications after processing.
- Keep unused notification/community-points queries documented but out of the first port unless a
  parity gap requires them.

### PubSub topics and handlers

- User drops topic: `user-drop-events.{user_id}`.
  - `drop-progress`: update expected drop minutes.
  - `drop-claim`: update claim id, claim, then restart watch or reload inventory.
- User notifications topic: `onsite-notifications.{user_id}`.
  - `create-notification` for drop reward reminders/emotes triggers inventory reload and deletes
    notification.
- Channel stream state topic: `video-playback-by-id.{channel_id}`.
  - `viewcount`: update viewers or mark pending online.
  - `stream-up`: mark pending online.
  - `stream-down`: set offline.
  - `commercial`: ignore.
- Channel stream update topic: `broadcast-settings-update.{channel_id}`.
  - title/game/tags update: log, delay, refresh stream info.

## UI Parity Checklist

- Main status reflects idle, inventory fetch, cleanup, gathering, switching, watching, exiting,
  terminated, no campaign, and no channel states.
- Websocket status displays one row per shard with status and topic count.
- Login UI supports device-code login first; credential/2FA parity can follow if intentionally
  retained.
- Console output receives backend logs and user-visible status messages.
- Current progress displays game, campaign/drop reward text, percentage, countdown/minutes,
  claimed count, and stops timer on watch restart.
- Channel list supports online/offline/pending state, viewers, game, drops-enabled indicator, ACL
  ordering, watching marker, user selection, and clear/remove updates.
- Inventory filters match Python defaults and logic, including priority-only interaction with
  excluded/not-linked visibility.
- Campaign display includes image, status, starts/ends, linked/not-linked link, allowed channels,
  drop rewards, claimable/claimed/progress state, and drop-specific start/end text.
- Settings controls persist immediately or mark dirty consistently with Python behavior.
- Priority list supports add, duplicate selection, delete, move up/down, and sorted available
  choices.
- Exclude list supports add, duplicate selection, delete, sorted insertion, and sorted available
  choices.
- Theme/language choices apply without restart where practical.
- Tray supports minimize/restore/quit, icon state changes, notification opt-out, and claimed-drop
  notifications.
- Autostart supports Windows, Linux, and macOS or clearly disables unsupported platforms in UI.
- Help/about links open externally and match existing localized text.
- Fatal errors keep enough UI visible for the user to read/copy the error before closing.

## Test Plan

### Docs and static validation

- For docs-only commits, run `git status --short`, `git diff -- docs/rewrite/PORTING_BACKLOG.md`,
  and inspect the staged diff before committing.

### Rust backend unit tests

- Domain tests: `Game`, `BenefitType`, `TimedDrop`, `DropsCampaign`, `Channel`, `Stream`.
- Settings tests: defaults, merge/migration, enum and URL serialization, mutation dirty flag.
- Utility tests: timestamp parsing, minified JSON, nonce generation, backoff, rate limiter.
- GQL tests: persisted query payloads, variable merge, retry classification, claim parsing.
- Selection tests: wanted games, priority modes, exclusions, ACL preference, viewer sorting,
  max-channel trim, current/selected channel retention.
- Websocket tests: topic string generation, shard capacity, batching, duplicate suppression,
  removal/recycling, ping/pong timeout, reconnect handling.

### Rust integration tests with mocks

- Mock Twitch GQL server for inventory, campaign details, stream info, current drop, claim, and
  game directory responses.
- Mock OAuth/device login server for success, pending, expiry, invalid token, client mismatch.
- Mock PubSub websocket for stream-up, stream-down, viewcount, broadcast update, drop progress,
  drop claim, PONG, and RECONNECT.
- End-to-end engine test: login -> inventory -> wanted games -> channels -> watch payload ->
  progress update -> claim -> reload.

### Frontend tests

- Event reducer snapshots for app state, inventory updates, channel updates, websocket statuses,
  settings updates, and logs.
- Component tests for settings mutation, priority/exclude controls, inventory filters, channel
  selection, login code display, and error states.
- Visual smoke checks for desktop and narrow widths once the main layout is implemented.

### Manual parity matrix

- Fresh login with no cookies.
- Restored login with valid cookies.
- Invalid/expired token recovery.
- No eligible campaigns.
- Upcoming campaign that becomes active.
- Active campaign with ACL channels.
- Active campaign without ACL channels.
- Badge/emote campaign with option off and on.
- Stream goes online after PubSub stream-up delay.
- Current stream goes offline and switches.
- Higher-priority game appears and switches.
- Drop progress arrives from PubSub.
- PubSub progress stalls and GQL current-drop fallback updates minutes.
- GQL fallback fails and estimated minute bump keeps UI moving.
- Claimable drop is claimed and notification is shown.
- Inventory reload after onsite notification.
- Proxy set/unset.
- Autostart set/unset per platform.
- Tray start/minimize/restore/quit.

## Platform Support Requirements

Windows must remain a first-class target throughout the rewrite:

- Validate Windows builds with Windows Cargo/Tauri before release, even when WSL Cargo is the default day-to-day validator.
- Preserve Windows-specific behavior from the Python app: current-user autostart, shutdown/close handling equivalents, tray minimize/restore/quit, native notifications, portable storage expectations, and safe cookie/settings paths.
- Confirm WebView2 runtime expectations and installer/bundle behavior.
- Keep CI/release planning for Windows, Linux, and macOS; do not merge platform-specific miner logic into the core Twitch engine.
- Add manual parity checks for Windows packaging, first launch, login/session persistence, autostart toggle, tray behavior, and app relocation.

## Recommended Implementation Order

1. Stabilize project scaffolding: Tauri commands/events, Rust module layout, tracing, app-data
   paths, settings load/save, and frontend state reducer shell.
2. Port pure models and utilities: `Game`, settings, timestamps, nonces, GQL payload builders,
   backoff/rate limiter, inventory/drop/channel structs.
3. Port Twitch HTTP foundation: reqwest client, cookies, proxy/timeouts, auth validation, device
   OAuth login, request wrapper, GQL wrapper, typed errors.
4. Port inventory loading and campaign/drop derivation: inventory/campaign GQL calls, claimed
   benefit inference, eligibility, claimability, progress calculations, cache image plumbing.
5. Port channel discovery and selection: game directory, ACL online checks, drops-enabled checks,
   wanted-game selection, priority/exclusion modes, max-channel trimming.
6. Port PubSub websocket pool: shards, topics, ping/pong, reconnect, stream/drop/notification
   handlers wired to domain events.
7. Port mining loop: watch payload sending, current-drop fallback, estimated progress bump,
   automatic claiming, claim follow-up polling, maintenance scheduler.
8. Build UI parity: main dashboard first, then inventory, settings, help, tray/notifications,
   autostart, and localization.
9. Add mock integration tests around the full engine and PubSub loop; use Python fixtures or saved
   GQL payloads where possible.
10. Run manual parity matrix on Windows/Linux/macOS builds, then decide when the Python app can be
    retired from release entrypoints.

## First Milestone Definition of Done

- Rust app starts and persists settings without touching Python files.
- Device OAuth login completes and cookies persist.
- Inventory loads into Rust domain models and renders in the Tauri UI.
- No mining/watch payloads are sent yet.
- Unit tests cover settings, GQL payload construction, timestamp parsing, and campaign/drop
  derivations.
- Python app still runs from `main.py`.

## High-Risk Areas

- Twitch persisted query hashes and client identifiers are volatile; keep them isolated and easy to
  update.
- Login behavior is sensitive. Device OAuth should be the first supported path; credential login
  and captcha behavior should be revisited deliberately.
- PubSub topic capacity and sharding directly determine how many channels can be watched; preserve
  Python limits before optimizing.
- Progress accuracy depends on PubSub, GQL fallback, and estimated minutes working together.
- UI model methods in Python have side effects; Rust should split domain updates from event
  emission to avoid lock contention and accidental frontend coupling.
- Platform autostart/tray behavior differs materially across Windows, Linux, and macOS.
