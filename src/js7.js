<script>
"use strict";
/* ---------- methods ---------- */
function buildMethods(){
  $("#mgrid").innerHTML=`
<section><h3>Where the numbers come from</h3>
<p>NOAA's Center for Operational Oceanographic Products and Services publishes, for each of its tide
gauges, the harmonic constants derived from that gauge's own record — a vector average of five years of
observations, and fifteen years for the two seasonal terms. They are served one station at a time from
<code>mdapi/prod/webapi/stations/&lt;id&gt;/harcon.json</code>, which is linked from no station page and
appears in no bulk download.</p>
<p>The station list carried <b>1,367</b> gauges with published constants. <b>1,303</b> answered;
<b>64</b> returned HTTP 403 and are simply absent here. Everything is US Government public domain.</p></section>

<section><h3>What the page actually computes</h3>
<p>For each constituent <i>i</i> the water level is</p>
<p style="font-family:var(--mono);font-size:13px;background:var(--panel2);padding:10px 12px;border-radius:6px">
h(t) = Σ f<sub>i</sub> · A<sub>i</sub> · cos( V<sub>i</sub>(t) + u<sub>i</sub> − κ<sub>i</sub> )</p>
<p>A and κ are the published amplitude and Greenwich phase. V is the equilibrium argument, built from
six astronomical angles — mean lunar time and the mean longitudes of the moon, the sun, lunar perigee,
the moon's node and solar perigee — combined by each constituent's Doodson numbers. f and u are the
nodal corrections, which swing over the moon's 18.6-year node cycle.</p>
<div class="plain">In ordinary words: the page knows where the moon and the sun are, and it knows how
strongly this particular harbour answers to each of their rhythms. It multiplies the two together and
adds up thirty-seven answers. No measurement of the sea is involved.</div>
<p>The astronomy is identical at every gauge, so it is evaluated once per instant and each of the 1,303
stations is then a 37-term dot product. That is what lets the map animate.</p></section>

<section><h3>How accurate it is, and how I know</h3>
<p>NOAA publishes its own operational predictions from the same constants, so the model can be marked
against the organisation that supplied its inputs. Against a full year of NOAA's hourly predictions:</p>
<p style="font-family:var(--mono);font-size:12.5px;line-height:1.75">
Washington DC · river · rms <b>0.004 ft</b> · skill 0.99998<br>
Galveston Pier 21 · diurnal · rms <b>0.014 ft</b> · skill 0.99946<br>
Boston · semidiurnal, 6.5 ft range · rms <b>0.017 ft</b> · skill 0.99997<br>
San Diego · mixed · rms <b>0.022 ft</b> · skill 0.99985</p>
<p>And against NOAA's published high- and low-water <b>times</b>, which is what a person would actually
check: across four gauges in 2003, 2012, 2021 and 2026, the mean difference is <b>0.2 minutes</b> and
the worst single tide is about two. The Washington tides on this page match NOAA's tide table to the
minute and to a hundredth of a foot.</p></section>

<section><h3>The bug that mattered: it worked in 2026 and nowhere else</h3>
<p>Every check up to this point had been run against a single year, and in that year the model scored
0.998 and looked finished. Marking it against <b>other</b> years broke it open: predictions for 2003 and
2021 were <b>84 and 86 minutes late</b>, for 2012 <b>55 minutes early</b>, and for 2026 four minutes out.
The error was not random. It tracked the longitude of the moon's ascending node, which is to say it was
in the nodal correction — the one part of the model that only reveals itself over eighteen years.</p>
<div class="plain">Testing a prediction against one year is like checking a clock once. It tells you the
clock is right now. It does not tell you whether it is running fast.</div></section>

<section><h3>Finding it: measuring NOAA's node factors across a full cycle</h3>
<p>Rather than re-read the textbook, I measured what NOAA actually does. <code>calibrate.py</code>
fetches 227 days of NOAA's hourly predictions for each of <b>four gauges in each of fifteen years,
2004 to 2032</b> — a complete node cycle — and least-squares fits all 37 constituents to each, which
recovers the effective amplitude factor f and phase u that NOAA applied that year.</p>
<p>The answer was unambiguous. <b>f was already right</b> at the third decimal. <b>u was not</b>, and its
error decomposed into two independent parts.</p></section>

<section><h3>Part one: a single wrong number, 126 years old</h3>
<p>Each constituent's phase error had a constant piece, and those constants were not arbitrary: they
were a <b>linear function of the constituent's Doodson numbers</b>. M2 was out by 12.2°, S2 by nothing,
N2 by 18.8°, K1 by nothing, O1 by 12.7°. Solving that linear system says the error is not in
thirty-seven places but in one — the mean longitude of the moon, wrong by about 6.5°.</p>
<p>It was. The epoch constant in the code read <code>277.0248</code>. The classical Doodson value is
<code>270.4342</code>. The difference, <b>6.59°</b>, is the whole of it: one mis-remembered constant,
invisible in any single year because the model was then re-fitting around it.</p>
<div class="plain">The moon's position is written as "where it was in 1900, plus how far it has gone
since". The "where it was in 1900" part was wrong by about the width of thirteen full moons. Every tide
in the file inherited that.</div></section>

<section><h3>Part two: re-deriving ξ and ν from the measurements</h3>
<p>With the constants removed, the swinging part remained, and it was too large by a factor of about
eighteen. The node phases all descend from two small angles, ξ and ν, through four identities:</p>
<p style="font-family:var(--mono);font-size:12.5px;line-height:1.7">
u(M2) = 2ξ − 2ν · u(O1) = 2ξ − ν · u(J1) = −ν · u(OO1) = −2ξ − ν</p>
<p>Four measured curves, two unknowns — so the system is over-determined and can be checked against
itself. It gives <b>ξ = 11.87 sin N − 1.25 sin 2N</b> and <b>ν = 12.95 sin N − 1.30 sin 2N</b> degrees,
consistent across all four to better than 0.05°. Those are the series in the code, and they are
measured rather than quoted. As a cross-check the compound constituents fall out for free: MK3 should be
u(M2)+u(K1) and measures −11.02° against −11.02° predicted; 2MK3 should be 2u(M2)−u(K1) and measures
+4.61° against +4.60°.</p>
<p>One honest residual: after all of this the model still ran <b>two minutes early</b>, everywhere and in
every year. That last degree is absorbed by a <b>+0.45°</b> adjustment to the same lunar epoch, fitted
across 2003–2032. It is a calibration, not a derivation, and it is marked as such in the source.</p></section>

<section><h3>Two earlier bugs, found the same way</h3>
<p>Before any of that, the residual — NOAA's prediction minus this model — was itself put through a
harmonic analysis at the same 37 speeds, which turns "it is a bit wrong" into a named list. Five
constituents came back with a residual of almost exactly <b>twice</b> their own amplitude: J1, OO1, S1,
M1 and M3. A residual of 2A is the signature of a term that is present and <b>inverted</b> — their phase
offsets were 180° out. Nothing else in the fit could have named those five.</p>
<p>L2's residual was 41% of its amplitude — wrong, but not inverted. L2's nodal correction depends on
the longitude of <b>lunar perigee</b> as well as the node, through Schureman's R factor. M1 has the same
complication and takes Schureman's Q. They are the only two of the thirty-seven that do.</p></section>

<section><h3>A third fix that was bookkeeping, not physics</h3>
<p><b>NOAA holds f and u constant for a whole calendar year</b>, computed at its midpoint, rather than
varying them continuously as the node moves. Matching that convention — freezing the nodal corrections
at 2 July of the prediction year — removed about a third of the error that remained at the time.</p>
<div class="plain">Two calculators can both be right about the sky and still disagree, because one of
them rounds at a different moment. Matching the other one's habit is not cheating; it is how you tell
the difference between "my astronomy is wrong" and "we keep the books differently."</div></section>

<section><h3>What this is not</h3>
<ul>
<li>It is <b>not a navigation product</b>. NOAA's official predictions exist, are authoritative, and
should be used for anything that floats.</li>
<li>Harmonic constants are a five-year average. They describe a period, not a year, and they do not know
that a channel has since been dredged.</li>
<li>At strongly diurnal gauges one of the two daily low waters is nearly flat, so its <i>time</i> is
poorly defined even when its height is right — Galveston's worst case is eighteen minutes on a low water
whose curve is level for an hour either side.</li>
<li>Everything is in feet relative to <b>local mean sea level on the current datum epoch</b>. For the
2003 and 2005 storm panels that means a small offset: sea level has risen since, so those events are
measured against a slightly higher zero than the one in force at the time.</li>
<li>Storm surge here is "everything that is not astronomy", which also contains river discharge, seiche,
gauge drift and the model's own error. On these days that error is a fraction of an inch against surges
of five to nine feet.</li>
<li>The Katrina record does not stop because the storm did. That is what a gauge looks like when the
water goes over it.</li></ul></section>

<section><h3>Two things in the data that surprised me</h3>
<p><b>The list is not entirely American.</b> NOAA's harmonic-constants service still carries legacy
international gauges — Balboa in the Canal Zone, Guayaquil, and one filed as "Djkarta" with the 1949
spelling. They are searchable here and deliberately left off the map, which only draws US regions.</p>
<p><b>The smallest tide in the country is a hundredth of a foot.</b> A cluster of Louisiana and Texas
gauges — Rat Bayou, Seadrift, a Texaco dock in Hackberry Bay — publish M2 amplitudes of 0.010 ft. Those
places are tidal in name only; what moves the water there is wind.</p></section>

<section><h3>Reproducing it</h3>
<p>The pipeline ships in <code>src/</code>: <code>harvest_harcon.py</code> (one file per station, so a
blocked run resumes), <code>astro.py</code> (the arguments and node factors), <code>verify.py</code> and
<code>verify2.py</code> (the marking against NOAA), <code>diag.py</code> and <code>fitnoaa.py</code>
(the residual analysis that named the five inverted constituents), <code>calibrate.py</code> (the
node-cycle measurement), <code>timing.py</code> (the tide-table check that exposed the epoch bug),
<code>fetch_events.py</code>, <code>build_payload.py</code> and <code>inject.py</code>. Standard library
only; nothing to install.</p>
<p>One local trap, recorded for the next session: on this machine <code>python3</code> resolves to a
python.org build whose OpenSSL carries no CA bundle, so every <code>urllib</code> HTTPS call dies with
CERTIFICATE_VERIFY_FAILED while <code>curl</code> works. The scripts load
<code>/etc/ssl/cert.pem</code> explicitly.</p></section>`;
}

