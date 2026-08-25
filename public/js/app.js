// ── Burger Menu ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger');
  const dropdown = document.getElementById('dropdown');

  if (burger && dropdown) {
    burger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => dropdown.classList.remove('open'));
    dropdown.addEventListener('click', (e) => e.stopPropagation());
  }
});

// ── Client-side URL cleaner (mirrors server cleanUrl) ─────────────────────────
function cleanTrackingUrl(rawUrl) {
  try {
    const url = new URL(rawUrl.trim());

    // YouTube: keep ?v= only
    if (url.hostname.includes('youtube.com') && url.pathname === '/watch') {
      const v = url.searchParams.get('v');
      if (v) return `https://www.youtube.com/watch?v=${v}`;
    }

    // Everything else: strip after "?"
    return `${url.protocol}//${url.hostname}${url.pathname}`;
  } catch {
    return rawUrl;
  }
}

// ── Fetch video info ──────────────────────────────────────────────────────────
async function fetchVideoInfo(url) {
  const res = await fetch('/api/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch info');
  return res.json();
}

// ── Main downloader setup — call on each platform page ────────────────────────
function initDownloader({ platform }) {
  const urlInput   = document.getElementById('urlInput');
  const btnFetch   = document.getElementById('btnFetch');
  const btnDown    = document.getElementById('btnDownload');
  const preview    = document.getElementById('preview');
  const prevThumb  = document.getElementById('previewThumb');
  const prevTitle  = document.getElementById('previewTitle');
  const prevMeta   = document.getElementById('previewMeta');
  const cleanBadge = document.getElementById('cleanBadge');
  const statusMsg  = document.getElementById('statusMsg');
  const qualityBtns = document.querySelectorAll('.q-btn');

  let selectedQuality = 'best';
  let currentUrl = '';

  // Quality selection
  qualityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      qualityBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedQuality = btn.dataset.q;
    });
  });

  // Auto-clean URL on paste/input
  urlInput.addEventListener('input', () => {
    const raw = urlInput.value;
    const cleaned = cleanTrackingUrl(raw);
    if (cleaned !== raw) {
      urlInput.value = cleaned;
    }
    hidePreview();
  });

  // Fetch info on button click
  btnFetch.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) return showStatus('Please paste a link first.', 'error');

    setLoading(btnFetch, true, 'Fetching...');
    hidePreview();
    clearStatus();

    try {
      const info = await fetchVideoInfo(url);
      currentUrl = info.cleanUrl || url;

      if (prevThumb && info.thumbnail) {
        prevThumb.src = info.thumbnail;
        prevThumb.style.display = 'block';
      }
      if (prevTitle) prevTitle.textContent = info.title || 'Untitled';
      if (prevMeta)  prevMeta.textContent  = `${info.uploader || ''}${info.duration ? ' · ' + info.duration : ''}`;
      if (cleanBadge) cleanBadge.style.display = (cleanTrackingUrl(url) !== url) ? 'inline-flex' : 'none';

      showPreview();
    } catch (err) {
      showStatus(err.message, 'error');
    } finally {
      setLoading(btnFetch, false, 'Get Info');
    }
  });

  // Download
  btnDown && btnDown.addEventListener('click', async () => {
    const url = currentUrl || urlInput.value.trim();
    if (!url) return showStatus('Paste a URL first.', 'error');

    setLoading(btnDown, true, 'Preparing...');
    showStatus('Downloading... this may take a moment.', 'loading');

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, quality: selectedQuality, platform })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Download failed');
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const nameMatch = disposition.match(/filename="?(.+?)"?$/);
      const fileName = nameMatch ? nameMatch[1] : `download_${Date.now()}.mp4`;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);

      showStatus('✓ Download started!', 'success');
    } catch (err) {
      showStatus(err.message, 'error');
    } finally {
      setLoading(btnDown, false, '⬇ Download');
    }
  });

  // Helpers
  function showPreview() { if (preview) preview.classList.add('visible'); }
  function hidePreview() { if (preview) preview.classList.remove('visible'); }

  function showStatus(msg, type) {
    if (!statusMsg) return;
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg show ${type}`;
  }
  function clearStatus() {
    if (statusMsg) statusMsg.className = 'status-msg';
  }

  function setLoading(btn, loading, label) {
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading
      ? `<span class="spinner"></span> ${label}`
      : label;
  }
}
