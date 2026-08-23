# TV Guide

Turns a Letterboxd or IMDb watchlist into a printable month of television. Three
channels a night, two weeks to a page.

You already picked these films. This decides which night each one is on.

One page, no build step, no framework, no account. Plain HTML, one stylesheet, four
ES modules, nothing loaded over the network.

Desktop only. Under 52rem the page is replaced by a clip of Ron Swanson at a computer
and a line telling you to go and use one. The clip is `img/swanson.webp`, 1.0MB,
converted from a 10.4MB gif, and `js/app.js` assigns its `src` only when the gate is
on screen, so desktop never requests it.

## Running it

    python3 -m http.server 8000    # then open http://localhost:8000
    node tests/smoke.mjs           # 22 assertions on parsing, rotation, clock, dates

The modules use `import`, so `file://` will not work without a server.

## The flow

Five steps down one page: load the watchlist, add the shows you follow, pick a theme
for a night, check the guide, print it. A single sample night sits under the importer
so you can see the format before loading anything.

## How the guide is built

Three channels run every night, by default at 6, 7 and 8. The count is fixed at three;
the times are editable. A channel keeps its number for the whole run, so Channel 4 is
always the 7 o'clock slot. Films overlap when a runtime crosses the next start time,
which is what parallel channels do.

Unwatched films are shuffled once into a stable order seeded by the list itself, so
reloading gives back the same month. Each night's channels draw from a fixed window of
that order, and the window advances by one week's worth of listings every calendar
week. Nothing repeats until the list has been used up. Seven nights times three
channels is 21 listings a week, so a 140 film watchlist runs six weeks before it
repeats. The footer reports how much of the list a given span actually used.

Shows are unlimited: any number, on any night, at any time, several on the same night.
A show runs every week or once on the week you added it, and can carry a rerun on
another night, marked `(R)`. There are no season or episode numbers.

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
Measured on page one of the default four-week guide, mean ink coverage is 6.9 percent,
down from 15.1 percent with the solid bands.

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
which is what lets three parallel channels read in a column this narrow. Each listing
is a four-column grid, so bodies hang under themselves and the cross-off does not
reflow the line above.

No web fonts, no CDN, no images inside the guide.

`img/` holds the phone gate's clip and its poster frame, and nothing else.

## GitHub Pages

Push to `main`, then Settings, Pages, deploy from branch `main`, folder root.