/* ---------- plain-English inserts ---------- */
const PLAIN=[
 ["Two", "A tide is not one wave. It is thirty-seven simple waves added together, each one a steady rhythm that never changes. The list on the left is those waves, biggest first. Switch one off and you are asking: how much of this harbour's tide was that particular rhythm doing?"],
 ["Three","The prediction knows about the moon and the sun and nothing else. So when the sea does something the prediction did not expect, the difference is everything the moon is not responsible for — mostly wind pushing water against a coast, and low air pressure letting it rise."],
 ["Four","The tide is a wave travelling, like a ripple crossing a pond. It enters the Chesapeake at the ocean and takes most of a day to reach Washington. That is why high tide is at a different time in every town on the bay."],
 ["One", "Each dot is a real instrument in the water, reporting to NOAA. The colour is how high the water is at that instrument at the moment shown on the clock — computed here, not recorded. Watching it move is watching the tide travel."]
];
function insertPlain(){
  $$("section.act").forEach(sec=>{
    const t=(sec.querySelector(".actnum")||{}).textContent||"";
    const hit=PLAIN.find(p=>t.startsWith(p[0]+" ·"));
    if(!hit) return;
    const d=document.createElement("div"); d.className="plain"; d.textContent=hit[1];
    const intro=sec.querySelector(".actintro");
    if(intro) intro.after(d);
  });
}

