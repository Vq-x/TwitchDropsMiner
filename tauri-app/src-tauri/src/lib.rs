use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct MinerStatus {
  pub connected: bool,
  pub current_channel: Option<String>,
  pub current_game: Option<String>,
  pub active_campaigns: usize,
  pub tracked_channels: usize,
  pub message: String,
}

#[tauri::command]
fn miner_status() -> MinerStatus {
  MinerStatus {
    connected: false,
    current_channel: None,
    current_game: None,
    active_campaigns: 0,
    tracked_channels: 0,
    message: "Rust/Tauri rewrite scaffold is ready; Twitch backend port is next.".into(),
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![miner_status])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
