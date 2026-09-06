# src — how Thirty-Seven Waves was built

Standard library only. `python3` on the build machine is a python.org build with no CA bundle,
so every script loads `/etc/ssl/cert.pem` explicitly; `/usr/bin/python3` also works.

```
harvest_harcon.py   1,367 stations -> harcon/<id>.json, one file each so a run resumes
fetch_events.py     observed water level + NOAA predictions for the storm windows
astro.py            equilibrium arguments (Doodson numbers) and node factors f, u
verify.py/verify2.py   mark the model against a year of NOAA's hourly predictions
diag.py             harmonic analysis OF THE RESIDUAL - named the 5 inverted constituents
fitnoaa.py          joint least squares of NOAA's predictions, per constituent
calibrate.py        4 gauges x 15 years (2004-2032) -> NOAA's own effective f and u
timing.py           high/low times vs NOAA's published tide table - found the epoch bug
build_payload.py    -> payload.b64  (gzip + base64, inflated in the browser)
inject.py           template.html + js1..js7 + payload -> ../index.html
```

Order: `harvest_harcon.py` → `fetch_events.py` → `build_payload.py` → `inject.py`.

`calib.json` and `ufit.json` are the measured node factors and the fitted xi/nu series that
came out of them — the evidence behind the constants in `astro.py`.
