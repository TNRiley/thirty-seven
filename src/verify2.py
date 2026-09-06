import json, math, sys, datetime
import astro
from verify import jd, load_pred, load_harcon
D2R=math.pi/180
MID = jd(datetime.datetime(2026,7,2,12,0))     # middle of the prediction year
for sid in sys.argv[1:]:
    pred=load_pred(sid); hc=load_harcon(sid)
    jds=[p[0] for p in pred]; obs=[p[1] for p in pred]
    amid=astro.astro(MID)
    fu={n:astro.node_fu(n,amid) for n in hc}
    mine=[]
    for j in jds:
        a=astro.astro(j); tot=0.0
        for name,(A,kappa,sp) in hc.items():
            if A==0: continue
            f,u=fu[name]
            tot += f*A*math.cos((astro.V(name,a)+u-kappa)*D2R)
        mine.append(tot)
    n=len(obs); bias=sum(o-m for o,m in zip(obs,mine))/n
    rms=math.sqrt(sum((o-m-bias)**2 for o,m in zip(obs,mine))/n)
    sd=math.sqrt(sum((o-sum(obs)/n)**2 for o in obs)/n)
    print(f'{sid}  frozen-at-midyear  rms={rms:.4f} ft  bias={bias:+.4f}  sd={sd:.3f}  skill={1-rms**2/sd**2:.5f}')
