// Logic tests for the guide builder. Run: node tests/smoke.mjs
import assert from 'node:assert/strict';
import {
  parseCsv, parseWatchlist, mergeItems, buildGuide, buildSpan, startOfWeek, addDays,
  isoDate, formatTime, channelFor, weekRangeLabel, itemKey,
} from '../js/guide.js';
import { SAMPLE_CSV, SAMPLE_SHOW } from '../js/sample.js';

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (err) { console.error(`FAIL  ${name}\n      ${err.message}`); process.exitCode = 1; }
};

const LANES = ['18:00', '19:00', '20:00'];
const nights = [
  { enabled: true, times: [], filter: '' },            // Sunday is the show's night
  { enabled: true, times: LANES, filter: '' },
  { enabled: true, times: LANES, filter: 'Horror' },
  { enabled: true, times: LANES, filter: '' },
  { enabled: true, times: LANES, filter: '' },
  { enabled: true, times: LANES, filter: '' },
  { enabled: false, times: LANES, filter: '' },        // Saturday off
];

// A pool big enough that four weeks of 15 listings never has to repeat itself.
const bigPool = Array.from({ length: 80 }, (_, i) => ({
  key: itemKey(`Film ${i}`, 1970 + i), title: `Film ${i}`, year: String(1970 + i),
  type: 'movie', genres: ['Drama'], directors: [], runtime: 100, rating: '', url: '', source: 'imdb',
}));
const weekStart = startOfWeek(new Date(2026, 7, 23));
const { items } = parseWatchlist(SAMPLE_CSV);
const appointments = [{ ...SAMPLE_SHOW, id: 'a1', anchorWeek: isoDate(weekStart) }];
const config = { weekStart, items, appointments, nights, watched: [], salt: '' };
const titles = g => g.days.flatMap(d => d.entries.map(e => e.title));

test('csv reader handles quoted commas and escaped quotes', () => {
  const rows = parseCsv('a,b\n"x, y","he said ""hi"""\n');
  assert.deepEqual(rows, [['a', 'b'], ['x, y', 'he said "hi"']]);
});

test('imdb export is detected and typed', () => {
  const parsed = parseWatchlist(SAMPLE_CSV);
  assert.equal(parsed.source, 'imdb');
  assert.equal(parsed.items.filter(i => i.type === 'series').length, 2);
  const leone = parsed.items.find(i => i.title.startsWith('The Good'));
  assert.deepEqual(leone.genres, ['Adventure', 'Western']);
  assert.equal(leone.runtime, 161);
});

test('letterboxd export is detected', () => {
  const csv = 'Date,Name,Year,Letterboxd URI\n2024-02-02,Paris\\, Texas,1984,https://boxd.it/x\n'
    .replace('Paris\\, Texas', '"Paris, Texas"');
  const parsed = parseWatchlist(csv);
  assert.equal(parsed.source, 'letterboxd');
  assert.equal(parsed.items[0].title, 'Paris, Texas');
  assert.equal(parsed.items[0].type, 'movie');
});

test('merging dedupes and keeps known metadata', () => {
  const rich = items[0];
  const thin = { ...rich, genres: [], directors: [], runtime: null, source: 'letterboxd' };
  const merged = mergeItems([rich], [thin]);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].genres, rich.genres);
  assert.equal(merged[0].runtime, rich.runtime);
});

test('same inputs always produce the same week', () => {
  assert.deepEqual(titles(buildGuide(config)), titles(buildGuide(config)));
});

test('a week never books the same film twice', () => {
  const t = titles(buildGuide(config));
  assert.equal(new Set(t).size, t.length);
});

test('disabled nights stay dark', () => {
  const guide = buildGuide(config);
  assert.equal(guide.days[6].dark, true);
  assert.equal(guide.days[6].entries.length, 0);
});

test('every enabled night runs three channels at 6, 7 and 8', () => {
  const monday = buildGuide(config).days[1];
  assert.deepEqual(monday.entries.map(e => e.minutes), [18 * 60, 19 * 60, 20 * 60]);
  assert.deepEqual(monday.entries.map(e => e.channel), [2, 4, 7]);
  assert.deepEqual(monday.lanes.map(l => l.time), LANES);
});

test('a channel keeps the same number every night of the run', () => {
  const span = buildSpan({ ...config, start: weekStart, items: bigPool, weeks: 4 });
  const laneTwo = span.weeks.flatMap(g => g.days.flatMap(d => d.lanes.filter(l => l.lane === 1)));
  assert.equal(new Set(laneTwo.map(l => l.channel)).size, 1);
  assert.equal(laneTwo[0].channel, 4);
});

test('a night can carry more than one show', () => {
  const many = [
    appointments[0],
    { id: 'a2', title: 'Succession', network: 'HBO', day: 0, time: '22:00', runtime: 60, weekly: true },
    { id: 'a3', title: 'Frasier', network: 'NBC', day: 0, time: '20:30', runtime: 30, weekly: true },
  ];
  const sunday = buildGuide({ ...config, appointments: many }).days[0];
  assert.equal(sunday.shows.length, 3);
  assert.deepEqual(sunday.shows.map(s => s.title), ['Frasier', 'The Sopranos', 'Succession']);
});