/* ---------- wiring ---------- */
function wireUI(){
  insertPlain();
  $$("#layers .opt").forEach(b=>b.onclick=()=>{
    mapLayer=b.dataset.layer;
    $$("#layers .opt").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.layer===mapLayer)));
    drawMap();
  });
  $("#playbtn").onclick=()=>{ playing=!playing;
    $("#playbtn").textContent=playing?"⏸ Pause":"▶ Play";
    $("#playbtn").setAttribute("aria-pressed",String(playing)); };
  $("#speed").onchange=e=>{ speed=+e.target.value; };
  $("#timeslider").oninput=e=>{ tOffset=+e.target.value*60; playing=false;
    $("#playbtn").textContent="▶ Play"; drawMap(); };
  $("#nowbtn").onclick=()=>{ baseTime=Date.now(); tOffset=0; $("#timeslider").value=0;
    drawMap(); drawCurve(); selectStation(selected); };
  $("#q").oninput=doSearch;
  const c=$("#mapc");
  c.onmousemove=e=>{ const h=mapHit(e); if(h!==hoverIdx){hoverIdx=h; c.style.cursor=h>=0?"pointer":"default"; drawMap();} };
  c.onmouseleave=()=>{ if(hoverIdx>=0){hoverIdx=-1; drawMap();} };
  c.onclick=e=>{ const h=mapHit(e); if(h>=0){ selectStation(h); drawMap(); } };
  $$("#spanseg button").forEach(b=>b.onclick=()=>{
    spanDays=+b.dataset.d;
    $$("#spanseg button").forEach(x=>x.setAttribute("aria-pressed",String(+x.dataset.d===spanDays)));
    drawCurve();
  });
  $$("#presets button").forEach(b=>b.onclick=()=>{
    const f=PRESETS[b.dataset.p];
    for(let k=0;k<NC;k++) curMask[k]=f(ORDER[k])?1:0;
    buildConstList(); drawCurve(); drawDetail();
  });
  addEventListener("resize",()=>{ clearTimeout(window.__rz);
    window.__rz=setTimeout(redrawAll,150); });
}
function redrawAll(){ if(!DATA) return; drawMap(); drawCurve(); drawDetail(); drawResid(); drawBay(); }

/* ---------- clock ---------- */
let lastFrame=0;
function tick(ts){
  if(playing){
    const dt=lastFrame? Math.min(0.1,(ts-lastFrame)/1000) : 0;
    tOffset+=dt*speed;
    if(tOffset>44640*60) tOffset=0;
    $("#timeslider").value=Math.round(tOffset/60);
  }
  lastFrame=ts;
  drawMap();
  requestAnimationFrame(tick);
}
addEventListener("DOMContentLoaded",()=>{
  boot().then(()=>{ drawResid(); }).catch(e=>{
    document.querySelector(".wrap").insertAdjacentHTML("afterbegin",
      `<div class="panel" style="padding:18px;margin:20px 0;color:var(--warn)">
       This page could not unpack its data: ${e.message}. It needs a browser with
       DecompressionStream (Chrome/Edge 80+, Safari 16.4+, Firefox 113+).</div>`);
  });
});
</script>
