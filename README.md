# TV Guide

Turns a Letterboxd or IMDb watchlist into a printable month of television. Two
movies a night, two weeks to a page.

You already picked these films. This decides which night each one is on.

One page, no build step, no framework. Plain HTML, one stylesheet, four ES modules.

Desktop only. Under 52rem the page is replaced by a clip of Ron Swanson at a computer
and a line telling you to go and use one. The clip is `img/swanson.webp`, 1.0MB,
converted from a 10.4MB gif, and `js/app.js` assigns its `src` only when the gate is
on screen, so desktop never requests it.

## Running it

    python3 -m http.server 8000    # then open http://localhost:8000
    node tests/smoke.mjs           # 25 assertions on parsing, rotation, slots, clock, dates

The modules use `import`, so `file://` will not work without a server.

## The flow

Five steps down one page: load the watchlist, add the shows you follow, pick a theme
for a night, check the guide, print it. A single sample night sits under the importer
so you can see the format before loading anything.

## How the guide is built

Two movies run every night, by default at 8 and 10: the feature and the late movie.
The count is fixed at two; the times are editable. Two is a decision somebody made for
you, where three is a grid. A channel keeps its number for the whole run, so Channel 4
is always the late slot. Films overlap when a runtime crosses the next start time,
which is what parallel channels do.

Unwatched films are shuffled once into a stable order seeded by the list itself, so
reloading gives back the same month. Each night's channels draw from a fixed window of
that order, and the window advances by one week's worth of listings every calendar
week. Nothing repeats until the list has been used up. Seven nights times two channels
is 14 listings a week, so a 140 film watchlist runs ten weeks before it repeats. The
footer reports how much of the list a given span actually used.

Adding a show is a title and nothing else. The guide picks the night and the time,
because a show you have to schedule is a show you talk yourself out of. It goes out at
seven on a night you are likely to be home — Sunday through Thursday, never Friday or
Saturday evening — and nights fill before times do, so the second show gets its own
night rather than crowding the first. Past five shows the grid stacks to 7:30, then 8
and 8:30.

Every show is weekly and every show carries a repeat, Saturday afternoon from one
o'clock, marked `(R)`. Saturday afternoon is both the classic slot and the one place
in the week that always falls after the premiere, so the repeat is a real second
chance rather than a preview. There are no season or episode numbers.

`Move` in the show list steps a show to the next free night, which is one click rather
than a form. `js/guide.js` holds the grid as `SHOW_SLOTS` and `RERUN_SLOTS`.

Themes (`js/themes.js`) filter one night to a genre and print their name in that
night's band: Sunday Night Movie, Sunday Scaries, Noir Monday, Comedy Tuesday, Western
Wednesday, Thriller Thursday, Friday Night Fright, Saturday Matinee. One per night.
Editing that night's filter by hand clears the theme name.

A night can also carry a filter of your own: a genre, a director, or a word in the
title. The scheduler searches forward from that channel's position for the first match
and falls back to anything rather than leaving a slot empty.

Start times can be hidden. The channels stay, the clock goes.

Crossing a film off removes it from the pool permanently, using the small times sign at
the right of a listing. Reshuffle re-seeds the order. The span runs from one week to
eight and defaults to four.

## Printing

Two weeks to a page, one on the left half and the next on the right, which is how the
spread also reads on screen. Four weeks prints as two pages, letter portrait, 11mm
margins, listings at 8pt. Only the guide prints; the five steps, the toolbar and the
footnotes are suppressed.

The styling is cheap to print. Day bands are bold caps between two rules rather than
solid reversed bars, and channel numbers are outlined boxes rather than filled squares.
Measured on the three-channel layout this replaced, that took mean ink coverage on page
one from 15.1 percent to 6.9 percent. Two movies a night prints lighter again.

## Files

`js/guide.js` holds the logic and touches no DOM: the CSV reader, Letterboxd and IMDb
normalizing, the seeded shuffle, the scheduler, the channel lanes, and the clock and
date formatting. That is what `tests/smoke.mjs` exercises.

`js/app.js` is the page: state, localStorage, rendering, events. `js/themes.js` holds
the theme definitions. `js/sample.js` is the demo list and its Sunday show.

`index.html` is everything, including the printable spread. `styles.css` holds the
tokens at the top.

## Design

The page chrome is neutral: white `#ffffff`, ink `#111111`, muted `#6b6b6b`, rules
`#d8d8d8`, system UI sans.

The guide is set like a printed listings page. Condensed faces (`Arial Narrow` and its
fallbacks) for times, channel numbers, day bands and the `MOVIE-Crime` heads; Georgia
for the bodies; one accent, `#c8102e`, on the masthead mark, the theme name and the
cross-off on hover. The repeating element is the channel bullet, a small outlined box,
which is what lets parallel channels read in a column this narrow. Each listing
is a four-column grid, so bodies hang under themselves and the cross-off does not
reflow the line above.

No web fonts, no CDN, no images inside the guide.

`img/` holds the phone gate's clip and its poster frame, and nothing else.

## GitHub Pages

Push to `main`, then Settings, Pages, deploy from branch `main`, folder root.
