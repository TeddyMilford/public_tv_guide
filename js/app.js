import {
  WEEKDAYS, parseWatchlist, mergeItems, buildSpan, startOfWeek, addDays,
  isoDate, parseIsoDate, formatTime, longDate, channelForLane, DEFAULT_CHANNEL_TIMES,
} from './guide.js';
import { SAMPLE_CSV, SAMPLE_SHOW } from './sample.js';
import { THEMES, themeById } from './themes.js';

// The clip's src is assigned only when the gate is showing, so desktop never fetches
// the 1MB file. It is an animated WebP rather than a video because autoplay policies
// and Low Power Mode can block video playback.
const phone = window.matchMedia('(max-width: 52rem)');
const clip = document.querySelector('#gate-clip');
const armClip = () => {
  if (!phone.matches || clip.getAttribute('src')) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  clip.src = still ? clip.dataset.still : clip.dataset.src;
};
armClip();
phone.addEventListener('change', armClip);

const STORAGE_KEY = 'tv-guide-v3';
const SAMPLE_SHOW_ID = 'sample-show';
const CHANNEL_COUNT = 3;   // fixed at three
const $ = sel => document.querySelector(sel);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const defaultNights = () => WEEKDAYS.map(() => ({ enabled: true, filter: '', theme: '' }));
const nightsForBuild = () => state.nights.map(n => ({ ...n, times: state.channels }));

function load() {
  const base = {
    items: [], appointments: [], nights: defaultNights(), watched: [],
    channels: [...DEFAULT_CHANNEL_TIMES], showTimes: true, spanWeeks: 4,
    salt: '', weekStart: isoDate(startOfWeek(new Date())), isSample: false,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      ...base,
      ...saved,
      nights: saved.nights?.length === 7 ? saved.nights : base.nights,
      channels: saved.channels?.length === CHANNEL_COUNT ? saved.channels : base.channels,
    };
  } catch {
    return base;
  }
}

let state = load();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Settings could not be saved:', err);
  }
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID()
  : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

const weekStartDate = () => startOfWeek(parseIsoDate(state.weekStart));
const listingsPerWeek = () =>
  state.nights.filter(n => n.enabled).length * state.channels.length;
