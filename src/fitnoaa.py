"""Joint least-squares harmonic analysis of NOAA's own 2026 hourly predictions,
so we can compare NOAA's effective (f*A, phase) with ours, constituent by constituent."""
import json, math, sys
import astro
from verify import jd, load_pred, load_harcon
D2R=math.pi/180
sid=sys.argv[1]
pred=load_pred(sid); hc=load_harcon(sid)
names=[n for n in hc if hc[n][0]>0]
jds=[p[0] for p in pred]; y=[p[1] for p in pred]
t0=jds[0]
hrs=[(j-t0)*24.0 for j in jds]
cols=[]
for n in names:
    w=hc[n][2]*D2R
    cols.append([math.cos(w*h) for h in hrs])
    cols.append([math.sin(w*h) for h in hrs])
cols.append([1.0]*len(hrs))
m=len(cols)
A=[[0.0]*m for _ in range(m)]; b=[0.0]*m
for i in range(m):
    ci=cols[i]
    for k in range(i,m):
        ck=cols[k]
        s=0.0
        for a_,b_ in zip(ci,ck): s+=a_*b_
        A[i][k]=s; A[k][i]=s
    b[i]=sum(a_*v for a_,v in zip(ci,y))
# gaussian elimination
for i in range(m):
    p=max(range(i,m), key=lambda r: abs(A[r][i]))
    A[i],A[p]=A[p],A[i]; b[i],b[p]=b[p],b[i]
    piv=A[i][i]
    for r in range(i+1,m):
        f=A[r][i]/piv
        if f:
            for c in range(i,m): A[r][c]-=f*A[i][c]
            b[r]-=f*b[i]
x=[0.0]*m
for i in range(m-1,-1,-1):
    s=b[i]-sum(A[i][c]*x[c] for c in range(i+1,m))
    x[i]=s/A[i][i]
a0=astro.astro(t0)
print(f'{sid}  constituent   NOAA_eff_amp  our_f*A   ratio    NOAA_phase-our_phase(deg)')
out={}
for idx,n in enumerate(names):
    a,bb=x[2*idx],x[2*idx+1]
    amp=math.hypot(a,bb); ph=math.degrees(math.atan2(-bb,a))%360   # y = amp*cos(w t + ph)
    A0,kap,sp=hc[n]
    f,u=astro.node_fu(n,a0)
    ourph=(astro.V(n,a0)+u-kap)%360
    d=(ph-ourph+180)%360-180
    print(f'  {n:5s} {amp:9.4f}  {f*A0:9.4f}  {amp/(f*A0) if f*A0 else 0:6.3f}   {d:+8.2f}')
