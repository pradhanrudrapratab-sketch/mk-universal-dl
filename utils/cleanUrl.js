/**
 * cleanUrl — removes all tracking parameters after "?" in a URL.
 * e.g. https://youtu.be/abc123?si=TRACK&utm_source=share → https://youtu.be/abc123
 *
 * Special case: YouTube watch URLs need ?v= to work, so we preserve only that.
 */
function cleanUrl(rawUrl) {
  try {
    const url = new URL(rawUrl.trim());

    // YouTube watch URLs: keep ?v= only, drop everything else
    if (url.hostname.includes('youtube.com') && url.pathname === '/watch') {
      const videoId = url.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    }

    // All other URLs: strip everything after "?"
    return `${url.protocol}//${url.hostname}${url.pathname}`;
  } catch {
    // If URL parsing fails, return as-is
    return rawUrl;
  }
}

module.exports = { cleanUrl };
