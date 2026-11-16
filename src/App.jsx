import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlarmClock, Plus, Play, Pause, RotateCcw, Share2, Trash2, Pencil,
  Check, X, Clock3, Link2, Copy, Gamepad2, Volume2, VolumeX, ExternalLink
} from "lucide-react";

const STORAGE_KEY = "minimal-game-timer-v1";
const DEFAULT_GAMES = [
  {
    id: "focus-round",
    title: "Focus Round",
    description: "A focused five-minute challenge. Stay sharp and beat the clock.",
    duration: 300
  },
  {
    id: "quick-break",
    title: "Quick Break",
    description: "Take a short reset before the next round.",
    duration: 120
  }
];

function safeDecodeSharedGame() {
  try {
    const raw = new URLSearchParams(window.location.hash.slice(1)).get("game");
    if (!raw) return null;
    const decoded = JSON.parse(decodeURIComponent(escape(atob(raw))));
    if (
      typeof decoded.title !== "string" ||
      typeof decoded.description !== "string" ||
      !Number.isFinite(decoded.duration) ||
      decoded.duration < 1 ||
      decoded.duration > 86400
    ) return null;
    return {
      id: `shared-${Date.now()}`,
      title: decoded.title.slice(0, 80),
      description: decoded.description.slice(0, 500),
      duration: Math.floor(decoded.duration)
    };
  } catch {
    return null;
  }
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function readSavedGames() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.filter(g => g && typeof g.id === "string" &&
        typeof g.title === "string" && typeof g.description === "string" &&
        Number.isFinite(g.duration) && g.duration > 0);
    }
  } catch { /* Use defaults when storage is unavailable or invalid. */ }
  return DEFAULT_GAMES;
}

function GameForm({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [minutes, setMinutes] = useState(
    String(Math.floor((initial?.duration ?? 300) / 60))
  );
  const [seconds, setSeconds] = useState(
    String((initial?.duration ?? 300) % 60)
  );
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const duration = Number(minutes) * 60 + Number(seconds);
    if (!title.trim()) return setError("Please enter a game title.");
    if (!Number.isInteger(duration) || duration < 1 || duration > 86400) {
      return setError("Duration must be between 1 second and 24 hours.");
    }
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      duration
    });
  }

  return (
    <form className="game-form" onSubmit={submit}>
      <div className="form-heading">
        <div>
          <span className="eyebrow">{initial ? "EDIT GAME" : "NEW GAME"}</span>
          <h2>{initial ? "Update your timer" : "Create a game timer"}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Close form"><X size={18}/></button>
      </div>
      <label>
        Game title
        <input autoFocus maxLength={80} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Speed challenge" />
      </label>
      <label>
        Description
        <textarea maxLength={500} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Add instructions or a short description..." />
      </label>
      <div className="duration-fields">
        <label>Minutes<input type="number" min="0" max="1440" value={minutes} onChange={e => setMinutes(e.target.value)} /></label>
        <label>Seconds<input type="number" min="0" max="59" value={seconds} onChange={e => setSeconds(e.target.value)} /></label>
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="button button-quiet" type="button" onClick={onCancel}>Cancel</button>
        <button className="button button-primary" type="submit"><Check size={16}/> Save game</button>
      </div>
    </form>
  );
}