const unwatchedFilms = () => state.items.filter(i => i.type === 'movie' && !state.watched.includes(i.key));

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toMinutes = t => {
  const [h, m] = String(t || '21:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const shortDate = d => longDate(d).replace(/,.*$/, '');

// ---------------------------------------------------------------- importing

function loadSample() {
  const { items } = parseWatchlist(SAMPLE_CSV);
  state.items = items;
  state.isSample = true;
  if (!state.appointments.length) {
    state.appointments = [{ ...SAMPLE_SHOW, id: SAMPLE_SHOW_ID, weekly: true, anchorWeek: state.weekStart }];
  }
  save();
  renderAll();
}

function ingest(text, label) {
  const { source, items } = parseWatchlist(text);
  if (!items.length) {
    $('#list-status').textContent =
      `No titles found in ${label}. Export again from Letterboxd (Settings, Data, Export) or IMDb (list, Export).`;
    return;
  }
  if (state.isSample) {
    // Replace the sample rather than merging real titles into it.
    state.items = [];
    state.appointments = state.appointments.filter(a => a.id !== SAMPLE_SHOW_ID);
    state.isSample = false;
  }
  state.items = mergeItems(state.items, items);
  save();
  renderAll();
  $('#list-status').textContent =
    `${items.length} titles read from ${label} (${source === 'imdb' ? 'IMDb' : 'Letterboxd'} export).`;
  $('#step-shows').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

// ---------------------------------------------------------------- rendering

function listingHtml(entry, { live = true } = {}) {
  const watched = live && entry.kind === 'movie' && state.watched.includes(entry.key);
  // The cross-off has its own column so striking a film does not reflow the listing.
  const off = live && entry.kind === 'movie'
    ? `<button type="button" class="l-off" data-watch="${escapeHtml(entry.key)}"
        title="${watched ? 'Put back' : 'Cross off'} ${escapeHtml(entry.title)}"
        aria-label="${watched ? 'Put back' : 'Cross off'} ${escapeHtml(entry.title)}">${
        watched ? '+' : '\u00d7'}</button>`
    : '<span></span>';
  return `<p class="listing${watched ? ' watched' : ''}">
    <span class="l-time">${formatTime(entry.minutes)}</span>
    <span class="l-chan">${entry.channel}</span>
    <span class="l-txt"><b class="l-head">${escapeHtml(entry.headline)}</b> ${escapeHtml(entry.body)}</span>
    ${off}
  </p>`;
}

function emptyHtml(time, channel, note) {
  return `<p class="listing empty">
    <span class="l-time">${formatTime(toMinutes(time))}</span>
    <span class="l-chan">${channel}</span>
    <span class="l-txt">${note}</span>
    <span></span>
  </p>`;
}

function nightHtml(day, opts) {
  const theme = day.theme ? `<span class="theme-tag">${escapeHtml(day.theme)}</span>` : '';
  const bar = `<h4 class="night-head">${day.label}, ${shortDate(day.date)}${theme}</h4>`;
  if (day.dark) {
    return `<div class="night-block dark">${bar}<p class="listing empty">
      <span></span><span></span><span class="l-txt">Nothing on.</span><span></span></p></div>`;
  }
  const films = day.lanes.map(lane => (lane.entry
    ? listingHtml(lane.entry, opts)
    : emptyHtml(lane.time, lane.channel, 'Nothing scheduled.'))).join('');
  const shows = day.shows.map(s => listingHtml(s, opts)).join('');
  return `<div class="night-block">${bar}${films}${shows}</div>`;
}

function weekHtml(guide) {
  return `<section class="week">
    <h3 class="week-head"><span class="mark">TV Guide</span>${guide.weekLabel}</h3>
    ${guide.days.map(d => nightHtml(d, { live: true })).join('')}
  </section>`;
}

// Two weeks per spread, left and right, matching the print layout.
function spreadsHtml(weeks) {
  const out = [];
  for (let i = 0; i < weeks.length; i += 2) {
    out.push(`<div class="spread">${weeks.slice(i, i + 2).map(weekHtml).join('')}</div>`);
  }
  return out.join('');
}

function renderSheet(span) {
  $('#span-label').textContent = span.label;
  $('#guide').classList.toggle('no-times', !state.showTimes);
  $('#guide').innerHTML = spreadsHtml(span.weeks);
  $('#foot-span').textContent = span.label;
  $('#foot-count').textContent =
    `${span.listings} listings, ${span.titles} of ${span.poolSize} films used`;
}

// One night from the sample list, shown under the importer before anything is loaded.
function renderSampleNight() {
  const { items } = parseWatchlist(SAMPLE_CSV);
  const nights = WEEKDAYS.map((_, i) => ({ enabled: i === 0, filter: '', theme: i === 0 ? 'Sunday Night Movie' : '', times: DEFAULT_CHANNEL_TIMES }));
  const week = buildSpan({
    start: startOfWeek(new Date()),
    weeks: 1,
    items,
    appointments: [{ ...SAMPLE_SHOW, id: 'sample-card', weekly: true }],
    nights,
    watched: [],
    salt: 'card',
  }).weeks[0];
  $('#sample-night').innerHTML = `<div class="week">${nightHtml(week.days[0], { live: false })}</div>`;
}

function renderThemes() {
  $('#themes').innerHTML = THEMES.map((st) => {
    const on = state.nights[st.day].theme === st.label;
    return `<button type="button" class="theme${on ? ' on' : ''}" data-theme="${st.id}" aria-pressed="${on}">
      <span class="theme-name">${escapeHtml(st.label)}</span>
      <span class="theme-note">${WEEKDAYS[st.day]}. ${escapeHtml(st.note)}</span>
    </button>`;
  }).join('');
}

function renderPrintNote(span) {
  const pages = Math.ceil(span.weeks.length / 2);
  $('#print-note').textContent =
    `${span.weeks.length} week${span.weeks.length === 1 ? '' : 's'}, two to a page: ${
      pages} page${pages === 1 ? '' : 's'} of ${span.listings} listings. ${span.label}.`;
}

function renderClaim() {
  const pool = unwatchedFilms().length;
  const perWeek = listingsPerWeek() || 1;
  const weeks = Math.floor(pool / perWeek);
  const runs = weeks >= 1
    ? `${weeks} week${weeks === 1 ? '' : 's'} before it repeats`
    : 'less than one week before it repeats';
  $('#claim').textContent = state.isSample
    ? `Sample list: ${pool} films, ${perWeek} listings a week, ${runs}.`
    : `${pool} unwatched films, ${perWeek} listings a week, ${runs}.`;
  // Loading the sample would discard a real list, so hide the offer once one exists.
  $('#sample-line').hidden = state.items.length > 0;
}

function renderSettings() {
  $('#channels').innerHTML = state.channels.map((time, lane) => `<div class="channel" data-channel="${lane}">
    <span class="l-chan">${channelForLane(lane)}</span>
    <input type="time" value="${time}" data-field="time" aria-label="Channel ${channelForLane(lane)} start time">
  </div>`).join('');

  $('#nights').innerHTML = WEEKDAYS.map((day, i) => {
    const n = state.nights[i];
    return `<div class="night${n.enabled ? '' : ' off'}" data-night="${i}">
      <label><input type="checkbox" data-field="enabled" ${n.enabled ? 'checked' : ''}>${day}</label>
      <input type="text" name="filter" data-field="filter" value="${escapeHtml(n.filter)}"
        placeholder="lean: horror, Kubrick, noir" aria-label="${day} lean">
      <span class="night-theme">${n.theme ? escapeHtml(n.theme) : ''}</span>
    </div>`;
  }).join('');

  $('#appt-list').innerHTML = state.appointments.length
    ? state.appointments.map(a => `<li>
        <span>${escapeHtml(a.title)}
          <span class="appt-meta">${escapeHtml(a.network || 'no network')} &middot; ${
            a.weekly === false
              ? `once, week of ${shortDate(parseIsoDate(a.anchorWeek))}`
              : `every ${WEEKDAYS[a.day]}`} at ${formatTime(toMinutes(a.time))} &middot; ${a.runtime} min${
            a.rerun ? ` &middot; rerun ${WEEKDAYS[a.rerun.day]} at ${formatTime(toMinutes(a.rerun.time))}` : ''}</span>
        </span>
        <button type="button" class="link" data-remove="${a.id}">Remove</button>
      </li>`).join('')
    : `<li class="empty">No shows added.</li>`;

  $('#series-suggestions').innerHTML = state.items
    .filter(i => i.type === 'series')
    .map(s => `<option value="${escapeHtml(s.title)}"></option>`).join('');

  const films = state.items.filter(i => i.type === 'movie').length;
  const series = state.items.length - films;
  if (!$('#list-status').textContent || $('#list-status').dataset.auto === '1') {
    $('#list-status').dataset.auto = '1';
    $('#list-status').textContent = state.items.length
      ? `${films} films${series ? ` and ${series} series` : ''} in the list, ${state.watched.length} crossed off.`
      : 'No list loaded.';
  }
}

function renderAll() {
  const span = buildSpan({
    start: weekStartDate(),
    weeks: Number(state.spanWeeks) || 4,
    items: state.items,
    appointments: state.appointments,
    nights: nightsForBuild(),
    watched: state.watched,
    salt: state.salt,
  });
  renderSheet(span);
  renderPrintNote(span);
  renderClaim();
  renderThemes();
  renderSettings();
}

// ------------------------------------------------------------------ events

$('#file-input').addEventListener('change', async (ev) => {
  for (const file of ev.target.files) ingest(await file.text(), file.name);
  ev.target.value = '';
});

const drop = $('#drop');
['dragenter', 'dragover'].forEach(t => document.addEventListener(t, (ev) => {
  ev.preventDefault();
  drop.classList.add('hot');
}));
document.addEventListener('dragleave', (ev) => {
  if (ev.relatedTarget === null) drop.classList.remove('hot');
});
document.addEventListener('drop', async (ev) => {
  ev.preventDefault();
  drop.classList.remove('hot');
  for (const file of ev.dataTransfer.files) ingest(await file.text(), file.name);
});

$('#sample-btn').addEventListener('click', () => loadSample());

$('#paste-toggle').addEventListener('click', () => {
  const area = $('#paste-area');
  area.hidden = !area.hidden;
  if (!area.hidden) area.focus();
});

$('#paste-area').addEventListener('change', (ev) => {
  const text = ev.target.value.trim();
  if (!text) return;
  ingest(text, 'pasted text');
  ev.target.value = '';
  ev.target.hidden = true;
});

$('#clear-list-btn').addEventListener('click', () => {
  if (!confirm('Clear the list and everything crossed off? Shows stay.')) return;
  state.items = [];
  state.watched = [];
  state.isSample = false;
  save();
  $('#list-status').dataset.auto = '1';
  renderAll();
});

$('#appt-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const title = String(f.get('title')).trim();
  if (!title) return;
  state.appointments.push({
    id: newId(),
    title,
    network: String(f.get('network')).trim(),
    day: Number(f.get('day')),
    time: String(f.get('time')) || '21:00',
    runtime: Number(f.get('runtime')) || 60,
    weekly: f.get('weekly') === 'on',
    rerun: f.get('hasRerun') === 'on'
      ? { day: Number(f.get('rerunDay')), time: String(f.get('rerunTime')) || '15:00' }
      : null,
    anchorWeek: state.weekStart,
  });
  save();
  ev.target.reset();
  ev.target.elements.time.value = '21:00';
  ev.target.elements.runtime.value = 60;
  ev.target.elements.weekly.checked = true;
  ev.target.elements.hasRerun.checked = false;
  $('#rerun-fields').hidden = true;
  $('#rerun-time-field').hidden = true;
  renderAll();
});

$('#appt-list').addEventListener('click', (ev) => {
  const id = ev.target.dataset.remove;
  if (!id) return;
  state.appointments = state.appointments.filter(a => a.id !== id);
  save();
  renderAll();
});

// These inputs re-render the whole guide on every keystroke, so restore the caret.
function keepFocus(selector, fn) {
  const active = document.activeElement;
  const path = active && active.closest(selector) ? [active.closest(selector), active.dataset.field] : null;
  fn();
  if (!path) return;
  const restored = document.querySelector(
    `${selector}[${path[0].dataset.night !== undefined ? `data-night="${path[0].dataset.night}"`
      : `data-channel="${path[0].dataset.channel}"`}] [data-field="${path[1]}"]`);
  if (restored) {
    restored.focus();
    if (restored.type === 'text') restored.setSelectionRange(restored.value.length, restored.value.length);
  }
}

$('#nights').addEventListener('input', (ev) => {
  const row = ev.target.closest('[data-night]');
  const field = ev.target.dataset.field;
  if (!row || !field) return;
  const night = state.nights[Number(row.dataset.night)];
  night[field] = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
  if (field === 'filter' && night.theme) {
    const st = THEMES.find(x => x.label === night.theme);
    if (st && st.filter !== night.filter) night.theme = '';  // edited by hand, so drop the theme name
  }
  save();
  if (field === 'enabled') renderAll();
  else keepFocus('.night', renderAll);
});

$('#channels').addEventListener('input', (ev) => {
  const row = ev.target.closest('[data-channel]');
  if (!row || ev.target.dataset.field !== 'time') return;
  state.channels[Number(row.dataset.channel)] = ev.target.value;
  save();
  keepFocus('.channel', renderAll);
});

$('#themes').addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-theme]');
  if (!btn) return;
  const st = themeById(btn.dataset.theme);
  if (!st) return;
  const night = state.nights[st.day];
  // One theme per night, so a second pick for the same night replaces the first.
  const clearing = night.theme === st.label;
  night.theme = clearing ? '' : st.label;
  night.filter = clearing ? '' : st.filter;
  if (!clearing) night.enabled = true;
  save();
  renderAll();
});

