<script>
"use strict";
/* ---------- act III : storms ---------- */
let evIdx=0;
const parseT=s=>Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10),+s.slice(11,13),+s.slice(14,16));
function buildEventTabs(){
  $("#evtabs").innerHTML=EV.map((e,i)=>
    `<button data-i="${i}" aria-pressed="${i===0}">${e.title}<i>${e.where}</i></button>`).join("");
  $$("#evtabs button").forEach(b=>b.onclick=()=>{
    evIdx=+b.dataset.i;
    $$("#evtabs button").forEach(x=>x.setAttribute("aria-pressed",String(+x.dataset.i===evIdx)));
    drawResid();
  });
}
function eventSeries(e){
  const st=ST.find(s=>s.id===e.station);
  const t0=parseT(e.t0), n=e.obs.length, dt=e.step*60000;
  const obs=new Float64Array(n), noaa=new Float64Array(n), ours=new Float64Array(n);
  const fu=fuForYear(new Date(t0).getUTCFullYear());
  for(let i=0;i<n;i++){
    obs[i]  = e.obs[i]===-32768 ? NaN : e.obs[i]/1000;
    noaa[i] = e.noaa[i]===-32768 ? NaN : e.noaa[i]/1000;
    const {ca,sa}=argsAt(t0+i*dt, ORDER, fu);
    let v=0; for(let k=0;k<NC;k++) v+=ca[k]*st.ck[k]+sa[k]*st.sk[k];
    ours[i]=v;
  }
  return {st,t0,dt,n,obs,noaa,ours};
}
function drawResid(){
  const e=EV[evIdx], c=$("#residc"), P=pal(), W=1600,H=560;
  if(c.width!==W||c.height!==H){c.width=W;c.height=H;}
  const x=c.getContext("2d"); x.clearRect(0,0,W,H);
  const S=eventSeries(e);
  let lo=1e9,hi=-1e9;
  for(let i=0;i<S.n;i++){ const a=S.obs[i],b=S.ours[i];
    if(!isNaN(a)){lo=Math.min(lo,a);hi=Math.max(hi,a);} lo=Math.min(lo,b);hi=Math.max(hi,b); }
  const pad=(hi-lo)*.12+.1; lo-=pad; hi+=pad;
  const L=54,R=16,T=26,B=34, px=W-R-L;
  const ymap=axes(x,P,L,R,T,B,W,H,lo,hi,"feet above local mean sea level");
  // residual band
  x.beginPath(); let started=false;
  for(let i=0;i<S.n;i++){ if(isNaN(S.obs[i])) continue;
    const X=L+px*i/(S.n-1); started?x.lineTo(X,ymap(S.obs[i])):(x.moveTo(X,ymap(S.obs[i])),started=true); }
  for(let i=S.n-1;i>=0;i--){ if(isNaN(S.obs[i])) continue; x.lineTo(L+px*i/(S.n-1), ymap(S.ours[i])); }
  x.closePath(); x.fillStyle=P.flood; x.globalAlpha=.20; x.fill(); x.globalAlpha=1;
  // model (dashed) and observation
  x.setLineDash([5,4]); polyOrEnvelope(x,S.ours,L,R,W,ymap,P.sea,1.5); x.setLineDash([]);
  x.strokeStyle=P.ink; x.lineWidth=1.5; x.beginPath(); started=false;
  for(let i=0;i<S.n;i++){ if(isNaN(S.obs[i])){started=false;continue;}
    const X=L+px*i/(S.n-1), Y=ymap(S.obs[i]);
    started?x.lineTo(X,Y):(x.moveTo(X,Y),started=true); }
  x.stroke();
  drawTimeAxis(x,P,L,R,W,H-B,S.t0,S.t0+(S.n-1)*S.dt, (S.n*S.dt)/86400000);
  x.font='500 12px "IBM Plex Sans Condensed",sans-serif';
  x.fillStyle=P.ink; x.fillText("what the gauge recorded", W-R-330, T+2);
  x.fillStyle=P.sea; x.fillText("what the moon called for", W-R-170, T+2);
  // stats
  let peak=-1e9,pi=0,trough=1e9,ti=0,se=0,cnt=0,sn=0,cn=0;
  for(let i=0;i<S.n;i++){
    if(!isNaN(S.obs[i])){ const r=S.obs[i]-S.ours[i];
      if(r>peak){peak=r;pi=i;} if(r<trough){trough=r;ti=i;} se+=r*r; cnt++; }
    if(!isNaN(S.noaa[i])){ sn+=(S.noaa[i]-S.ours[i])**2; cn++; }
  }
  const tstr=i=>new Date(S.t0+i*S.dt).toUTCString().slice(5,22)+" UTC";
  const big=Math.abs(peak)>Math.abs(trough);
  $("#evtiles").innerHTML=
   `<div class="panel tile"><b style="color:var(--flood)">${(big?peak:trough)>=0?"+":""}${(big?peak:trough).toFixed(2)} ft</b>
      <span>${big?"peak surge — water the astronomy did not call for":"peak negative surge — water the wind removed"}</span>
      <p>${tstr(big?pi:ti)}</p></div>
    <div class="panel tile"><b>${peak.toFixed(2)} / ${trough.toFixed(2)} ft</b><span>residual range over the window</span>
      <p>rms residual ${Math.sqrt(se/Math.max(1,cnt)).toFixed(2)} ft across ${cnt.toLocaleString()} six-minute samples.</p></div>
    <div class="panel tile"><b style="color:var(--good)">${Math.sqrt(sn/Math.max(1,cn)).toFixed(3)} ft</b>
      <span>this page's model vs NOAA's own prediction</span>
      <p>Both are shown the same days. The shaded gap above is not this model disagreeing with NOAA — the two agree to this much. It is the ocean disagreeing with astronomy.</p></div>
    <div class="panel tile"><span>${e.where}</span>
      <p style="font-family:var(--serif);font-size:13.5px;margin-top:8px">${e.blurb}</p>
      <p style="margin-top:9px"><a href="https://tidesandcurrents.noaa.gov/stationhome.html?id=${e.station}" target="_blank" rel="noopener">gauge ${e.station} at NOAA →</a></p></div>`;
}