export default function App() {
  const sharedGame = useMemo(() => safeDecodeSharedGame(), []);
  const [games, setGames] = useState(() => sharedGame ? [sharedGame] : readSavedGames());
  const [selectedId, setSelectedId] = useState(() => sharedGame?.id ?? readSavedGames()[0]?.id);
  const [remaining, setRemaining] = useState(() => sharedGame?.duration ?? readSavedGames()[0]?.duration ?? 300);
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState(sharedGame ? "Shared game loaded. Add it to your collection to keep it." : "");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSharedView, setIsSharedView] = useState(Boolean(sharedGame));
  const endAtRef = useRef(null);
  const selected = games.find(g => g.id === selectedId) ?? games[0];

  useEffect(() => {
    if (!isSharedView) localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  }, [games, isSharedView]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const next = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemaining(next);
      if (next <= 0) {
        setRunning(false);
        endAtRef.current = null;
        if (soundEnabled) {
          try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const context = new AudioContextClass();
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.frequency.value = 660;
            gain.gain.value = 0.12;
            oscillator.start();
            oscillator.stop(context.currentTime + 0.35);
            oscillator.onended = () => context.close();
          } catch { /* Audio may be unavailable or blocked by the browser. */ }
        }
      }
    };
    tick();
    const interval = window.setInterval(tick, 200);
    return () => window.clearInterval(interval);
  }, [running, soundEnabled]);

  const selectGame = useCallback((game) => {
    setRunning(false);
    endAtRef.current = null;
    setSelectedId(game.id);
    setRemaining(game.duration);
    setNotice("");
  }, []);

  function toggleTimer() {
    if (!selected) return;
    if (running) {
      setRunning(false);
      endAtRef.current = null;
    } else if (remaining > 0) {
      endAtRef.current = Date.now() + remaining * 1000;
      setRunning(true);
    }
  }

  function resetTimer() {
    setRunning(false);
    endAtRef.current = null;
    setRemaining(selected?.duration ?? 0);
  }

  function saveGame(game) {
    const exists = games.some(g => g.id === game.id);
    setGames(prev => exists ? prev.map(g => g.id === game.id ? game : g) : [...prev, game]);
    setSelectedId(game.id);
    setRemaining(game.duration);
    setRunning(false);
    setEditing(null);
    setShowForm(false);
    setIsSharedView(false);
    setNotice("Game saved.");
  }

  function deleteGame(id) {
    if (games.length === 1) {
      setNotice("Keep at least one game in your collection.");
      return;
    }
    const next = games.filter(g => g.id !== id);
    setGames(next);
    if (selectedId === id) {
      setSelectedId(next[0].id);
      setRemaining(next[0].duration);
      setRunning(false);
    }
  }

  async function shareGame(game) {
    // The game configuration is encoded in the URL fragment. It is not uploaded to a server.
    const payload = { title: game.title, description: game.description, duration: game.duration };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const url = `${window.location.origin}${window.location.pathname}#game=${encoded}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: game.title, text: game.description, url });
      } else {
        await navigator.clipboard.writeText(url);
        setNotice("Share link copied to clipboard.");
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(url);
          setNotice("Share link copied to clipboard.");
        } catch {
          window.prompt("Copy this game link:", url);
        }
      }
    }
  }

  function addSharedToCollection() {
    if (!selected) return;
    const saved = { ...selected, id: crypto.randomUUID() };
    setGames(prev => [...prev, saved]);
    setSelectedId(saved.id);
    setRemaining(saved.duration);
    setIsSharedView(false);
    setNotice("Shared game added to your collection.");
    window.history.replaceState(null, "", window.location.pathname);
  }

  const progress = selected ? remaining / selected.duration : 0;
  const isComplete = remaining === 0;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href={window.location.pathname} aria-label="Game Timer home">
          <span className="brand-mark"><Gamepad2 size={19}/></span>
          <span>playtime<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-right">
          <span className="status-dot" /> <span className="status-label">YOUR GAME SPACE</span>
        </div>
      </header>

      <section className="intro">
        <span className="eyebrow">TIME WELL PLAYED</span>
        <h1>Make every second <span>count.</span></h1>
        <p>Create custom game timers, set the rules, and share a game with anyone using a link.</p>
      </section>

      {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15}/></button></div>}

      <section className="workspace">
        <aside className="game-sidebar">
          <div className="sidebar-heading">
            <div><span className="eyebrow">YOUR COLLECTION</span><h2>Game timers <span className="count">{games.length}</span></h2></div>
            <button className="add-button" onClick={() => { setEditing(null); setShowForm(true); }} aria-label="Add game"><Plus size={19}/></button>
          </div>
          <div className="game-list">
            {games.map(game => (
              <button key={game.id} className={`game-item ${game.id === selectedId ? "active" : ""}`} onClick={() => selectGame(game)}>
                <span className="game-item-icon"><AlarmClock size={17}/></span>
                <span className="game-item-copy"><strong>{game.title}</strong><small>{formatTime(game.duration)}</small></span>
                {game.id === selectedId && <span className="active-indicator"/>}
              </button>
            ))}
          </div>
          <div className="sidebar-footer"><Clock3 size={15}/><span>One timer at a time</span></div>
        </aside>

        <section className="timer-panel">
          {selected && <>
            <div className="timer-panel-top">
              <div><span className="eyebrow">CURRENT CHALLENGE</span><span className={`timer-state ${running ? "live" : isComplete ? "done" : ""}`}>{running ? "IN PROGRESS" : isComplete ? "COMPLETED" : "READY TO PLAY"}</span></div>
              <div className="timer-actions">
                <button className="icon-button" onClick={() => setSoundEnabled(v => !v)} title={soundEnabled ? "Mute alert" : "Enable alert"} aria-label={soundEnabled ? "Mute alert" : "Enable alert"}>{soundEnabled ? <Volume2 size={17}/> : <VolumeX size={17}/>}</button>
                <button className="icon-button" onClick={() => { setEditing(selected); setShowForm(true); }} title="Edit game" aria-label="Edit game"><Pencil size={17}/></button>
                <button className="icon-button danger-hover" onClick={() => deleteGame(selected.id)} title="Delete game" aria-label="Delete game"><Trash2 size={17}/></button>
              </div>
            </div>
            <div className="timer-content">
              <div className="timer-title-row"><h2>{selected.title}</h2><button className="share-button" onClick={() => shareGame(selected)}><Share2 size={15}/> Share</button></div>
              <p className="game-description">{selected.description || "No description added yet. Edit this game to add instructions."}</p>
              <div className={`clock ${isComplete ? "clock-done" : ""}`} aria-live="off">
                <div className="clock-label">{isComplete ? "TIME IS UP" : running ? "TIME REMAINING" : "READY WHEN YOU ARE"}</div>
                <div className="clock-time" role="timer" aria-label={`${remaining} seconds remaining`}>{formatTime(remaining)}</div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.max(0, progress * 100)}%` }}/></div>
                <div className="clock-meta"><span>{running ? "Keep going" : isComplete ? "Challenge complete" : "Take a breath. Then begin."}</span><span>{formatTime(selected.duration)} total</span></div>
              </div>
              <div className="timer-controls">
                <button className="button button-primary start-button" onClick={toggleTimer} disabled={isComplete && !running}>
                  {running ? <><Pause size={18}/> Pause timer</> : <><Play size={18} fill="currentColor"/> {isComplete ? "Completed" : "Start timer"}</>}
                </button>
                <button className="button button-secondary" onClick={resetTimer}><RotateCcw size={17}/> Reset</button>
              </div>
              {isSharedView && <div className="shared-callout"><Link2 size={17}/><span>This is a shared game. Save a copy to your own collection.</span><button onClick={addSharedToCollection}>Add to my games</button></div>}
            </div>
            <div className="timer-panel-footer"><span><span className="footer-dot"/> Timer runs in this browser tab</span><span>Built for better play</span></div>
          </>}
        </section>
      </section>

      <footer className="page-footer"><span>© {new Date().getFullYear()} playtime.</span><span>Simple tools. Better games.</span></footer>

      {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
        <GameForm initial={editing} onSave={saveGame} onCancel={() => setShowForm(false)}/>
      </div>}
    </main>
  );
}
