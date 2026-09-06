import json, math, sys, datetime
import astro
D2R = math.pi/180

def jd(dt):
    a=(14-dt.month)//12; y=dt.year+4800-a; m=dt.month+12*a-3
    jdn=dt.day+(153*m+2)//5+365*y+y//4-y//100+y//400-32045
    return jdn + (dt.hour-12)/24 + dt.minute/1440 + dt.second/86400

def load_pred(sid):
    d=json.load(open(f'pred_{sid}_2026.json'))['predictions']
    out=[]
    for r in d:
        t=datetime.datetime.strptime(r['t'],'%Y-%m-%d %H:%M')
        out.append((jd(t), float(r['v'])))
    return out

def load_harcon(sid):
    d=json.load(open(f'harcon/{sid}.json'))
    return {c['name']: (c['amplitude'], c['phase_GMT'], c['speed']) for c in d['HarmonicConstituents']}

def synth(hc, jds, drop=()):
    out=[]
    for j in jds:
        a=astro.astro(j); tot=0.0
        for name,(A,kappa,sp) in hc.items():
            if A==0 or name in drop: continue
            f,u = astro.node_fu(name, a)
            tot += f*A*math.cos((astro.V(name,a)+u-kappa)*D2R)
        out.append(tot)
    return out

for sid in sys.argv[1:]:
    try:
        pred=load_pred(sid); hc=load_harcon(sid)
    except FileNotFoundError as e:
        print('missing',sid,e); continue
    jds=[p[0] for p in pred]; obs=[p[1] for p in pred]
    for drop in ((), ('SA','SSA')):
        mine=synth(hc,jds,drop)
        n=len(obs)
        bias=sum(o-m for o,m in zip(obs,mine))/n
        rms=math.sqrt(sum((o-m-bias)**2 for o,m in zip(obs,mine))/n)
        sd=math.sqrt(sum((o-sum(obs)/n)**2 for o in obs)/n)
        print(f'{sid} drop={str(drop):14} rms={rms:.4f} ft  bias={bias:+.3f}  signal sd={sd:.3f}  skill={1-rms**2/sd**2:.4f}')
