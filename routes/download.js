const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { cleanUrl } = require('../utils/cleanUrl');

const DOWNLOAD_DIR = path.join(__dirname, '..', 'tmp');

// Ensure tmp dir exists
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

// ── POST /api/download ────────────────────────────────────────────────────────
router.post('/download', (req, res) => {
  let { url, quality, platform } = req.body;

  if (!url) return res.status(400).json({ error: 'URL is required' });

  // Clean tracking params
  const cleanedUrl = cleanUrl(url);

  // Build yt-dlp command
  let format = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4';
  if (quality === 'audio') format = 'bestaudio/best';
  if (quality === '720') format = 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/mp4';
  if (quality === '480') format = 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/mp4';

  const outputTemplate = path.join(DOWNLOAD_DIR, '%(title)s.%(ext)s');
  const cmd = `yt-dlp -f "${format}" -o "${outputTemplate}" --no-playlist "${cleanedUrl}" --print after_move:filepath`;

  console.log(`[Download] Cleaned URL: ${cleanedUrl}`);
  console.log(`[Download] Running: ${cmd}`);

  exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('[Download Error]', stderr);
      return res.status(500).json({ error: 'Download failed. Please check the URL and try again.', detail: stderr });
    }

    const filePath = stdout.trim().split('\n').pop();
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(500).json({ error: 'File not found after download.' });
    }

    const fileName = path.basename(filePath);
    res.download(filePath, fileName, (downloadErr) => {
      // Delete temp file after sending
      fs.unlink(filePath, () => {});
      if (downloadErr) console.error('[Send Error]', downloadErr);
    });
  });
});

// ── POST /api/info — fetch video title/thumbnail before download ──────────────
router.post('/info', (req, res) => {
  let { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const cleanedUrl = cleanUrl(url);
  const cmd = `yt-dlp --dump-json --no-playlist "${cleanedUrl}"`;

  exec(cmd, { timeout: 30000 }, (err, stdout) => {
    if (err) return res.status(500).json({ error: 'Could not fetch video info.' });
    try {
      const info = JSON.parse(stdout);
      res.json({
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration_string,
        uploader: info.uploader,
        cleanUrl: cleanedUrl
      });
    } catch {
      res.status(500).json({ error: 'Failed to parse video info.' });
    }
  });
});

module.exports = router;
