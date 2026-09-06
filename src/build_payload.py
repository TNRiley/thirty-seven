#!/usr/bin/env python3
"""Bake the harvested constituents + storm records into one gzip+base64 blob.

An artifact page cannot fetch anything at runtime, so what ships is not a set of
tide curves but the *coefficients* - the page runs the harmonic model itself."""
import base64, glob, gzip, json, math, os, struct, sys, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
RAW  = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', '..')
SCR  = os.environ.get('AMPH_RAW', '/private/tmp/claude-501/-Users-trevor-Development-Claude-Quick-Projects/5592d765-9617-4f53-8913-d8bf3b26c56c/scratchpad')

# the 37 NOAA constituents, fixed order - the page indexes into this
ORDER = ['M2','S2','N2','K1','M4','O1','M6','MK3','S4','MN4','NU2','S6','MU2','2N2','OO1',
         'LAM2','S1','M1','J1','MM','SSA','SA','MSF','MF','RHO','Q1','T2','R2','2Q1','P1',
         '2SM2','M3','L2','2MK3','K2','M8','MS4']

stations = []
for f in sorted(glob.glob(os.path.join(SCR, 'harcon', '*.json'))):
    d = json.load(open(f))
    hc = d.get('HarmonicConstituents') or []
    if not hc:
        continue
    m = {c['name']: c for c in hc}
    if 'M2' not in m:
        continue
    st = d['_station']
    amps, phs = [], []
    for n in ORDER:
        c = m.get(n)
        a = float(c['amplitude']) if c else 0.0
        p = float(c['phase_GMT']) % 360.0 if c else 0.0
        amps.append(min(65535, int(round(a * 1000))))
        phs.append(int(round(p * 100)) % 36000)
    stations.append(dict(id=st['id'], name=st['name'], state=st.get('state') or '',
                         lat=round(st['lat'], 4), lng=round(st['lng'], 4),
                         tz=st.get('timezonecorr'), amps=amps, phs=phs))

# --- storm records: observed water level, and NOAA's own prediction for the same window
EVENTS = [
 ("isabel-dc","8594900","Hurricane Isabel","Washington, DC — 18 Sep 2003",
  "Isabel came ashore in North Carolina and pushed the whole Chesapeake north. In Washington "
  "the model called for a quiet 0.8 ft high water. The Potomac reached 8.7 ft, put the "
  "Georgetown waterfront under water and closed the Mall."),
 ("isabel-annap","8575512","Hurricane Isabel","Annapolis, MD — 18 Sep 2003",
  "The same storm 30 miles up the bay, and the reason Annapolis City Dock has a flood gauge. "
  "Six feet of water that the moon had nothing to do with."),
 ("sandy-battery","8518750","Hurricane Sandy","The Battery, New York — 29 Oct 2012",
  "The surge peaked within an hour of a spring high tide. Nine and a third feet of storm on "
  "top of a tide that was already high is the difference between a wet night and a flooded "
  "subway system."),
 ("ian-stpete","8726520","Hurricane Ian","St. Petersburg, FL — 28 Sep 2022",
  "The famous one that runs backwards. Ian's winds blew the water out of Tampa Bay faster "
  "than the tide could fill it: nearly six feet BELOW prediction, with people walking on the "
  "bottom of the bay."),
 ("bomb-boston","8443970","The 4 January 2018 bomb cyclone","Boston, MA",
  "A 3.4 ft surge landing on an already large spring tide. Boston's highest water on record "
  "at the time - the harbour came up Long Wharf and into the Aquarium station."),
 ("katrina-dauphin","8735180","Hurricane Katrina","Dauphin Island, AL — 29 Aug 2005",
  "Five and a half feet of surge on the clean side of the storm, and then the record stops: "
  "this is what a gauge looks like when the water goes over it."),
 ("frontal-galv","8771450","The February 2021 freeze","Galveston Pier 21, TX",
  "Not a hurricane. A continental cold front with enough north wind behind it to hold two "
  "feet of extra water against the Texas coast for three days."),
 ("quiet-dc","8594900","An ordinary week","Washington, DC — August 2026",
  "The control. No storm, no front: the model and the river agree to within a few inches for "
  "seven days running. This is what the other panels are being measured against."),
]

def series(path, key):
    d = json.load(open(path))
    if key not in d:
        return None
    out = []
    for r in d[key]:
        v = r.get('v', '')
        out.append(None if v in ('', '-') else float(v))
    t0 = d[key][0]['t']
    return t0, out

events = []
for slug, sid, title, where, blurb in EVENTS:
    po = os.path.join(SCR, 'events', slug + '.water_level.json')
    pp = os.path.join(SCR, 'events', slug + '.predictions.json')
    if not (os.path.exists(po) and os.path.exists(pp)):
        print('  skip (missing)', slug); continue
    o = series(po, 'data'); p = series(pp, 'predictions')
    if not o or not p:
        print('  skip (no data)', slug); continue
    t0, obs = o; _, noaa = p
    n = min(len(obs), len(noaa))
    enc = lambda xs: [(-32768 if x is None else max(-32000, min(32000, int(round(x*1000))))) for x in xs[:n]]
    events.append(dict(slug=slug, station=sid, title=title, where=where, blurb=blurb,
                       t0=t0, step=6, obs=enc(obs), noaa=enc(noaa)))
    print(f'  {slug:16s} {n:5d} samples from {t0}')

payload = dict(order=ORDER, stations=stations, events=events,
               built=datetime.date.today().isoformat())
raw = json.dumps(payload, separators=(',', ':')).encode()
gz  = gzip.compress(raw, 9)
b64 = base64.b64encode(gz).decode()
open(os.path.join(HERE, 'payload.b64'), 'w').write(b64)
print(f'stations {len(stations)}  events {len(events)}')
print(f'json {len(raw)/1e6:.2f} MB -> gzip {len(gz)/1e6:.2f} MB -> base64 {len(b64)/1e6:.2f} MB')
