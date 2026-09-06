<script>
"use strict";
/* ---------- shared chart furniture ---------- */
function axes(x,P,L,R,T,B,W,H,yMin,yMax,label){
  x.strokeStyle=P.grid; x.lineWidth=1;
  x.font='400 11px "IBM Plex Mono",monospace'; x.fillStyle=P.ink3;
  const span=yMax-yMin, step=niceStep(span/6);
  for(let v=Math.ceil(yMin/step)*step; v<=yMax+1e-9; v+=step){
    const y=T+(H-T-B)*(1-(v-yMin)/span);
    x.beginPath(); x.moveTo(L,y); x.lineTo(W-R,y); x.stroke();
    x.fillText(v.toFixed(Math.abs(step)<0.5?2:1), 4, y+4);
  }
  if(label){ x.fillText(label, 4, T-8); }
  return v=>T+(H-T-B)*(1-(v-yMin)/span);
}
function niceStep(s){const p=Math.pow(10,Math.floor(Math.log10(s)));const n=s/p;
  return (n<1.5?1:n<3.5?2:n<7.5?5:10)*p;}
function drawTimeAxis(x,P,L,R,W,yBase,t0,t1,days){
  x.fillStyle=P.ink3; x.font='400 11px "IBM Plex Mono",monospace';
  const n=days<=2?8:days<=7?7:days<=31?6:12;
  for(let i=0;i<=n;i++){
    const ms=t0+(t1-t0)*i/n, px=L+(W-R-L)*i/n, d=new Date(ms);
    x.strokeStyle=P.grid; x.beginPath(); x.moveTo(px,yBase); x.lineTo(px,yBase+4); x.stroke();
    const lab = days<=2 ? d.toUTCString().slice(17,22)
              : days<=31 ? d.toUTCString().slice(5,11)
              : d.toUTCString().slice(8,16);
    const w=x.measureText(lab).width;
    x.fillText(lab, Math.min(W-R-w, Math.max(L, px-w/2)), yBase+17);
  }
}
function polyOrEnvelope(x,arr,L,R,W,ymap,color,width){
  const px=W-R-L, n=arr.length;
  x.strokeStyle=color; x.lineWidth=width; x.beginPath();
  if(n<=px*1.2){
    for(let i=0;i<n;i++){ const X=L+px*i/(n-1), Y=ymap(arr[i]); i?x.lineTo(X,Y):x.moveTo(X,Y); }
    x.stroke();
  } else {
    x.fillStyle=color;
    for(let c=0;c<px;c++){
      const a=Math.floor(n*c/px), b=Math.max(a+1,Math.floor(n*(c+1)/px));
      let lo=1e9,hi=-1e9;
      for(let i=a;i<b;i++){ if(arr[i]<lo)lo=arr[i]; if(arr[i]>hi)hi=arr[i]; }
      x.fillRect(L+c, ymap(hi), 1, Math.max(1, ymap(lo)-ymap(hi)));
    }
  }
}

/* ---------- act II curve ---------- */
let spanDays=7;
function drawCurve(){
  const c=$("#curvec"), P=pal(), W=1500,H=520;
  if(c.width!==W||c.height!==H){c.width=W;c.height=H;}
  const x=c.getContext("2d"); x.clearRect(0,0,W,H);
  const st=ST[selected];
  const t0=Math.floor(baseTime/3600000)*3600000, t1=t0+spanDays*86400000;
  const n=Math.min(9000, Math.max(600, Math.round(spanDays*72)));
  const full=series(st,t0,t1,n,null), part=series(st,t0,t1,n,curMask);
  let lo=1e9,hi=-1e9;
  for(let i=0;i<n;i++){ lo=Math.min(lo,full[i],part[i]); hi=Math.max(hi,full[i],part[i]); }
  const pad=(hi-lo)*0.12+0.05; lo-=pad; hi+=pad;
  const L=52,R=14,T=26,B=34;
  const ymap=axes(x,P,L,R,T,B,W,H,lo,hi,"feet above local mean sea level");
  // the gap between your sum and all thirty-seven
  const px=W-R-L;
  x.fillStyle=P.flood; x.globalAlpha=.16; x.beginPath();
  for(let i=0;i<n;i++){ const X=L+px*i/(n-1); i?x.lineTo(X,ymap(full[i])):x.moveTo(X,ymap(full[i])); }
  for(let i=n-1;i>=0;i--){ x.lineTo(L+px*i/(n-1), ymap(part[i])); }
  x.closePath(); x.fill(); x.globalAlpha=1;
  polyOrEnvelope(x,full,L,R,W,ymap,P.ink3,1);
  polyOrEnvelope(x,part,L,R,W,ymap,P.sea,1.9);
  drawTimeAxis(x,P,L,R,W,H-B,t0,t1,spanDays);
  // key
  x.font='500 12px "IBM Plex Sans Condensed",sans-serif';
  x.fillStyle=P.ink3; x.fillText("all thirty-seven", W-R-190, T+2);
  x.fillStyle=P.sea;  x.fillText("your sum", W-R-70, T+2);
  // readouts
  let se=0, sf=0, mf=0;
  for(let i=0;i<n;i++) mf+=full[i]; mf/=n;
  for(let i=0;i<n;i++){ se+=(full[i]-part[i])**2; sf+=(full[i]-mf)**2; }
  const rms=Math.sqrt(se/n), varex=sf>0?1-se/sf:0;
  let used=0; for(let k=0;k<NC;k++) used+=curMask[k];
  $("#roN").textContent=used+" / "+NC;
  $("#roRms").textContent=rms.toFixed(3)+" ft";
  $("#roVar").textContent=(100*Math.max(0,varex)).toFixed(1)+"%";
  let plo=1e9,phi=-1e9; for(let i=0;i<n;i++){plo=Math.min(plo,full[i]);phi=Math.max(phi,full[i]);}
  $("#roRange").textContent=(phi-plo).toFixed(2)+" ft";
}

