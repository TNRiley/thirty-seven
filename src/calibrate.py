"""Measure NOAA's effective node phase u for every constituent, at three stations, across a
full 18.6-year node cycle, by least-squares fitting NOAA's own published predictions."""
import json,math,ssl,urllib.request,datetime,os,sys
import astro
from verify import jd, load_harcon
D2R=math.pi/180
CTX=ssl.create_default_context(cafile='/etc/ssl/cert.pem')
def hourly(sid,b,e):
    u=(f"https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date={b}&end_date={e}"
       f"&station={sid}&product=predictions&datum=MSL&units=english&time_zone=gmt&interval=h"
       f"&format=json&application=amphidrome")
    for attempt in range(3):
        try:
            with urllib.request.urlopen(u,timeout=120,context=CTX) as r: d=json.loads(r.read())
            return [(datetime.datetime.strptime(x['t'],'%Y-%m-%d %H:%M'), float(x['v'])) for x in d['predictions']]
        except Exception as ex:
            if attempt==2: raise
def solve(A,b):
    m=len(b)
    for i in range(m):
        p=max(range(i,m),key=lambda r:abs(A[r][i])); A[i],A[p]=A[p],A[i]; b[i],b[p]=b[p],b[i]
        piv=A[i][i]
        for r in range(i+1,m):
            f=A[r][i]/piv
            if f:
                for c in range(i,m): A[r][c]-=f*A[i][c]
                b[r]-=f*b[i]
    x=[0.0]*m
    for i in range(m-1,-1,-1):
        x[i]=(b[i]-sum(A[i][c]*x[c] for c in range(i+1,m)))/A[i][i]
    return x
STATIONS=['8443970','8771450','9410170','8518750']
YEARS=list(range(2004,2034,2))
out={}
for sid in STATIONS:
    hc=load_harcon(sid)
    names=[n for n in hc if hc[n][0]>0.002 and n in astro.DOODSON]
    out[sid]={'names':names,'years':{}}
    for yr in YEARS:
        try: ref=hourly(sid,f'{yr}0101',f'{yr}0815')
        except Exception as ex: print('FAIL',sid,yr,ex,flush=True); continue
        dts=[r[0] for r in ref]; y=[r[1] for r in ref]
        t0=jd(dts[0]); hrs=[(jd(d)-t0)*24 for d in dts]
        cols=[]
        for n in names:
            w=hc[n][2]*D2R
            cols.append([math.cos(w*h) for h in hrs]); cols.append([math.sin(w*h) for h in hrs])
        cols.append([1.0]*len(hrs))
        m=len(cols); A=[[0.0]*m for _ in range(m)]; b=[0.0]*m
        for i in range(m):
            ci=cols[i]
            for k in range(i,m):
                s=0.0
                for a_,b_ in zip(ci,cols[k]): s+=a_*b_
                A[i][k]=s; A[k][i]=s
            b[i]=sum(a_*v for a_,v in zip(ci,y))
        x=solve(A,b)
        a0=astro.astro(t0); N=astro.astro(jd(datetime.datetime(yr,7,2,12)))['N']
        row={'N':N}
        for i,n in enumerate(names):
            amp=math.hypot(x[2*i],x[2*i+1]); ph=math.degrees(math.atan2(-x[2*i+1],x[2*i]))%360
            A0,kap,sp=hc[n]
            f,u=astro.node_fu(n,astro.astro(jd(datetime.datetime(yr,7,2,12))))
            unoaa=(ph-(astro.V(n,a0)-kap))%360
            delta=((unoaa-u+180)%360)-180
            row[n]=[round(amp/A0,4), round(((unoaa+180)%360)-180,3), round(delta,3), round(amp,4)]
        out[sid]['years'][yr]=row
        print(sid,yr,'ok',flush=True)
json.dump(out,open('calib.json','w'))
print('DONE',flush=True)
