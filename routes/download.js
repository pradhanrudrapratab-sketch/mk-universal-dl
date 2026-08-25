const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { cleanUrl } = require('../utils/cleanUrl');

const DOWNLOAD_DIR = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// ── Find yt-dlp binary (checks multiple paths) ────────────────────────────────
function getYtDlpPath() {
  const candidates = [
    `${process.env.HOME}/bin/yt-dlp`,
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    'yt-dlp'  // fallback to PATH
  ];
  for (const p of candidates) {
    try {
      if (p === 'yt-dlp') return p; // always try PATH as last resort
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return 'yt-dlp';
}

const YTDLP = getYtDlpPath();
console.log(`[Routes] Using yt-dlp at: ${YTDLP}`);

// ── POST /api/info ─────────────────────────────────────────────────────────────
router.post('/info', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const cleanedUrl = cleanUrl(url);
  // --no-warnings reduces noise; --dump-json gets all metadata
  const cmd = `"${YTDLP}" --dump-json --no-playlist --no-warnings "${cleanedUrl}"`;

  console.log(`[Info] URL: ${cleanedUrl}`);

  exec(cmd, { timeout: 40000, maxBuffer: 1024 * 1024 * 5 }, (err, stdout, stderr) => {
    if (err) {
      console.error('[Info Error]', stderr || err.message);
      // Give useful error message based on common failures
      let msg = 'Could not fetch video info.';
      if (stderr.includes('Unsupported URL')) msg = 'This URL is not supported.';
      if (stderr.includes('Private video'))   msg = 'This video is private.';
      if (stderr.includes('not available'))   msg = 'Video not available in your region.';
      if (stderr.includes('yt-dlp: not found') || err.code === 127) {
        msg = 'Server setup issue: yt-dlp not installed. Contact developer.';
      }
      return res.status(500).json({ error: msg, debug: stderr });
    }

    try {
      // stdout may have multiple JSON lines for playlists — take first
      const firstLine = stdout.trim().split('\n')[0];
      const info = JSON.parse(firstLine);
      res.json({
        title:    info.title       || 'Untitled',
        thumbnail: info.thumbnail  || '',
        duration:  info.duration_string || '',
        uploader:  info.uploader   || info.channel || '',
        cleanUrl:  cleanedUrl
      });
    } catch (parseErr) {
      console.error('[Info Parse Error]', parseErr.message);
      res.status(500).json({ error: 'Failed to read video info.' });
    }
  });
});

// ── POST /api/download ─────────────────────────────────────────────────────────
router.post('/download', (req, res) => {
  const { url, quality, platform } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const cleanedUrl = cleanUrl(url);

  // Format selection
  let format = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best';
  if (quality === 'audio') format = 'bestaudio/best';
  if (quality === '720')   format = 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]';
  if (quality === '480')   format = 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480]';

  // Sanitize title in filename — avoid shell issues
  const outputTemplate = path.join(DOWNLOAD_DIR, '%(id)s.%(ext)s');

  const cmd = [
    `"${YTDLP}"`,
    `-f "${format}"`,
    `-o "${outputTemplate}"`,
    '--no-playlist',
    '--no-warnings',
    '--merge-output-format mp4',
    quality === 'audio' ? '--extract-audio --audio-format mp3' : '',
    `--print after_move:filepath`,
    `"${cleanedUrl}"`
  ].filter(Boolean).join(' ');

  console.log(`[Download] Platform: ${platform} | Quality: ${quality}`);
  console.log(`[Download] URL: ${cleanedUrl}`);

  exec(cmd, { timeout: 180000, maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
    if (err) {
      console.error('[Download Error]', stderr || err.message);
      let msg = 'Download failed. Please check the URL and try again.';
      if (stderr.includes('yt-dlp: not found') || err.code === 127) msg = 'Server error: yt-dlp missing.';
      if (stderr.includes('Private'))       msg = 'This content is private.';
      if (stderr.includes('Unsupported'))   msg = 'URL not supported.';
      return res.status(500).json({ error: msg, detail: stderr });
    }

    // Get the last non-empty line (the file path)
    const filePath = stdout.trim().split('\n').filter(Boolean).pop();
    console.log(`[Download] File: ${filePath}`);

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(500).json({ error: 'File not found after download.' });
    }

    const fileName = path.basename(filePath);
    res.download(filePath, fileName, (dlErr) => {
      fs.unlink(filePath, () => {});
      if (dlErr && !res.headersSent) console.error('[Send Error]', dlErr.message);
    });
  });
});

module.exports = router;