test('the appointment show lands on its night with a mark', () => {
  const sunday = buildGuide(config).days[0];
  assert.equal(sunday.entries.length, 1);
  assert.equal(sunday.entries[0].title, 'The Sopranos');
  assert.equal(sunday.entries[0].marker, true);
  assert.equal(sunday.entries[0].channel, 5); // HBO
});

test('a show listing carries no season or episode', () => {
  const sunday = buildGuide(config).days[0];
  const body = sunday.shows[0].body;
  assert.ok(!/season|episode/i.test(body), body);
  assert.ok(body.includes('On HBO.'));
  assert.ok(body.includes('55 min.'));
});

test('a month of listings never repeats a film when the list is long enough', () => {
  const span = buildSpan({ ...config, start: weekStart, items: bigPool, weeks: 4 });
  assert.equal(span.weeks.length, 4);
  assert.equal(span.listings, 60);          // 15 listings a week, four weeks
  assert.equal(span.titles, 60);            // all distinct
  assert.equal(span.label, 'August 23–September 19, 2026');
});

test('a short list wraps around instead of leaving nights empty', () => {
  const span = buildSpan({ ...config, start: weekStart, weeks: 4 });
  assert.equal(span.listings, 60);
  assert.ok(span.titles < span.listings);   // 28 films cannot fill 60 listings
  // Wrapping still works through nearly the whole list before doubling back.
  assert.ok(span.titles >= span.poolSize - 2, `only used ${span.titles} of ${span.poolSize}`);
});

test('a rerun airs a second time and is marked (R)', () => {
  const withRerun = [{ ...appointments[0], rerun: { day: 6, time: '15:00' } }];
  const guide = buildGuide({ ...config, appointments: withRerun, nights: nights.map(n => ({ ...n, enabled: true })) });
  const first = guide.days[0].shows;
  const second = guide.days[6].shows;
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.ok(!first[0].rerun);
  assert.ok(second[0].rerun);
  assert.ok(second[0].headline.endsWith('(R)'), second[0].headline);
  assert.equal(second[0].minutes, 15 * 60);
  assert.notEqual(first[0].key, second[0].key);   // crossing one off cannot hide the other
});

test('a show set to run weekly keeps airing, a one-off does not', () => {
  const later = addDays(weekStart, 21);
  const weekly = buildGuide({ ...config, weekStart: later }).days[0];
  assert.equal(weekly.shows.length, 1);

  const once = [{ ...appointments[0], weekly: false }];
  assert.equal(buildGuide({ ...config, appointments: once }).days[0].shows.length, 1);
  assert.equal(buildGuide({ ...config, appointments: once, weekStart: later }).days[0].shows.length, 0);
});

test('a night lean is honored as far as the pool allows', () => {
  const tuesday = buildGuide(config).days[2];
  assert.ok(tuesday.entries.some(e => e.headline.toLowerCase().includes('horror')),
    tuesday.entries.map(e => e.headline).join(' / '));
});

test('an impossible lean falls back instead of leaving the night empty', () => {
  const picky = nights.map((n, i) => (i === 3 ? { ...n, filter: 'zzzz-nope' } : n));
  const wednesday = buildGuide({ ...config, nights: picky }).days[3];
  assert.equal(wednesday.entries.length, 3);
});

test('watched films are not booked again', () => {
  const watched = [items[0].key, items[1].key];
  const t = titles(buildGuide({ ...config, watched }));
  assert.ok(!t.includes(items[0].title) && !t.includes(items[1].title));
});

test('an empty list still yields seven days', () => {
  const guide = buildGuide({ weekStart, items: [], appointments: [], nights, watched: [] });
  assert.equal(guide.days.length, 7);
  assert.equal(guide.scheduled, 0);
});

test('channels air in parallel, so a long film can overrun the next start', () => {
  const friday = buildGuide(config).days[5];
  assert.equal(friday.entries.length, 3);
  const overlapping = friday.entries.some((e, i) => i > 0 && e.minutes < friday.entries[i - 1].endMinutes);
  assert.ok(overlapping, 'three lanes at 6, 7 and 8 should overlap on runtime');
});

test('clock and label formatting reads like a listings page', () => {
  assert.equal(formatTime(20 * 60), '8:00');
  assert.equal(formatTime(12 * 60 + 30), '12:30');
  assert.equal(formatTime(24 * 60 + 47), '12:47 a.m.');
  assert.equal(formatTime(9 * 60 + 5), '9:05 a.m.');
  assert.equal(weekRangeLabel(startOfWeek(new Date(2026, 7, 30))), 'August 30–September 5, 2026');
  assert.equal(channelFor('Netflix'), 8);
  assert.equal(channelFor('Some Local Channel'), channelFor('Some Local Channel'));
});

console.log(`\n${passed} passing`);
