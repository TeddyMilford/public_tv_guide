// Pure scheduling + parsing logic. No DOM access, so it can be unit-tested in node.

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

// ---------------------------------------------------------------- CSV parsing

// Minimal RFC-4180 reader: quoted fields, escaped quotes, embedded newlines.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some(v => v !== '')) rows.push(row);
  return rows;
}

function toObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const o = {};
    headers.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
    return o;
  });
}

const pick = (o, ...names) => {
  for (const n of names) {
    const hit = Object.keys(o).find(k => k.toLowerCase() === n.toLowerCase());
    if (hit && o[hit]) return o[hit];
  }
  return '';
};

export function detectSource(headerRow) {
  const h = headerRow.map(s => s.trim().toLowerCase());
  if (h.some(x => x.includes('letterboxd'))) return 'letterboxd';
  if (h.includes('const') || h.includes('title type') || h.includes('imdb rating')) return 'imdb';
  if (h.includes('name') && h.includes('year')) return 'letterboxd';
  if (h.includes('title')) return 'imdb';
  return 'unknown';
}

const IMDB_MOVIE_TYPES = ['movie', 'video', 'tvmovie', 'tv movie', 'short', 'tvspecial', 'tv special'];

export function itemKey(title, year) {
  return `${String(title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${year || ''}`;
}

// Accepts a Letterboxd or IMDb CSV export and returns normalized titles.
export function parseWatchlist(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { source: 'unknown', items: [] };
  const source = detectSource(rows[0]);
  const items = toObjects(rows).map(o => {
    const title = pick(o, 'Title', 'Name', 'Original Title');
    if (!title) return null;
    const year = (pick(o, 'Year', 'Release Date').match(/\d{4}/) || [''])[0];
    const rawType = pick(o, 'Title Type').toLowerCase().replace(/_/g, '');
    const type = source === 'letterboxd'
      ? 'movie'
      : (!rawType ? 'movie' : (IMDB_MOVIE_TYPES.includes(rawType) ? 'movie' : 'series'));
    const runtime = parseInt(pick(o, 'Runtime (mins)', 'Runtime'), 10);
    return {
      key: itemKey(title, year),
      title,
      year,
      type,
      genres: pick(o, 'Genres').split(',').map(s => s.trim()).filter(Boolean),
      directors: pick(o, 'Directors').split(',').map(s => s.trim()).filter(Boolean),
      runtime: Number.isFinite(runtime) ? runtime : null,
      rating: pick(o, 'IMDb Rating'),
      url: pick(o, 'Letterboxd URI', 'URL'),
      source,
    };
  }).filter(Boolean);

  return { source, items };
}

export function mergeItems(existing, incoming) {
  const byKey = new Map(existing.map(i => [i.key, i]));
  for (const item of incoming) {
    const prior = byKey.get(item.key);
    // Later imports win, but never overwrite known metadata with blanks.
    byKey.set(item.key, prior ? { ...prior, ...Object.fromEntries(
      Object.entries(item).filter(([, v]) => v !== '' && v !== null && !(Array.isArray(v) && !v.length))
    ) } : item);
  }
  return [...byKey.values()];
}

// ------------------------------------------------------------------ determinism

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(list, seed) {
  const out = list.slice();
  const rnd = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ----------------------------------------------------------------------- dates

export function startOfWeek(date, firstDay = 0) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() - firstDay + 7) % 7));
  return d;
}

export function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

const utcOf = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

// Weeks since Sunday 1970-01-04, so the pool advances one notch per real week.
export function weekIndex(weekStart) {
  return Math.round((utcOf(weekStart) - Date.UTC(1970, 0, 4)) / 604800000);
}

export function weeksBetween(from, to) {
  return Math.round((utcOf(to) - utcOf(from)) / 604800000);
}

export function isoDate(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseIsoDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function longDate(d) {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function rangeLabel(from, to) {
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  const head = `${MONTHS[from.getMonth()]} ${from.getDate()}`;
  const tail = sameMonth ? `${to.getDate()}` : `${MONTHS[to.getMonth()]} ${to.getDate()}`;
  return `${head}–${tail}, ${to.getFullYear()}`;
}

export function weekRangeLabel(weekStart) {
  return rangeLabel(weekStart, addDays(weekStart, 6));
}

// -------------------------------------------------------------------- clock

export function parseTime(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm).trim());
  if (!m) return 20 * 60;
  return Math.min(24 * 60 - 1, Number(m[1]) * 60 + Number(m[2]));
}

