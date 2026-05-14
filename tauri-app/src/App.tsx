import './App.css'

type Campaign = {
  game: string
  drop: string
  progress: number
  eta: string
  state: 'Mining' | 'Queued' | 'Claimable' | 'Done'
}

const campaigns: Campaign[] = [
  { game: 'Rust', drop: 'Streamer Crate', progress: 72, eta: '18m', state: 'Mining' },
  { game: 'Rainbow Six Siege', drop: 'Esports Pack', progress: 35, eta: '1h 12m', state: 'Queued' },
  { game: 'Noita', drop: 'Anniversary Drop', progress: 100, eta: 'Ready', state: 'Claimable' },
]

const activity = [
  'Connected to Twitch session from encrypted cookie jar.',
  'Tracking 84 eligible live channels across 6 campaigns.',
  'Mining xqc — stream tags validated for current campaign.',
  'Next websocket shard refresh in 02:41.',
]

function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">⛏️</div>
          <div>
            <p className="eyebrow">Tauri rewrite</p>
            <h1>Twitch Drops Miner</h1>
          </div>
        </div>
        <nav aria-label="Primary">
          <a className="active" href="#dashboard">Dashboard</a>
          <a href="#inventory">Inventory</a>
          <a href="#priority">Priority</a>
          <a href="#settings">Settings</a>
        </nav>
        <div className="session-card">
          <span className="status-dot" />
          <div>
            <strong>Miner online</strong>
            <p>Stream-less watch loop active</p>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="hero" id="dashboard">
          <div>
            <p className="eyebrow">Current channel</p>
            <h2>xqc streaming Rust</h2>
            <p className="muted">Validated tags, campaign match, and eligible linked account. The backend will own live Twitch state; this shell is the responsive parity target.</p>
          </div>
          <div className="hero-actions">
            <button>Reload campaigns</button>
            <button className="secondary">Switch channel</button>
          </div>
        </header>

        <section className="stats-grid" aria-label="Miner stats">
          <article><span>Progress</span><strong>72%</strong><small>Current drop</small></article>
          <article><span>Channels</span><strong>84</strong><small>Tracked across shards</small></article>
          <article><span>Campaigns</span><strong>6</strong><small>Eligible right now</small></article>
          <article><span>Bandwidth</span><strong>0 video</strong><small>Metadata-only mining</small></article>
        </section>

        <section className="panel-grid">
          <article className="panel large" id="inventory">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Inventory</p>
                <h3>Campaign progress</h3>
              </div>
              <button className="text-button">Claim ready</button>
            </div>
            <div className="campaign-list">
              {campaigns.map((campaign) => (
                <div className="campaign" key={`${campaign.game}-${campaign.drop}`}>
                  <div>
                    <strong>{campaign.game}</strong>
                    <p>{campaign.drop}</p>
                  </div>
                  <div className="progress-wrap" aria-label={`${campaign.drop} progress ${campaign.progress}%`}>
                    <span style={{ width: `${campaign.progress}%` }} />
                  </div>
                  <div className="campaign-meta">
                    <span>{campaign.state}</span>
                    <small>{campaign.eta}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel" id="priority">
            <p className="eyebrow">Priority mode</p>
            <h3>Game order</h3>
            <ol className="priority-list">
              <li>Rust</li>
              <li>Rainbow Six Siege</li>
              <li>Noita</li>
              <li>Mine anything eligible</li>
            </ol>
          </article>

          <article className="panel" id="settings">
            <p className="eyebrow">Settings parity</p>
            <h3>Planned controls</h3>
            <ul className="check-list">
              <li>Cookie/session storage warning</li>
              <li>Autostart + tray behavior</li>
              <li>Theme and localization</li>
              <li>Exclusion list and manual switch</li>
            </ul>
          </article>

          <article className="panel large">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Activity</p>
                <h3>Miner log</h3>
              </div>
              <span className="pill">live</span>
            </div>
            <ul className="activity-log">
              {activity.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </article>
        </section>
      </section>
    </main>
  )
}

export default App
