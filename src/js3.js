<script>
"use strict";
/* ---------- palette pulled from CSS so the theme switch is one source of truth ---------- */
function pal(){
  const cs=getComputedStyle(document.documentElement);
  const g=n=>cs.getPropertyValue(n).trim();
  return {ink:g("--ink"),ink2:g("--ink2"),ink3:g("--ink3"),rule:g("--rule"),rule2:g("--rule2"),
          paper:g("--paper"),panel:g("--panel"),panel2:g("--panel2"),sea:g("--sea"),sea2:g("--sea2"),
          ebb:g("--ebb"),flood:g("--flood"),gold:g("--gold"),grid:g("--grid"),good:g("--good")};
}
const hex2rgb=h=>{h=h.replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];};
function mix(a,b,t){const A=hex2rgb(a),B=hex2rgb(b);
  return `rgb(${Math.round(A[0]+(B[0]-A[0])*t)},${Math.round(A[1]+(B[1]-A[1])*t)},${Math.round(A[2]+(B[2]-A[2])*t)})`;}
/* cyclic map for phase: a colour wheel that closes on itself, because 359 deg is next to 1 deg */
const CYC=["#e8b53c","#df7a3a","#c14a63","#8a4f9c","#3f74b4","#3fa79b","#e8b53c"];
function cyc(deg){
  const t=mod(deg,360)/60, i=Math.floor(t);
  return mix(CYC[i], CYC[i+1], t-i);
}
function diverge(t,P){                 // -1 ebb .. 0 slack .. +1 flood
  t=Math.max(-1,Math.min(1,t));
  return t<0 ? mix(P.panel2,P.ebb,-t) : mix(P.panel2,P.flood,t);
}
function seq(t,P){ return mix(P.panel2,P.sea,Math.max(0,Math.min(1,t))); }
const FORMCOL=(F,P)=> F==null?P.ink3 : F<0.25?P.ebb : F<1.5?P.sea : F<3?P.gold : P.flood;
const FORMNAME=F=> F==null?"—" : F<0.25?"semidiurnal" : F<1.5?"mixed, mainly semidiurnal"
                   : F<3?"mixed, mainly diurnal" : "diurnal";

