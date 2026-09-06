<script>
"use strict";
/* ---------- what each of the thirty-seven waves actually is ---------- */
const CDESC={
M2:["Principal lunar semidiurnal","The moon, pulling twice a day as the earth turns under it. On most American coasts this single wave is the majority of the tide, and on some it is almost all of it."],
S2:["Principal solar semidiurnal","The sun doing the same job, on a clock of exactly 12 hours. Its slow beat against M2 is spring and neap tides — nothing more exotic than two waves drifting in and out of step over a fortnight."],
N2:["Larger lunar elliptic semidiurnal","A correction for the moon's orbit being an ellipse rather than a circle. When the moon is nearest, the tide is larger; N2 is how that is written as a wave."],
K1:["Lunisolar diurnal","Once a day, arising because the earth is tilted and the moon and sun are usually not over the equator. Where K1 and O1 grow large enough to beat M2, a coast gets one tide a day instead of two."],
M4:["First overtide of M2","Not astronomy at all. In shallow water a tide wave travels faster at its crest than in its trough, so the wave distorts — the flood comes in quicker than the ebb goes out. M4 is that distortion."],
O1:["Lunar diurnal","The moon's once-a-day term, from the same tilt that produces K1. Together they are the reason the Gulf of Mexico has a single daily tide while the Atlantic has two."],
M6:["Second overtide of M2","More shallow-water distortion, three cycles for every one of M2. It shows up in rivers and long estuaries and almost nowhere else."],
MK3:["Shallow-water terdiurnal","M2 and K1 interfering in shallow water and producing a wave at the sum of their speeds. A signature of a shoaling estuary."],
S4:["Overtide of S2","The solar equivalent of M4, and usually tiny."],
MN4:["Shallow-water quarter diurnal","M2 and N2 interacting in shallow water."],
NU2:["Larger lunar evectional","The sun tugging on the moon's orbit, changing its eccentricity through the month. Ptolemy noticed the effect; here it is as a tide."],
S6:["Third overtide of S2","Very small, and mostly a sign of a gauge in a confined basin."],
MU2:["Variational","Another perturbation of the moon's orbit by the sun, this one in the moon's speed along it."],
"2N2":["Second-order lunar elliptic","A finer correction for the shape of the moon's orbit."],
OO1:["Second-order lunar diurnal","A small diurnal term that swings hard with the moon's node — its node factor varies by more than a factor of two across the 18.6-year cycle."],
LAM2:["Smaller lunar evectional","A small companion to NU2."],
S1:["Solar diurnal","Exactly one cycle per day. Much of what gauges record here is not tide at all but the daily rhythm of sea breeze and solar heating."],
M1:["Smaller lunar elliptic diurnal","Small, and awkward: like L2 it needs a node factor that depends on lunar perigee as well as the node."],
J1:["Smaller lunar elliptic diurnal","A diurnal partner to N2's job of accounting for the moon's elliptical orbit."],
MM:["Lunar monthly","27.55 days — the moon's distance cycle showing up not as a tide you can see but as a slow rise and fall of mean level."],
SSA:["Solar semiannual","Half a year. Sea level responds to the seasons twice over, through heating and through the shift of prevailing winds."],
SA:["Solar annual","The seasonal cycle of sea level: water expands when it is warm and piles up where the wind puts it. At many gauges this is the largest term after the tide itself, and it is not astronomy — it is climate, wearing a tide's clothing."],
MSF:["Lunisolar synodic fortnightly","The fortnight of the spring–neap cycle, appearing directly in mean level."],
MF:["Lunisolar fortnightly","13.66 days — the moon crossing the equator and back."],
RHO:["Larger lunar evectional diurnal","A small diurnal evectional term."],
Q1:["Larger lunar elliptic diurnal","The diurnal counterpart of N2, and the largest of the small diurnal constituents on most coasts."],
T2:["Larger solar elliptic","The earth's orbit is an ellipse too. T2 and R2 are the correction."],
R2:["Smaller solar elliptic","The other half of the correction for the earth's elliptical orbit."],
"2Q1":["Second-order elliptic diurnal","Very small."],
P1:["Solar diurnal","The sun's once-a-day term. P1 travels so close to K1 that separating the two takes about six months of record."],
"2SM2":["Shallow-water semidiurnal","A compound of the solar and lunar semidiurnal tides in shallow water."],
M3:["Lunar terdiurnal","A genuine astronomical third-diurnal term, distinct from the shallow-water ones. Small everywhere."],
L2:["Smaller lunar elliptic semidiurnal","The troublemaker. Its node factor depends on lunar perigee as well as the moon's node, and getting that wrong leaves a visible error in the sum — it did here."],
"2MK3":["Shallow-water terdiurnal","Two parts M2 against one part K1, in shallow water."],
K2:["Lunisolar semidiurnal","Travels with S2 and is usually about a quarter of it; separating them also takes about six months of record."],
M8:["Fourth overtide of M2","The last and smallest of the shallow-water overtides NOAA carries."],
MS4:["Shallow-water quarter diurnal","M2 and S2 combining in shallow water."]};
const GROUP={};
["M2","S2","N2","NU2","MU2","2N2","LAM2","L2","T2","R2","K2"].forEach(n=>GROUP[n]="semidiurnal");
["K1","O1","P1","Q1","2Q1","RHO","J1","M1","OO1","S1"].forEach(n=>GROUP[n]="diurnal");
["MM","MF","MSF","SA","SSA"].forEach(n=>GROUP[n]="long period");
["M4","M6","M8","MK3","2MK3","MN4","MS4","S4","S6","2SM2"].forEach(n=>GROUP[n]="shallow water");
GROUP["M3"]="terdiurnal";
const PRESETS={
  m2:n=>n==="M2", ms:n=>n==="M2"||n==="S2",
  big4:n=>["M2","S2","N2","K1"].includes(n),
  astro:n=>GROUP[n]!=="shallow water",
  shallow:n=>GROUP[n]==="shallow water",
  all:()=>true, none:()=>false
};

