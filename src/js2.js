<script>
"use strict";
/* ---------- payload ---------- */
let DATA=null, ORDER=null, ST=[], EV=[], NC=0;
let selected=0, curMask=null, selConst=0;
let mapLayer="level", playing=true, tOffset=0, speed=1800, baseTime=Date.now();
let mapRegions=[], hoverIdx=-1;

async function boot(){
  const b64 = document.getElementById("payload").textContent.trim();
  const bin = Uint8Array.from(atob(b64), c=>c.charCodeAt(0));
  let json;
  if(typeof DecompressionStream === "function"){
    const ds = new DecompressionStream("gzip");
    const buf = await new Response(new Blob([bin]).stream().pipeThrough(ds)).arrayBuffer();
    json = new TextDecoder().decode(buf);
  } else { throw new Error("no DecompressionStream"); }
  DATA = JSON.parse(json);
  ORDER = DATA.order; NC = ORDER.length;
  ST = DATA.stations.map((s,i)=>{
    const amp=new Float64Array(NC), ph=new Float64Array(NC),
          ck=new Float64Array(NC), sk=new Float64Array(NC);
    for(let k=0;k<NC;k++){
      amp[k]=s.amps[k]/1000; ph[k]=s.phs[k]/100;
      ck[k]=amp[k]*Math.cos(ph[k]*D2R); sk[k]=amp[k]*Math.sin(ph[k]*D2R);
    }
    const M2=amp[0],S2=amp[1],K1=amp[3],O1=amp[5];
    return {i, id:s.id, name:s.name, state:s.state, lat:s.lat, lng:s.lng, tz:s.tz,
            amp, ph, ck, sk, M2, S2, K1, O1,
            F:(M2+S2)>0.02 ? (K1+O1)/(M2+S2) : null,
            mean:2*M2, great:2*(M2+K1+O1), spring:2*(M2+S2)};
  });
  EV = DATA.events;
  const dc = ST.findIndex(s=>s.id==="8594900"); selected = dc>=0?dc:0;
  curMask = new Uint8Array(NC).fill(1);
  $("#builtdate").textContent = DATA.built;
  $("#nst").textContent = ST.length.toLocaleString();
  $("#hnst").textContent = ST.length.toLocaleString();
  $("#hnc").textContent = NC;
  $("#footnums").textContent = ST.length.toLocaleString()+" gauges · "+
      (ST.length*NC).toLocaleString()+" harmonic coefficients · "+EV.length+" storm records";
  $("#mapnote").textContent = ST.length.toLocaleString()+" gauges · click one";
  buildMapRegions(); buildConstList(); buildEventTabs(); buildBay(); buildMethods(); wireUI();
  selectStation(selected);
  tick();
}

/* ---------- prediction ---------- */
function levelAt(st, ms, mask){
  const fu=fuForYear(new Date(ms).getUTCFullYear());
  const {ca,sa}=argsAt(ms, ORDER, fu);
  let v=0;
  for(let k=0;k<NC;k++){ if(mask && !mask[k]) continue; v+=ca[k]*st.ck[k]+sa[k]*st.sk[k]; }
  return v;
}
function series(st, t0, t1, n, mask){
  const out=new Float64Array(n), y0=new Date(t0).getUTCFullYear(), fu=fuForYear(y0);
  for(let j=0;j<n;j++){
    const ms=t0+(t1-t0)*j/(n-1);
    const {ca,sa}=argsAt(ms, ORDER, fu);
    let v=0;
    for(let k=0;k<NC;k++){ if(mask && !mask[k]) continue; v+=ca[k]*st.ck[k]+sa[k]*st.sk[k]; }
    out[j]=v;
  }
  return out;
}
/* extrema of the full model, by scan and parabolic refinement */
function nextTides(st, from, hours, count){
  const step=4*60000, n=Math.ceil(hours*3600000/step), out=[];
  let a=levelAt(st,from-step,null), b=levelAt(st,from,null);
  for(let j=1;j<n && out.length<count;j++){
    const ms=from+j*step, c=levelAt(st,ms,null);
    if((b>=a&&b>=c)||(b<=a&&b<=c)){
      const d=(a-2*b+c), off=d!==0 ? 0.5*(a-c)/d : 0;
      out.push({t:ms-step+off*step, v:b-0.25*(a-c)*off, high:(b>=a&&b>=c)});
    }
    a=b; b=c;
  }
  return out;
}
</script>
