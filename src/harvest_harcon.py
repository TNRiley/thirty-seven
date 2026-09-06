#!/usr/bin/env python3
"""Harvest NOAA CO-OPS harmonic constituents for every station that publishes them.
One file per station so a blocked or killed run resumes (lesson from the Unforced Error build)."""
import json, os, ssl, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(HERE, 'harcon')
CTX  = ssl.create_default_context(cafile='/etc/ssl/cert.pem')   # python.org build has no CA bundle
UA   = {'User-Agent': 'headwaters/amphidrome (tnriley@gmail.com)'}

def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=45, context=CTX) as r:
                return r.read()
        except Exception as e:
            if i == tries - 1:
                raise
            time.sleep(1.5 * (i + 1))

def one(st):
    sid = st['id']
    path = os.path.join(OUT, sid + '.json')
    if os.path.exists(path) and os.path.getsize(path) > 40:
        return 'skip'
    url = ('https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/'
           f'{sid}/harcon.json?units=english&application=headwaters')
    try:
        raw = get(url)
        d = json.loads(raw)
        if 'HarmonicConstituents' not in d:
            d = {'error': d}
        d['_station'] = {k: st.get(k) for k in
                         ('id','name','state','lat','lng','timezone','timezonecorr','tideType','greatlakes')}
        with open(path, 'w') as f:
            json.dump(d, f)
        time.sleep(0.2)
        return 'ok'
    except Exception as e:
        return 'err %s %s' % (sid, e)

LIST = os.path.join(HERE, 'harcon_stations.json')
if not os.path.exists(LIST):                     # ~3.5 MB; fetched rather than committed
    print('fetching station list...', flush=True)
    open(LIST, 'wb').write(get(
        'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=harcon'))
stations = json.load(open(LIST))['stations']
print('stations:', len(stations), flush=True)
n = {'ok': 0, 'skip': 0, 'err': 0}
with ThreadPoolExecutor(max_workers=4) as ex:
    for i, res in enumerate(ex.map(one, stations)):
        key = res if res in n else 'err'
        n[key] += 1
        if res.startswith('err'):
            print(res, flush=True)
        if (i + 1) % 100 == 0:
            print(i + 1, n, flush=True)
print('done', n, flush=True)
