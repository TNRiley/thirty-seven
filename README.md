# 🌊 Thirty-Seven Waves

**Every US tide gauge taken apart into the 37 waves it is made of, and put back together in the browser.**

→ **[Open it](https://tnriley.github.io/thirty-seven/)**

NOAA publishes, for each of its tide gauges, the amplitude and phase of thirty-seven waves — the moon twice a day, the sun, the moon's elliptical orbit, the tilt of the earth, and ten shallow-water distortions that are not astronomy at all. Add them up and you have the tide, for any date, with no measurement of the ocean. This page ships those coefficients for 1,303 gauges and does the adding itself: a map with no coastline in it, where the country appears because the gauges are on the water; an instrument that switches the waves on one at a time so you can watch the tide assemble; and eight days when the sum was wrong, where subtracting the moon from the record leaves the storm — Isabel putting 7.9 ft of unexpected water into the Potomac at Washington, Sandy 9.3 ft at the Battery, Ian pulling 5.8 ft out of Tampa Bay. The model agrees with NOAA's own tide tables to about a minute and a hundredth of a foot, but it did not start there: it was right in 2026 and 90 minutes wrong in 2003, and finding out why meant measuring NOAA's node factors across a full 18.6-year cycle and discovering a single mis-remembered astronomical constant.

## Running it

One self-contained HTML file. No build step, no server, no network access at runtime — open `index.html` in a browser, or serve the directory with any static host.

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Rebuilding it from scratch

[REBUILD.md](REBUILD.md) is written for an LLM with a shell and nothing else: the data sources and their quirks, the processing decisions, the page's structure and interactions, and a table of expected values to check the result against.

## Source

The full build pipeline is in [`src/`](src/), with a README describing how to regenerate the page from scratch.

## Data

- **[NOAA CO-OPS harmonic constituents (37 per station, 1,303 stations)](https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/8594900/harcon.json)** — US Government public domain
- **[NOAA CO-OPS observed water level and official predictions](https://api.tidesandcurrents.noaa.gov/api/prod/datagetter)** — US Government public domain

Every figure on the page is computed from the data shipped with it. Check the page's own methods panel for how each number is derived and where it should not be pushed.

## Built with

vanilla JS, hand-written harmonic tide engine, gzip + DecompressionStream payload, canvas, empirical calibration against NOAA.

## Licence

Code is MIT (see [LICENSE](LICENSE)). Data keeps the licence of its source, listed above.

---

Part of [Quick Projects](https://github.com/TNRiley/quick-projects) — one self-contained thing, built in one session. First published 2026-09-06.
