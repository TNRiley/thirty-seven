"""End-to-end check: do our high/low times match NOAA's published tide table?"""
import json,math,ssl,urllib.request,datetime,sys
import astro
from verify import jd, load_harcon
D2R=math.pi/180
CTX=ssl.create_default_context(cafile='/etc/ssl/cert.pem')
def hilo(sid,b,e):
    u=(f"https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date={b}&end_date={e}"
       f"&station={sid}&product=predictions&datum=MSL&units=english&time_zone=gmt&interval=hilo"
       f"&format=json&application=amphidrome")
    with urllib.request.urlopen(u,timeout=60,context=CTX) as r: d=json.loads(r.read())
    return [(datetime.datetime.strptime(x['t'],'%Y-%m-%d %H:%M'), float(x['v']), x['type']) for x in d['predictions']]
def mylevel(hc,dt,fu,ucorr=0.0,fam=()):
    a=astro.astro(jd(dt)); t=0.0
    for n,(A,k,sp) in hc.items():
        if A==0: continue
        f,u=fu[n]
        if n in fam: u=u+ucorr
        t+=f*A*math.cos((astro.V(n,a)+u-k)*D2R)
    return t
def myextrema(hc,t0,hours,fu,ucorr=0.0,fam=()):
    step=datetime.timedelta(minutes=2); out=[]
    a=mylevel(hc,t0-step,fu,ucorr,fam); b=mylevel(hc,t0,fu,ucorr,fam)
    for i in range(1,int(hours*30)):
        t=t0+i*step; c=mylevel(hc,t,fu,ucorr,fam)
        if (b>=a and b>=c) or (b<=a and b<=c):
            d=a-2*b+c; off=0.5*(a-c)/d if d else 0
            out.append((t-step+off*step, b-0.25*(a-c)*off, 'H' if b>=a and b>=c else 'L'))
        a,b=b,c
    return out
FAM2={'M2','N2','NU2','MU2','2N2','LAM2','L2','MSF','K2','S2','T2','R2','2SM2'}
FAMALL=None
CASES=[('8443970',2003),('8443970',2012),('8443970',2021),('8443970',2026),
       ('8594900',2026),('8771450',2026),('9410170',2012),('8518750',2026)]
for ucorr,fam in [(0.0,()), (-2.4,FAM2), (-2.4,set(astro.DOODSON)), (-1.6,set(astro.DOODSON))]:
    tot=[]; 
    for sid,yr in CASES:
        try: hc=load_harcon(sid)
        except FileNotFoundError: continue
        b=f'{yr}0610'; e=f'{yr}0617'
        try: ref=hilo(sid,b,e)
        except Exception as ex: print('fetch fail',sid,yr,ex); continue
        fu={n:astro.node_fu(n,astro.astro(jd(datetime.datetime(yr,7,2,12)))) for n in hc}
        mine=myextrema(hc,datetime.datetime(yr,6,10),7*24,fu,ucorr,fam if fam else ())
        ds=[]
        for t,v,k in ref:
            best=min(mine,key=lambda m:abs((m[0]-t).total_seconds()))
            if abs((best[0]-t).total_seconds())<4*3600 and best[2]==k:
                ds.append((best[0]-t).total_seconds()/60)
        if ds: tot.append((sid,yr,sum(ds)/len(ds),max(abs(x) for x in ds),len(ds)))
    lab=f'ucorr={ucorr:+.1f} on {"none" if not fam else ("M2 family" if fam is FAM2 else "all")}'
    print(f'--- {lab}')
    for sid,yr,mn,mx,n in tot: print(f'   {sid} {yr}  mean {mn:+6.2f} min   worst {mx:5.2f} min   n={n}')
    if tot: print(f'   OVERALL mean {sum(t[2] for t in tot)/len(tot):+.2f} min')
