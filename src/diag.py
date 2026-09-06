import json, math, datetime, sys
import astro
from verify import jd, load_pred, load_harcon, synth
D2R=math.pi/180
sid=sys.argv[1]
pred=load_pred(sid); hc=load_harcon(sid)
jds=[p[0] for p in pred]; obs=[p[1] for p in pred]
mine=synth(hc,jds)
res=[o-m for o,m in zip(obs,mine)]
# harmonic-analyse the residual at each constituent speed (hours from first sample)
t0=jds[0]
rows=[]
for name,(A,kappa,sp) in hc.items():
    w=sp*D2R
    c=s=cc=ss=cs=0.0
    for j,r in zip(jds,res):
        h=(j-t0)*24.0; ang=w*h
        C=math.cos(ang); S=math.sin(ang)
        c+=r*C; s+=r*S; cc+=C*C; ss+=S*S; cs+=C*S
    det=cc*ss-cs*cs
    if abs(det)<1e-9: continue
    a=( c*ss - s*cs)/det; b=( s*cc - c*cs)/det
    amp=math.hypot(a,b)
    rows.append((amp,name,A))
rows.sort(reverse=True)
print(sid, 'residual amplitude by constituent (ft), published amplitude:')
for amp,name,A in rows[:12]:
    print(f'  {name:5s} residual {amp:.4f}   published {A:.3f}   ratio {amp/A if A else float("nan"):.3f}')