// TV Guide style: bare number in the evening, explicit a.m./noon otherwise.
export function formatTime(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  if (h24 >= 12 && h24 < 24) return `${h12}:${mm}`;
  return `${h12}:${mm} a.m.`;
}

// ---------------------------------------------------------------- the guide

const NETWORK_CHANNELS = {
  hbo: 5, 'hbo max': 5, max: 5, netflix: 8, hulu: 11, 'disney+': 13, 'apple tv+': 3,
  'prime video': 9, amazon: 9, peacock: 6, paramount: 12, 'paramount+': 12, amc: 10,
  fx: 14, showtime: 15, starz: 16, pbs: 2, bbc: 22, cbs: 2, nbc: 4, abc: 7, fox: 11,
};

export function channelFor(network, fallback = 4) {
  const key = String(network || '').trim().toLowerCase();
  if (NETWORK_CHANNELS[key]) return NETWORK_CHANNELS[key];
  if (!key) return fallback;
  return 20 + (hashString(key) % 60); // stable pseudo-channel for anything else
}

// A film's channel number comes from the lane it airs in, so the same channel number
// means the same start time on every night of the guide.
export const LANE_CHANNELS = [2, 4, 7, 9, 11, 13];
export const channelForLane = lane => LANE_CHANNELS[lane % LANE_CHANNELS.length];

export const DEFAULT_CHANNEL_TIMES = ['18:00', '19:00', '20:00'];

// Each night carries the lane times it airs. Older saved nights stored a film count
// and a single start time, so convert those.
export function nightTimes(cfg = {}) {
  if (Array.isArray(cfg.times)) return cfg.times;
  const n = Number(cfg.slots);
  if (Number.isFinite(n)) return DEFAULT_CHANNEL_TIMES.slice(0, Math.max(0, n));
  return DEFAULT_CHANNEL_TIMES;
}

// A weekly show airs every week from its anchor week. A one-off airs only that week.
export function airsThisWeek(appointment, weekStart) {
  if (appointment.weekly !== false) return true;
  const anchor = appointment.anchorWeek ? parseIsoDate(appointment.anchorWeek) : weekStart;
  return weeksBetween(startOfWeek(anchor), weekStart) === 0;
}

const genreMatch = (item, filter) => {
  const f = filter.trim().toLowerCase();
  if (!f) return true;
  return item.genres.some(g => g.toLowerCase().includes(f))
    || item.title.toLowerCase().includes(f)
    || (item.directors || []).some(d => d.toLowerCase().includes(f));
};

function movieEntry(item, minutes, channel) {
  const runtime = item.runtime || 110;
  // Bodies stay short: two weeks share a printed page.
  const facts = [];
  if (item.directors.length) facts.push(`${item.directors[0]}.`);
  if (item.rating) facts.push(`Rated ${item.rating}.`);
  facts.push(`${runtime} min.`);
  return {
    kind: 'movie',
    key: item.key,
    minutes,
    endMinutes: minutes + runtime,
    channel,
    headline: `MOVIE—${item.genres[0] || 'Feature'}`,
    title: item.title,
    year: item.year,
    body: `"${item.title}"${item.year ? ` (${item.year})` : ''}. ${facts.join(' ')}`,
    runtime,
    marker: false,
  };
}

function showEntry(appointment, minutes, isRerun = false) {
  const runtime = Number(appointment.runtime) || 60;
  const network = appointment.network || '';
  return {
    kind: 'show',
    key: `show:${appointment.id}${isRerun ? ':r' : ''}`,
    rerun: isRerun,
    minutes,
    endMinutes: minutes + runtime,
    channel: channelFor(network),
    // (R) marks a repeat, as the printed guides did.
    headline: `${appointment.title.toUpperCase()}—${appointment.genre || 'Series'}${isRerun ? ' (R)' : ''}`,
    title: appointment.title,
    // No season or episode numbers.
    body: `${network ? `On ${network}. ` : ''}${appointment.note ? `${appointment.note} ` : ''}${runtime} min.`,
    runtime,
    marker: true,
  };
}