/* ---------- act IV : up the bay ---------- */
const BAY=[
 ["8638863","Chesapeake Bay Bridge Tunnel","the Bay mouth","main"],
 ["8632200","Kiptopeke","Eastern Shore","main"],
 ["8638610","Sewells Point","Norfolk","main"],
 ["8577330","Solomons Island","","main"],
 ["8571421","Bishops Head","","main"],
 ["8575512","Annapolis","","main"],
 ["8574680","Baltimore","","main"],
 ["8635750","Lewisetta","mouth of the Potomac","pot"],
 ["8635150","Colonial Beach","Potomac River","pot"],
 ["8635027","Dahlgren","Potomac River","pot"],
 ["8594900","Washington","the tidal Potomac","pot"],
 ["8579997","Bladensburg","the Anacostia","pot"]
];
const M2PER=360/28.984104;   // 12.4206 h
let bayRows=[];
function buildBay(){
  const base=ST.find(s=>s.id==="8638863");
  /* A phase difference only says where in the cycle a gauge is, not how many cycles have
     passed. Going up the bay the lag is unwrapped: a drop of more than half a period from
     the previous station upstream means another whole tide has gone by, not a jump back. */
  let prev=0;
  bayRows=BAY.map(([id,label,note,grp],i)=>{
    const s=ST.find(t=>t.id===id); if(!s) return null;
    let lag=mod(s.ph[0]-base.ph[0],360)/28.984104;
    if(grp==="pot" && BAY[i-1] && BAY[i-1][3]!=="pot") prev=0;
    while(lag < prev-M2PER/2) lag+=M2PER;
    prev=lag;
    return {s,label,note,grp,lag};
  }).filter(Boolean);
  const dc=bayRows.find(r=>r.s.id==="8594900"), an=bayRows.find(r=>r.s.id==="8575512"),
        bl=bayRows.find(r=>r.s.id==="8579997");
  $("#baytiles").innerHTML=
   `<div class="panel tile"><b>${dc.lag.toFixed(1)} h</b><span>Cape Henry to Washington</span>
      <p>A little over one full tidal cycle (12.42 h). The crest arriving downtown is not the one that
      entered the Bay this morning — it is the one before it, and by the time it gets there the next one
      is already at the mouth.</p></div>
    <div class="panel tile"><b>${dc.s.mean.toFixed(2)} ft <span style="font-size:13px;color:var(--ink3)">vs</span> ${an.s.mean.toFixed(2)} ft</b>
      <span>mean range: Washington vs Annapolis</span>
      <p>The tide shrinks as it travels up the open Bay and then gets <b>bigger</b> again as it climbs the
      Potomac. A funnelling estuary squeezes the same wave into a narrower, shallower channel and it has
      nowhere to go but up. Furthest inland is the largest of all: ${bl.s.mean.toFixed(2)} ft at
      Bladensburg, on the Anacostia.</p></div>
    <div class="panel tile"><span>why this is readable at all</span>
      <p style="font-family:var(--serif);font-size:13.5px">Every gauge publishes its M2 phase against the
      same Greenwich reference, so the travel time between two of them is a subtraction. No model, no
      assumption, no clocks to synchronise — just 21.2° at the Bay mouth and 21.1° at Washington, which is
      359.9° later, which is 12.4 hours.</p></div>`;
}
function drawBay(){
  const c=$("#bayc"), P=pal(), W=1500, H=560;
  if(c.width!==W||c.height!==H){c.width=W;c.height=H;}
  const x=c.getContext("2d"); x.clearRect(0,0,W,H);
  const L=250,R=90,T=34,B=40, px=W-R-L;
  const maxLag=Math.max(13, Math.ceil(Math.max(...bayRows.map(r=>r.lag))+1));
  x.font='400 11px "IBM Plex Mono",monospace';
  for(let h=0;h<=maxLag-1;h+=2){
    const X=L+px*h/maxLag;
    x.strokeStyle=P.grid; x.beginPath(); x.moveTo(X,T-6); x.lineTo(X,H-B); x.stroke();
    x.fillStyle=P.ink3; x.fillText(h+" h", X-8, H-B+16);
  }
  x.fillStyle=P.ink3; x.fillText("hours after high water at the Bay mouth", L, T-16);
  const rowH=(H-T-B)/bayRows.length;
  bayRows.forEach((r,i)=>{
    const y=T+rowH*(i+.5);
    const sel=r.s.i===selected;
    // chart convention: the names of water features are set in italic serif
    x.fillStyle=sel?P.sea:P.ink; x.font=(sel?'italic 500 ':'italic 400 ')+'15px Petrona,Georgia,serif';
    x.textAlign="right"; x.fillText(r.label, L-14, y+4); x.textAlign="left";
    if(r.note){ x.fillStyle=P.ink3; x.font='400 10.5px "IBM Plex Mono",monospace';
      x.fillText(r.note, L-14-x.measureText(r.label).width-0, y+16); }
    const X=L+px*r.lag/maxLag;
    x.strokeStyle=r.grp==="pot"?P.flood:P.sea; x.lineWidth=2.5; x.globalAlpha=.55;
    x.beginPath(); x.moveTo(L,y); x.lineTo(X,y); x.stroke(); x.globalAlpha=1;
    const rad=3+7*Math.sqrt(r.s.mean/3);
    x.beginPath(); x.arc(X,y,rad,0,6.2832);
    x.fillStyle=r.grp==="pot"?P.flood:P.sea; x.fill();
    x.fillStyle=P.ink2; x.font='400 11px "IBM Plex Mono",monospace';
    x.fillText(r.lag.toFixed(1)+" h · "+r.s.mean.toFixed(2)+" ft", X+rad+7, y+4);
  });
  x.fillStyle=P.sea; x.font='500 12px "IBM Plex Sans Condensed",sans-serif';
  x.fillText("up the Bay", L, H-B+30);
  x.fillStyle=P.flood; x.fillText("up the Potomac", L+110, H-B+30);
  x.fillStyle=P.ink3; x.font='400 11px "IBM Plex Mono",monospace';
  x.fillText("dot size = mean tidal range", L+250, H-B+30);
}
</script>
