const express = require('express');
const path = require('path');
const { cleanUrl } = require('./utils/cleanUrl');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Activity tracking middleware — resets idle timer on every request
app.use((req, res, next) => {
  resetInactivityTimer();
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', require('./routes/download'));

// Serve page HTML files
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/youtube', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'youtube.html')));
app.get('/instagram', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'instagram.html')));
app.get('/facebook', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'facebook.html')));
app.get('/twitter', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'twitter.html')));
app.get('/tiktok', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'tiktok.html')));
app.get('/spotify', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'spotify.html')));

// ── Graceful shutdown on disconnect/close ─────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('[MK Downloader] SIGTERM received. Closing server...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[MK Downloader] SIGINT received. Closing server...');
  server.close(() => process.exit(0));
});

// ── Start ─────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[MK Downloader] Running on port ${PORT}`);
  resetInactivityTimer(); // start idle timer on boot
});
