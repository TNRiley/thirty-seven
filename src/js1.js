<script>
"use strict";
/* ============================================================================
   Thirty-Seven Waves — a harmonic tide engine that runs entirely in the page.
   Nothing is fetched: what ships is 1,303 sets of 37 (amplitude, phase) pairs
   and the astronomy needed to turn them back into water.
   ========================================================================== */
const D2R = Math.PI/180, R2D = 180/Math.PI;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const mod = (x,m) => ((x%m)+m)%m;

/* ---------- theme (applied pre-paint, host-independent) ---------- */
(function(){
  let t="auto"; try{ t = localStorage.getItem("t37-theme") || "auto"; }catch(e){}
  if(t!=="auto") document.documentElement.setAttribute("data-theme",t);
  addEventListener("DOMContentLoaded",()=>{
    $$("#themeseg button").forEach(b=>{
      b.setAttribute("aria-pressed", String(b.dataset.t===t));
      b.onclick=()=>{
        t=b.dataset.t;
        try{ localStorage.setItem("t37-theme",t); }catch(e){}
        if(t==="auto") document.documentElement.removeAttribute("data-theme");
        else document.documentElement.setAttribute("data-theme",t);
        $$("#themeseg button").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.t===t)));
        redrawAll();
      };
    });
    const pe=$("#pebtn");
    let on=false; try{ on = localStorage.getItem("t37-pe")==="1"; }catch(e){}
    const apply=()=>{ document.body.classList.toggle("pe",on); pe.setAttribute("aria-pressed",String(on)); };
    apply();
    pe.onclick=()=>{ on=!on; try{ localStorage.setItem("t37-pe",on?"1":"0"); }catch(e){} apply(); };
  });
})();

/* ---------- the 37 constituents ---------- */
/* Doodson numbers (tau, s, h, p, N', p1) and a phase offset in multiples of 90 deg.
   Validated against NOAA's own published predictions - see the methods section. */
const DOODSON = {
 M2:[2,0,0,0,0,0,0],    S2:[2,2,-2,0,0,0,0],   N2:[2,-1,0,1,0,0,0],   K1:[1,1,0,0,0,0,1],
 M4:[4,0,0,0,0,0,0],    O1:[1,-1,0,0,0,0,-1],  M6:[6,0,0,0,0,0,0],    MK3:[3,1,0,0,0,0,1],
 S4:[4,4,-4,0,0,0,0],   MN4:[4,-1,0,1,0,0,0],  NU2:[2,-1,2,-1,0,0,0], S6:[6,6,-6,0,0,0,0],
 MU2:[2,-2,2,0,0,0,0],  "2N2":[2,-2,0,2,0,0,0],OO1:[1,3,0,0,0,0,1],   LAM2:[2,1,-2,1,0,0,2],
 S1:[1,1,-1,0,0,0,2],   M1:[1,0,0,1,0,0,1],    J1:[1,2,0,-1,0,0,1],   MM:[0,1,0,-1,0,0,0],
 SSA:[0,0,2,0,0,0,0],   SA:[0,0,1,0,0,0,0],    MSF:[0,2,-2,0,0,0,0],  MF:[0,2,0,0,0,0,0],
 RHO:[1,-2,2,-1,0,0,-1],Q1:[1,-2,0,1,0,0,-1],  T2:[2,2,-3,0,0,1,0],   R2:[2,2,-1,0,0,-1,2],
 "2Q1":[1,-3,0,2,0,0,-1],P1:[1,1,-2,0,0,0,-1], "2SM2":[2,4,-4,0,0,0,0],M3:[3,0,0,0,0,0,2],
 L2:[2,1,0,-1,0,0,2],   "2MK3":[3,-1,0,0,0,0,-1],K2:[2,2,0,0,0,0,0],  M8:[8,0,0,0,0,0,0],
 MS4:[4,2,-2,0,0,0,0]
};
const SPEED = {M2:28.984104,S2:30,N2:28.43973,K1:15.041069,M4:57.96821,O1:13.943035,M6:86.95232,
 MK3:44.025173,S4:60,MN4:57.423832,NU2:28.512583,S6:90,MU2:27.968208,"2N2":27.895355,OO1:16.139101,
 LAM2:29.455626,S1:15,M1:14.496694,J1:15.5854435,MM:0.5443747,SSA:0.0821373,SA:0.0410686,
 MSF:1.0158958,MF:1.0980331,RHO:13.471515,Q1:13.398661,T2:29.958933,R2:30.041067,"2Q1":12.854286,
 P1:14.958931,"2SM2":31.015896,M3:43.47616,L2:29.528479,"2MK3":42.92714,K2:30.082138,M8:115.93642,
 MS4:58.984104};

function astroAt(jd){
  const T=(jd-2415020.0)/36525.0;
  const s =270.8842+481267.8906*T+0.0020*T*T;   // see the note in astro.py: the
  // classical epoch is 270.4342; the extra 0.45 deg is calibrated against NOAA 2003-2032
  const h =280.1895+ 36000.7689*T+0.000303*T*T;
  const p =334.3853+  4069.0340*T-0.0103*T*T;
  const N =259.1568-  1934.1420*T+0.0021*T*T;
  const p1=281.2208+     1.7192*T+0.00045*T*T;
  const hour=(jd-Math.floor(jd-0.5)-0.5)*24.0;
  return {tau:mod(15*hour+h-s,360), s:mod(s,360), h:mod(h,360), p:mod(p,360),
          N:mod(N,360), p1:mod(p1,360)};
}
function V(name,a){
  const d=DOODSON[name];
  return mod(d[0]*a.tau+d[1]*a.s+d[2]*a.h+d[3]*a.p-d[4]*a.N+d[5]*a.p1+d[6]*90, 360);
}
/* Node factor f and node phase u.
   The f series are Schureman's. The xi / nu series are NOT the textbook ones: they were
   re-derived by measuring NOAA's own effective node phase at four gauges across a full
   18.6-year node cycle and solving the four identities that connect them —
     u(M2)=2xi-2nu, u(O1)=2xi-nu, u(J1)=-nu, u(OO1)=-2xi-nu.
   L2 and M1 additionally swing with lunar perigee, and keep Schureman's R and Q. */
