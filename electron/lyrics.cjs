'use strict';
/**
 * Synced lyrics from LRCLIB (https://lrclib.net), a free, open lyrics database.
 * Only the track title, artist, album and duration are sent. Results are cached.
 */
const cache = new Map();
const inflight = new Map();

function parseLrc(text) {
  const lines = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d{1,2}):(\d{1,2}(?:\.\d{1,3})?)\]/g)];
    if (!stamps.length) continue;
    const words = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const s of stamps) lines.push({ t: Math.round((Number(s[1]) * 60 + Number(s[2])) * 1000), text: words });
  }
  return lines.sort((a, b) => a.t - b.t);
}

async function request(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Overlay-notch/1.1 (desktop app)' }, signal: AbortSignal.timeout(8000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`LRCLIB ${res.status}`);
  return res.json();
}

async function lookup({ title, artist, album, durationMs }) {
  const q = new URLSearchParams({ track_name: title, artist_name: artist });
  if (album) q.set('album_name', album);
  if (durationMs) q.set('duration', String(Math.round(durationMs / 1000)));
  let hit = await request(`https://lrclib.net/api/get?${q}`).catch(() => null);
  if (!hit) {
    const list = await request(`https://lrclib.net/api/search?${new URLSearchParams({ track_name: title, artist_name: artist })}`).catch(() => null);
    hit = Array.isArray(list) ? list.find((r) => r.syncedLyrics) || list[0] || null : null;
  }
  if (!hit) return { synced: false, lines: [], instrumental: false };
  if (hit.instrumental) return { synced: false, lines: [], instrumental: true };
  if (hit.syncedLyrics) return { synced: true, lines: parseLrc(hit.syncedLyrics), instrumental: false };
  const plain = String(hit.plainLyrics || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return { synced: false, lines: plain.map((text) => ({ t: -1, text })), instrumental: false };
}

/** Resolves lyrics for a track; repeated calls for the same track share one request. */
function getLyrics(track) {
  if (!track || !track.title) return Promise.resolve(null);
  // Video titles like "Artist - Song (Official Video)" need trimming to match.
  const title = String(track.title).replace(/\s*[([][^)\]]*(official|video|audio|lyrics?|visualizer|remaster)[^)\]]*[)\]]/gi, '').trim();
  const artist = String(track.artist || '').replace(/\s*-\s*Topic$/i, '').trim();
  if (!artist) return Promise.resolve(null);
  const key = `${artist}::${title}`.toLowerCase();
  if (cache.has(key)) return Promise.resolve({ key, ...cache.get(key) });
  if (inflight.has(key)) return inflight.get(key);
  const p = lookup({ title, artist, album: track.album, durationMs: track.durationMs })
    .then((r) => { cache.set(key, r); return { key, ...r }; })
    .catch(() => ({ key, synced: false, lines: [], instrumental: false, error: true }))
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

module.exports = { getLyrics, parseLrc };
