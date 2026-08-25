# MK Universal Downloader

Multi-platform media downloader — YouTube, Instagram, Facebook, Twitter/X, TikTok, Spotify.

## Features

- 🔗 **Auto tracking removal** — `?` and everything after it is stripped from all URLs
- 🎨 **Platform-themed pages** — each page matches the platform's color palette
- 🏠 **Unified home** — pick your platform from one clean landing page
- 🍔 **Burger menu** — contact developer link on every page
- 💤 **Render optimization** — server auto-exits after 5 min of inactivity to save free-tier resources
- ⚡ **yt-dlp backend** — handles 1000+ sites

## Deploy to Render

1. Push this project to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Render auto-reads `render.yaml` — build installs Node deps + yt-dlp binary
5. Start command: `node server.js`
6. Done ✅

## Local Dev

```bash
npm install
# Install yt-dlp globally
pip install yt-dlp   # or download binary from yt-dlp releases

node server.js
# → http://localhost:3000
```

## Project Structure

```
mk-downloader/
├── server.js              # Express server + Render idle-exit optimization
├── render.yaml            # Render deployment config
├── routes/
│   └── download.js        # /api/download & /api/info endpoints
├── utils/
│   └── cleanUrl.js        # Strips tracking params after "?"
└── public/
    ├── index.html          # Home page
    ├── css/style.css       # Shared styles + platform themes
    ├── js/app.js           # Shared JS (burger, downloader logic)
    └── pages/
        ├── youtube.html
        ├── instagram.html
        ├── facebook.html
        ├── twitter.html
        ├── tiktok.html
        └── spotify.html
```

## URL Cleaning Logic

- All platforms: strips `?` and everything after it
- YouTube exception: `?v=VIDEO_ID` is preserved (required for playback), all other params removed
- Example: `https://youtu.be/abc?si=TRACK&utm=share` → `https://youtu.be/abc`