/* ---------- station card ---------- */
function selectStation(i){
  selected=i; hoverIdx=-1;
  const st=ST[i];
  const tz=(st.tz==null?0:st.tz);
  const fmt=ms=>{const d=new Date(ms+tz*3600000);
    return d.toUTCString().slice(5,7)+" "+d.toUTCString().slice(8,11)+" "+
           String(d.getUTCHours()).padStart(2,"0")+":"+String(d.getUTCMinutes()).padStart(2,"0");};
  const tides=nextTides(st, baseTime, 30, 6);
  $("#stcard").innerHTML=
   `<div><div class="lbl">${st.state||"station"} · ${st.id}</div>
        <div class="sname">${st.name}</div>
        <div class="sloc">${st.lat.toFixed(4)}°, ${st.lng.toFixed(4)}°</div></div>
    <dl class="kv">
      <dt>mean range (2 × M2)</dt><dd>${st.mean.toFixed(2)} ft</dd>
      <dt>spring range</dt><dd>${st.spring.toFixed(2)} ft</dd>
      <dt>great diurnal range</dt><dd>${st.great.toFixed(2)} ft</dd>
      <dt>form factor (K1+O1)/(M2+S2)</dt><dd>${st.F==null?"—":st.F.toFixed(2)}</dd>
      <dt>character</dt><dd>${FORMNAME(st.F)}</dd>
      <dt>M2 phase (Greenwich)</dt><dd>${st.ph[0].toFixed(1)}°</dd>
    </dl>
    <div><div class="lbl" style="margin-bottom:6px">next tides · local standard time</div>
      <div class="tides">${tides.map(t=>
        `<div class="trow"><b class="${t.high?"hi":"lo"}">${t.high?"HIGH":"LOW"}</b>
         <span class="mono">${fmt(t.t)}</span>
         <span class="mono">${t.v>=0?"+":""}${t.v.toFixed(2)} ft</span></div>`).join("")}</div></div>
    <a href="https://tidesandcurrents.noaa.gov/stationhome.html?id=${st.id}" target="_blank" rel="noopener"
       style="font-size:12.5px">NOAA station page for ${st.id} →</a>`;
  buildConstList(); drawCurve(); drawDetail(); drawBay();
}
function doSearch(){
  const q=$("#q").value.trim().toLowerCase(), box=$("#qres");
  if(!q){ box.innerHTML=""; return; }
  const hits=ST.filter(s=>s.name.toLowerCase().includes(q)||
             (s.state||"").toLowerCase()===q||s.id===q).slice(0,60);
  box.innerHTML=hits.map(s=>`<button data-i="${s.i}">${s.name}<br><span>${s.state||"—"} · ${s.id} · range ${s.great.toFixed(1)} ft</span></button>`).join("")
    || `<div style="padding:6px;font-size:12px;color:var(--ink3)">no gauge matches that</div>`;
  box.querySelectorAll("button").forEach(b=>b.onclick=()=>{selectStation(+b.dataset.i); drawMap();});
}
</script>
