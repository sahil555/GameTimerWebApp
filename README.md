# Playtime — React Game Timer

A minimal React + Vite game timer. Create multiple games with a title, description, and duration; run, pause, reset, edit, delete, and share a game using a URL.

## Features

- Multiple configurable game timers
- Countdown with start, pause, and reset
- Browser notification sound when the timer reaches zero (toggleable)
- Local persistence using `localStorage`
- Shareable links: the selected game's title, description, and duration are encoded in the URL fragment
- Responsive layout
- GitHub Actions deployment to GitHub Pages

## Run locally

Requires Node.js 20 or later.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build locally

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

1. Create a GitHub repository named **game-timer**.
2. Push this project to the repository's `main` branch.
3. Open **Settings → Pages** in the repository.
4. Under **Build and deployment → Source**, choose **GitHub Actions**.
5. The workflow at `.github/workflows/deploy.yml` builds and deploys the app whenever you push to `main`.
6. After the workflow succeeds, open the Pages URL shown in the deployment environment.

### Base path

The workflow reads the base path from GitHub Pages and passes it to Vite during the build. Project sites, user/organization sites, and custom domains therefore use the appropriate asset paths without changing `vite.config.js`. Local builds use `/`.

## How share links work

Press **Share** on a game. The app creates a URL fragment containing the game's title, description, and duration. On opening that URL, the recipient sees that game in a shared view and can add a copy to their own collection.

The fragment is not sent to the web server and no backend is used. Anyone with the link can read the shared configuration. Do not put private information in game titles or descriptions. Shared games are snapshots: later edits to the original game do not update an already-created link.

## Limitations

- This is a single-browser timer, not a synchronized multiplayer timer.
- The countdown is based on the browser clock and continues to account for elapsed time while the tab is throttled, but the page must remain open for the UI and sound alert to update.
- Local games are stored only in that browser's local storage.
- Shared links encode the game configuration in the URL; they do not synchronize timer progress between users.

## Project structure

```text
react-game-timer/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── .gitignore
├── index.html
├── package.json
├── README.md
└── vite.config.js
```
