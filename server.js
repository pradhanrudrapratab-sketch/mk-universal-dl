const express = require('express');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// ── yt-dlp PATH fix for Render ────────────────────────────────────────────────
// Render installs yt-dlp to $HOME/bin — add it to PATH so exec() finds it
process.env.PATH = `${process.env.HOME}/bin:/usr/local/bin:${process.env.PATH}`;

// Verify yt-dlp at startup — logs version or clear error
try {
  const ver = execSync('yt-dlp --version', { encoding: 'utf8' }).trim();
  console.log(`[MK Downloader] yt-dlp found: v${ver}`);
} catch (e) {
  console.error('[MK Downloader] ⚠️  yt-dlp NOT found in PATH:', process.env.PATH);
  console.error('[MK Downloader] Build may have failed. Check Render build logs.');
}

// ── Render Optimization: auto-stop after inactivity ──────────────────────────
let inactivityTimer;
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    console.log('[MK Downloader] No activity for 5 min — shutting down to save resources.');
    process.exit(0);
  }, INACTIVITY_LIMIT);
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  resetInactivityTimer();
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', require('./routes/download'));

app.get('/',          (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/youtube',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'youtube.html')));
app.get('/instagram', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'instagram.html')));
app.get('/facebook',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'facebook.html')));
app.get('/twitter',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'twitter.html')));
app.get('/tiktok',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'tiktok.html')));
app.get('/spotify',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'spotify.html')));

// Debug endpoint — check yt-dlp status live
app.get('/api/health', (req, res) => {
  try {
    const ver = execSync('yt-dlp --version', { encoding: 'utf8' }).trim();
    res.json({ status: 'ok', ytdlp: ver, path: process.env.PATH });
  } catch (e) {
    res.status(500).json({ status: 'error', message: 'yt-dlp not found', path: process.env.PATH });
  }
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', () => { console.log('SIGTERM'); server.close(() => process.exit(0)); });
process.on('SIGINT',  () => { console.log('SIGINT');  server.close(() => process.exit(0)); });

// ── Start ─────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[MK Downloader] Running on port ${PORT}`);
  resetInactivityTimer();
});