/* ---------- map regions ---------- */
function buildMapRegions(){
  const defs=[
    {k:"conus", label:"Contiguous United States", lon:[-125.8,-66.0], lat:[24.2,49.7], box:[338,16,1244]},
    {k:"ak",    label:"Alaska",                   lon:[-179.9,-129.5],lat:[51.0,71.6], box:[14,16,306]},
    {k:"hi",    label:"Hawaiʻi",             lon:[-160.6,-154.6],lat:[18.7,22.4], box:[14,300,306]},
    {k:"pr",    label:"Puerto Rico & USVI",       lon:[-67.4,-64.5],  lat:[17.5,18.6], box:[14,516,306]}
  ];
  mapRegions=defs.map(d=>{
    const mid=(d.lat[0]+d.lat[1])/2, kx=Math.cos(mid*D2R);
    const wdeg=(d.lon[1]-d.lon[0])*kx, hdeg=d.lat[1]-d.lat[0];
    const w=d.box[2], h=w*hdeg/wdeg;
    return {...d, x:d.box[0], y:d.box[1], w, h, kx, mid};
  });
}
function project(s){
  const lng = s.lng>0 ? s.lng-360 : s.lng;
  for(const r of mapRegions){
    if(lng>=r.lon[0]&&lng<=r.lon[1]&&s.lat>=r.lat[0]&&s.lat<=r.lat[1]){
      const x=r.x + (lng-r.lon[0])*r.kx * r.w/((r.lon[1]-r.lon[0])*r.kx);
      const y=r.y + (r.lat[1]-s.lat) * r.h/(r.lat[1]-r.lat[0]);
      return {x,y,r};
    }
  }
  return null;
}
function mapValue(s, args){
  if(mapLayer==="level"){
    let v=0; for(let k=0;k<NC;k++) v+=args.ca[k]*s.ck[k]+args.sa[k]*s.sk[k];
    return v;
  }
  if(mapLayer==="phase") return s.ph[0];
  if(mapLayer==="range") return s.great;
  return s.F;
}
function drawMap(){
  const c=$("#mapc"), P=pal();
  const W=1600,H=700; if(c.width!==W||c.height!==H){c.width=W;c.height=H;}
  const x=c.getContext("2d");
  x.clearRect(0,0,W,H);
  const now=baseTime+tOffset*1000;
  const fu=fuForYear(new Date(now).getUTCFullYear());
  const args=argsAt(now, ORDER, fu);
  // region frames
  x.font='500 11px "IBM Plex Mono",monospace';
  for(const r of mapRegions){
    x.strokeStyle=P.rule2; x.lineWidth=1;
    x.strokeRect(r.x+.5,r.y+.5,r.w,r.h);
    x.fillStyle=P.ink3;
    x.fillText(r.label.toUpperCase(), r.x+6, r.y+r.h-7);   // land labels stay roman
  }
  const maxRange=Math.max(...ST.map(s=>s.great));
  for(const s of ST){
    const p=project(s); if(!p) continue;
    const v=mapValue(s,args);
    let col, rad;
    if(mapLayer==="level"){ col=diverge(s.great>0.05? 2*v/s.great : 0, P); }
    else if(mapLayer==="phase"){ col=cyc(v); }
    else if(mapLayer==="range"){ col=seq(Math.sqrt(v/maxRange),P); }
    else { col=FORMCOL(v,P); }
    rad = 1.5+3.4*Math.sqrt(Math.min(1, s.great/12));
    if(mapLayer!=="level") rad=1.4+2.6*Math.sqrt(Math.min(1,s.great/12));
    x.beginPath(); x.arc(p.x,p.y,rad,0,6.2832); x.fillStyle=col; x.fill();
  }
  // selection + hover
  for(const idx of [hoverIdx, selected]){
    if(idx<0||idx>=ST.length) continue;
    const p=project(ST[idx]); if(!p) continue;
    x.beginPath(); x.arc(p.x,p.y,7.5,0,6.2832);
    x.strokeStyle=(idx===selected)?P.ink:P.sea; x.lineWidth=(idx===selected)?2:1.5; x.stroke();
  }
  if(hoverIdx>=0 && hoverIdx!==selected){
    const s=ST[hoverIdx], p=project(s);
    if(p){
      const label=s.name+(s.state?"  "+s.state:"");
      x.font='italic 400 15px Petrona,Georgia,serif';
      const w=x.measureText(label).width+14;
      const bx=Math.min(W-w-4,Math.max(4,p.x-w/2)), by=p.y-30;
      x.fillStyle=P.panel; x.strokeStyle=P.rule; x.lineWidth=1;
      x.beginPath(); x.roundRect(bx,by,w,22,5); x.fill(); x.stroke();
      x.fillStyle=P.ink; x.fillText(label,bx+7,by+15);
    }
  }
  // clock + legend
  const d=new Date(now);
  $("#clockread").textContent = d.toUTCString().replace(" GMT"," UTC");
  const lg=$("#lgsw"), stops=[];
  if(mapLayer==="level"){ for(let i=0;i<=10;i++) stops.push(diverge(-1+2*i/10,P));
    $("#lgmin").textContent="low"; $("#lgmax").textContent="high"; }
  else if(mapLayer==="phase"){ for(let i=0;i<=12;i++) stops.push(cyc(i*30));
    $("#lgmin").textContent="0h"; $("#lgmax").textContent="12h25m after"; }
  else if(mapLayer==="range"){ for(let i=0;i<=10;i++) stops.push(seq(i/10,P));
    $("#lgmin").textContent="0 ft"; $("#lgmax").textContent=maxRange.toFixed(0)+" ft"; }
  else { stops.push(P.ebb,P.ebb,P.sea,P.sea,P.gold,P.gold,P.flood,P.flood);
    $("#lgmin").textContent="twice a day"; $("#lgmax").textContent="once a day"; }
  lg.style.background="linear-gradient(90deg,"+stops.join(",")+")";
}
function mapHit(ev){
  const c=$("#mapc"), r=c.getBoundingClientRect();
  const mx=(ev.clientX-r.left)*c.width/r.width, my=(ev.clientY-r.top)*c.height/r.height;
  let best=-1, bd=1e9;
  for(const s of ST){
    const p=project(s); if(!p) continue;
    const d=(p.x-mx)**2+(p.y-my)**2;
    if(d<bd){bd=d;best=s.i;}
  }
  return bd<110 ? best : -1;
}
</script>