/**
 * Build one week of programming. The same inputs always produce the same guide, and
 * the pool advances by one week's worth of slots per calendar week, so nothing
 * repeats until the whole watchlist has been used.
 */
export function buildGuide({ weekStart, items = [], appointments = [], nights = [], watched = [], salt = '' }) {
  const pool = items.filter(i => i.type === 'movie' && !watched.includes(i.key));
  const fingerprint = pool.map(i => i.key).sort().join('|');
  const order = seededShuffle(pool, hashString(fingerprint + salt));

  const totalSlots = nights.reduce((n, cfg) => n + (cfg.enabled ? nightTimes(cfg).length : 0), 0) || 1;
  const wi = weekIndex(weekStart);
  const used = new Set();
  const base = order.length ? (((wi * totalSlots) % order.length) + order.length) % order.length : 0;
  let slot = 0;

  // Each slot owns a fixed position in the shuffled pool (base + slot). A filtered
  // slot can search ahead for a match without moving the shared cursor, which would
  // re-anchor every later night and make consecutive weeks look alike.
  const take = (filter) => {
    const start = order.length ? (base + slot) % order.length : 0;
    for (let pass = 0; pass < (filter ? 2 : 1); pass++) {
      const active = pass === 0 ? filter : '';
      for (let i = 0; i < order.length; i++) {
        const candidate = order[(start + i) % order.length];
        if (used.has(candidate.key)) continue;
        if (active && !genreMatch(candidate, active)) continue;
        used.add(candidate.key);
        slot++;
        return candidate;
      }
    }
    return null;
  };

  const days = WEEKDAYS.map((label, dow) => {
    const date = addDays(weekStart, dow);
    const cfg = nights[dow] || { enabled: true, times: DEFAULT_CHANNEL_TIMES, filter: '' };
    const times = nightTimes(cfg);
    const entries = [];
    const lanes = [];

    if (cfg.enabled) {
      for (const appt of appointments) {
        if (!airsThisWeek(appt, weekStart)) continue;
        if (Number(appt.day) === dow) {
          entries.push(showEntry(appt, parseTime(appt.time || '21:00')));
        }
        const rerun = appt.rerun;
        if (rerun && rerun.day !== '' && Number(rerun.day) === dow) {
          entries.push(showEntry(appt, parseTime(rerun.time || appt.time || '21:00'), true));
        }
      }
      times.forEach((time, lane) => {
        const item = take(cfg.filter || '');
        const entry = item ? movieEntry(item, parseTime(time), channelForLane(lane)) : null;
        lanes.push({ lane, time, minutes: parseTime(time), channel: channelForLane(lane), entry });
        if (entry) entries.push(entry);
      });
    }

    entries.sort((a, b) => a.minutes - b.minutes || a.channel - b.channel);
    if (entries.length && !entries.some(e => e.marker)) entries[0].marker = true;

    return {
      dow,
      label,
      date,
      iso: isoDate(date),
      dateLabel: longDate(date),
      dark: !cfg.enabled,
      theme: cfg.theme || '',
      lanes,
      entries,
      shows: entries.filter(e => e.kind === 'show'),
    };
  });

  return {
    weekStart,
    weekLabel: weekRangeLabel(weekStart),
    poolSize: pool.length,
    scheduled: used.size,
    days,
  };
}

/**
 * A run of consecutive weeks, four by default. Each week is built separately so the
 * pool keeps advancing through the list.
 */
export function buildSpan({ start, weeks = 4, ...rest }) {
  const first = startOfWeek(start);
  const list = [];
  for (let w = 0; w < weeks; w++) {
    list.push(buildGuide({ ...rest, weekStart: addDays(first, w * 7) }));
  }
  const last = addDays(first, weeks * 7 - 1);
  const films = list.flatMap(g => g.days.flatMap(d => d.entries.filter(e => e.kind === 'movie')));
  return {
    start: first,
    end: last,
    weeks: list,
    label: rangeLabel(first, last),
    poolSize: list[0]?.poolSize || 0,
    listings: films.length,
    titles: new Set(films.map(e => e.key)).size,
  };
}