function nodeFU(a){
  const Nd=a.N*D2R;
  const sN=Math.sin(Nd), s2N=Math.sin(2*Nd), s3N=Math.sin(3*Nd);
  const cN=Math.cos(Nd), c2N=Math.cos(2*Nd), c3N=Math.cos(3*Nd);
  const xi   = (11.87 *sN - 1.25 *s2N)*D2R;
  const nu   = (12.95 *sN - 1.30 *s2N)*D2R;
  const nup  = ( 8.88 *sN - 0.67 *s2N)*D2R;   // K1
  const nup2 = ( 8.865*sN - 0.345*s2N)*D2R;   // K2
  const fM2=1.0004-0.0373*cN+0.0002*c2N;
  const fO1=1.0089+0.1871*cN-0.0147*c2N+0.0014*c3N;
  const fK1=1.0060+0.1150*cN-0.0088*c2N+0.0006*c3N;
  const fK2=1.0241+0.2863*cN+0.0083*c2N-0.0015*c3N;
  const fJ1=1.0129+0.1676*cN-0.0170*c2N+0.0016*c3N;
  const fOO=1.1027+0.6504*cN+0.0317*c2N-0.0014*c3N;
  const fMM=1.0000-0.1300*cN+0.0013*c2N;
  const fMF=1.0429+0.4135*cN-0.0040*c2N;
  const uM2=2*(xi-nu)*R2D, uO1=(2*xi-nu)*R2D, uK1=-nup*R2D, uK2=-2*nup2*R2D,
        uJ1=-nu*R2D, uOO=(-2*xi-nu)*R2D;
  const om=23.452*D2R, ii=5.145*D2R;
  const I=Math.acos(Math.cos(ii)*Math.cos(om)-Math.sin(ii)*Math.sin(om)*Math.cos(Nd));
  const th=Math.pow(Math.tan(I/2),2), P=a.p*D2R-xi;
  const Ra=Math.sqrt(Math.max(1e-9,1-12*th*Math.cos(2*P)+36*th*th));
  const Rp=Math.atan2(Math.sin(2*P),1/(6*th)-Math.cos(2*P))*R2D;
  const ci2=Math.cos(I/2);
  const Qa=Math.sqrt(Math.max(1e-9,0.25+1.5*Math.cos(I)*Math.cos(2*P)/(ci2*ci2)
            +2.25*Math.cos(I)*Math.cos(I)/Math.pow(ci2,4)));
  const Qp=Math.atan2(Math.sin(2*P),1/(3*th)+Math.cos(2*P))*R2D;
  return {
   M2:[fM2,uM2],S2:[1,0],N2:[fM2,uM2],NU2:[fM2,uM2],MU2:[fM2,uM2],"2N2":[fM2,uM2],
   LAM2:[fM2,uM2],T2:[1,0],R2:[1,0],"2SM2":[fM2,-uM2],K2:[fK2,uK2],
   L2:[fM2*Ra,uM2-Rp],M3:[Math.pow(fM2,1.5),1.5*uM2],
   K1:[fK1,uK1],O1:[fO1,uO1],P1:[1,0],Q1:[fO1,uO1],"2Q1":[fO1,uO1],RHO:[fO1,uO1],
   J1:[fJ1,uJ1],OO1:[fOO,uOO],S1:[1,0],M1:[fO1*Qa,uO1-Qp],
   MM:[fMM,0],MF:[fMF,-2*xi*R2D],MSF:[fM2,uM2],SA:[1,0],SSA:[1,0],
   M4:[fM2*fM2,2*uM2],M6:[Math.pow(fM2,3),3*uM2],M8:[Math.pow(fM2,4),4*uM2],
   MN4:[fM2*fM2,2*uM2],MS4:[fM2,uM2],S4:[1,0],S6:[1,0],
   MK3:[fM2*fK1,uM2+uK1],"2MK3":[fM2*fM2*fK1,2*uM2-uK1]
  };
}
const jdOf = ms => ms/86400000 + 2440587.5;
/* NOAA freezes f and u for a whole calendar year; matching that convention is worth
   about a third of the residual (0.237 ft -> 0.164 ft rms at Boston). */
const fuCache = new Map();
function fuForYear(y){
  if(!fuCache.has(y)) fuCache.set(y, nodeFU(astroAt(jdOf(Date.UTC(y,6,2,12)))));
  return fuCache.get(y);
}
/* args[i] = f_i*cos(V_i+u_i) and f_i*sin(V_i+u_i): identical for every station, so it is
   computed once per instant and every gauge is then a dot product. */
function argsAt(ms, order, fu){
  const a=astroAt(jdOf(ms)), n=order.length;
  const ca=new Float64Array(n), sa=new Float64Array(n);
  for(let i=0;i<n;i++){
    const nm=order[i], q=fu[nm], ang=(V(nm,a)+q[1])*D2R;
    ca[i]=q[0]*Math.cos(ang); sa[i]=q[0]*Math.sin(ang);
  }
  return {ca,sa};
}
</script>