$('#f-hasrerun').addEventListener('change', (ev) => {
  const on = ev.target.checked;
  $('#rerun-fields').hidden = !on;
  $('#rerun-time-field').hidden = !on;
});

$('#show-times').addEventListener('change', (ev) => {
  state.showTimes = ev.target.checked;
  save();
  renderAll();
});

$('#span-weeks').addEventListener('change', (ev) => {
  state.spanWeeks = Number(ev.target.value);
  save();
  renderAll();
});

document.addEventListener('click', (ev) => {
  const key = ev.target.dataset?.watch;
  if (!key) return;
  state.watched = state.watched.includes(key)
    ? state.watched.filter(k => k !== key)
    : [...state.watched, key];
  save();
  renderAll();
});

const shiftSpan = (steps) => {
  state.weekStart = isoDate(addDays(weekStartDate(), steps * 7 * (Number(state.spanWeeks) || 4)));
  save();
  renderAll();
};
$('#prev-span').addEventListener('click', () => shiftSpan(-1));
$('#next-span').addEventListener('click', () => shiftSpan(1));
$('#this-span').addEventListener('click', () => {
  state.weekStart = isoDate(startOfWeek(new Date()));
  save();
  renderAll();
});
$('#reroll').addEventListener('click', () => {
  state.salt = String(Math.floor(Math.random() * 1e9));
  save();
  renderAll();
});
$('#print-btn').addEventListener('click', () => window.print());

// -------------------------------------------------------------------- init

const dayOptions = (selected) => WEEKDAYS
  .map((d, i) => `<option value="${i}"${i === selected ? ' selected' : ''}>${d}</option>`).join('');
$('#appt-form').elements.day.innerHTML = dayOptions(0);
$('#appt-form').elements.rerunDay.innerHTML = dayOptions(6);
$('#span-weeks').value = String(state.spanWeeks);
$('#show-times').checked = state.showTimes !== false;

renderSampleNight();
if (!state.items.length) loadSample(); else renderAll();