function buildConstList(){
  const box=$("#clist"); box.innerHTML="";
  const st=ST[selected];
  const idx=[...Array(NC).keys()].sort((a,b)=>st.amp[b]-st.amp[a]);
  const mx=Math.max(...st.amp);
  const head=document.createElement("div");
  head.className="lbl"; head.style.padding="4px 7px 9px";
  head.textContent="thirty-seven waves · sorted by size at this gauge";
  box.appendChild(head);
  idx.forEach(k=>{
    const n=ORDER[k], b=document.createElement("button");
    b.className="crow"+(curMask[k]?" on":" off")+(k===selConst?" sel":"");
    b.dataset.k=k;
    b.innerHTML=`<span class="chk"></span><span class="cname">${n}</span>`+
      `<span class="cbar"><i style="width:${mx>0?100*st.amp[k]/mx:0}%"></i></span>`+
      `<span class="camp">${st.amp[k].toFixed(3)}</span>`;
    b.title=CDESC[n]?CDESC[n][0]:n;
    b.onclick=e=>{
      if(e.shiftKey || e.target.classList.contains("cname")){ selConst=k; }
      else { curMask[k]=curMask[k]?0:1; selConst=k; }
      buildConstList(); drawCurve(); drawDetail();
    };
    box.appendChild(b);
  });
}
function drawDetail(){
  const st=ST[selected], k=selConst, n=ORDER[k], d=CDESC[n]||[n,""];
  const per=360/SPEED[n], P=pal();
  const hrs=per<48? per.toFixed(2)+" hours" : (per/24).toFixed(2)+" days";
  $("#cdetail").innerHTML=
   `<div><div class="lbl">${GROUP[n]}</div><div class="dname">${n}</div></div>
    <div class="lbl">${d[0]}</div>
    <div class="ddesc">${d[1]}</div>
    <canvas id="wavec" width="600" height="150"></canvas>
    <dl class="kv">
      <dt>amplitude here</dt><dd>${st.amp[k].toFixed(3)} ft</dd>
      <dt>phase (Greenwich)</dt><dd>${st.ph[k].toFixed(1)}°</dd>
      <dt>speed</dt><dd>${SPEED[n].toFixed(6)} °/h</dd>
      <dt>period</dt><dd>${hrs}</dd>
      <dt>share of this tide</dt><dd>${(100*st.amp[k]/st.amp.reduce((a,b)=>a+b,0)).toFixed(1)}%</dd>
      <dt>in the sum now</dt><dd>${curMask[k]?"yes":"no"}</dd>
    </dl>
    <div class="lbl">click a row to switch a wave on or off · shift-click to inspect without toggling</div>`;
  const c=$("#wavec"), x=c.getContext("2d");
  x.clearRect(0,0,600,150);
  x.strokeStyle=P.rule2; x.beginPath(); x.moveTo(0,75); x.lineTo(600,75); x.stroke();
  x.strokeStyle=curMask[k]?P.sea:P.ink3; x.lineWidth=1.6; x.beginPath();
  const cycles=Math.min(4, Math.max(1.5, 3));
  for(let i=0;i<=600;i++){
    const y=75-58*Math.cos(2*Math.PI*cycles*i/600);
    i?x.lineTo(i,y):x.moveTo(i,y);
  }
  x.stroke();
  x.fillStyle=P.ink3; x.font='400 10px "IBM Plex Mono",monospace';
  x.fillText(cycles+" periods of "+n, 6, 14);
}
</script>
