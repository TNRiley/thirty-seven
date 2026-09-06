import json, os, ssl, urllib.request, time
CTX=ssl.create_default_context(cafile='/etc/ssl/cert.pem')
EV=[
 ("isabel-dc",      "8594900","20030916","20030922"),
 ("isabel-annap",   "8575512","20030916","20030922"),
 ("sandy-battery",  "8518750","20121026","20121102"),
 ("ian-stpete",     "8726520","20220926","20221002"),
 ("bomb-boston",    "8443970","20180102","20180108"),
 ("katrina-dauphin","8735180","20050826","20050901"),
 ("katrina-waveland","8747437","20050826","20050901"),
 ("quiet-dc",       "8594900","20260810","20260817"),
 ("frontal-galv",   "8771450","20210213","20210220"),
]
for name,sid,b,e in EV:
    for prod,extra in (("water_level",""),("predictions","&interval=6")):
        url=("https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?"
             f"begin_date={b}&end_date={e}&station={sid}&product={prod}&datum=MSL"
             f"&units=english&time_zone=gmt&format=json&application=amphidrome{extra}")
        try:
            with urllib.request.urlopen(url,timeout=60,context=CTX) as r: raw=r.read()
            d=json.loads(raw)
            key='data' if prod=='water_level' else 'predictions'
            n=len(d.get(key,[])) if key in d else 0
            print(f'{name:18s} {sid} {prod:12s} n={n:5d} {"ERR:"+str(d.get("error")) if "error" in d else ""}')
            open(f'events/{name}.{prod}.json','wb').write(raw)
        except Exception as ex:
            print(name,sid,prod,'FAIL',ex)
        time.sleep(0.3)
