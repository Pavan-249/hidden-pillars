// ── Graph engine ──────────────────────────────────────────────────────────────
let pulledId=null, activePillarId=PILLARS[0].id;
const GW=()=>document.getElementById("graph-wrap").clientWidth||1100;
const GH=()=>document.getElementById("graph-wrap").clientHeight||600;

// Build node + link arrays
function buildGraph(){
  const nodes=[
    ...PILLARS.map(p=>({id:p.id,type:"pillar",data:p})),
    ...BRIDGES.map(b=>({id:b.id,type:"bridge",data:b})),
    ...PRODUCTS.map(p=>({id:p.id,type:"product",data:p}))
  ];
  const links=[];
  BRIDGES.forEach(b=>{
    b.pillars.forEach(pid=>links.push({source:pid,target:b.id,kind:"pb",pillar:pid}));
  });
  PRODUCTS.forEach(p=>{
    p.bridges.forEach(bid=>links.push({source:bid,target:p.id,kind:"bp",
      pillar: BRIDGES.find(b=>b.id===bid)?.pillars[0]||"" }));
  });
  return {nodes,links};
}

// ── D3 setup ──────────────────────────────────────────────────────────────────
const {nodes,links}=buildGraph();
// set svg explicit dims
const svgEl=document.getElementById("svg");
const svg=d3.select("#svg");
const defs=svg.append("defs");

// Glow filters
[["rg","#ef4444",12],["bg","#f59e0b",8],["pg","#3b82f6",6]].forEach(([id,c,sd])=>{
  const f=defs.append("filter").attr("id",id).attr("x","-100%").attr("y","-100%").attr("width","300%").attr("height","300%");
  f.append("feGaussianBlur").attr("in","SourceGraphic").attr("stdDeviation",sd).attr("result","b");
  const m=f.append("feMerge");m.append("feMergeNode").attr("in","b");m.append("feMergeNode").attr("in","SourceGraphic");
});

const g=svg.append("g");
const w=GW(), h=GH();

// Space 6 pillars evenly in Y, bridges/products repel to Y center
const pillarIds=PILLARS.map(p=>p.id);
const sim=d3.forceSimulation(nodes)
  .force("link",d3.forceLink(links).id(d=>d.id).distance(d=>d.kind==="pb"?150:120).strength(0.18))
  .force("charge",d3.forceManyBody().strength(-550))
  .force("x",d3.forceX(d=>{
    if(d.type==="pillar") return w*0.13;
    if(d.type==="bridge") return w*0.50;
    return w*0.83;
  }).strength(0.78))
  .force("y",d3.forceY(d=>{
    if(d.type==="pillar"){
      const idx=pillarIds.indexOf(d.id);
      const pad=h*0.12;
      return pad + idx*(h-pad*2)/(PILLARS.length-1);
    }
    return h/2;
  }).strength(d=>d.type==="pillar"?0.55:0.04))
  .force("col",d3.forceCollide(d=>d.type==="pillar"?50:d.type==="bridge"?30:24))
  .alphaDecay(0.012);

const linkSel=g.append("g").selectAll("line").data(links).enter().append("line")
  .attr("stroke","rgba(99,102,241,0.22)").attr("stroke-width",1.5).attr("class",d=>`lnk lnk-${d.pillar}`);

const nodeSel=g.append("g").selectAll("g").data(nodes).enter().append("g")
  .attr("class",d=>`nd nd-${d.id}`)
  .style("cursor","pointer")
  .call(d3.drag()
    .on("start",(e,d)=>{if(!e.active)sim.alphaTarget(0.3).restart();d.fx=d.x;d.fy=d.y})
    .on("drag",(e,d)=>{d.fx=e.x;d.fy=e.y})
    .on("end",(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null}));

// Halos
nodeSel.append("circle").attr("class","halo")
  .attr("r",d=>d.type==="pillar"?46:d.type==="bridge"?26:18)
  .attr("fill","none")
  .attr("stroke",d=>d.type==="pillar"?"rgba(239,68,68,0.38)":d.type==="bridge"?"rgba(245,158,11,0.28)":"rgba(59,130,246,0.22)")
  .attr("stroke-width",2.5)
  .attr("filter",d=>d.type==="pillar"?"url(#rg)":d.type==="bridge"?"url(#bg)":"url(#pg)");

// Bodies
nodeSel.append("circle").attr("class","body")
  .attr("r",d=>d.type==="pillar"?30:d.type==="bridge"?17:12)
  .attr("fill",d=>d.type==="pillar"?"#ef4444":d.type==="bridge"?"#f59e0b":"#3b82f6")
  .attr("stroke",d=>d.type==="pillar"?"#fca5a5":d.type==="bridge"?"#fde68a":"#93c5fd")
  .attr("stroke-width",2);

// Pillar abbr labels (inside)
nodeSel.filter(d=>d.type==="pillar").append("text")
  .attr("class","abbr")
  .text(d=>d.data.abbr)
  .attr("text-anchor","middle").attr("dy","0.35em")
  .attr("font-size","11").attr("font-weight","800").attr("fill","#fff")
  .attr("font-family","Inter,sans-serif").attr("pointer-events","none");

// Bridge labels (below)
nodeSel.filter(d=>d.type==="bridge").append("text")
  .attr("class","lbl bridge-lbl")
  .text(d=>d.data.short)
  .attr("text-anchor","middle").attr("dy","2em")
  .attr("font-size","10").attr("font-weight","700").attr("fill","#fde68a")
  .attr("font-family","Inter,sans-serif").attr("pointer-events","none");

// Product labels (below)
nodeSel.filter(d=>d.type==="product").append("text")
  .attr("class","lbl prod-lbl")
  .text(d=>d.data.name)
  .attr("text-anchor","middle").attr("dy","1.9em")
  .attr("font-size","9").attr("font-weight","600").attr("fill","#93c5fd")
  .attr("font-family","Inter,sans-serif").attr("pointer-events","none");

sim.on("tick",()=>{
  linkSel.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y)
         .attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);
  nodeSel.attr("transform",d=>`translate(${d.x},${d.y})`);
});

svg.call(d3.zoom().scaleExtent([0.4,3]).on("zoom",e=>g.attr("transform",e.transform)));

// ── Helpers ───────────────────────────────────────────────────────────────────
function getPillarOfNode(d){
  if(d.type==="pillar") return d.id;
  if(d.type==="bridge") return d.data.pillars[0];
  const b=BRIDGES.find(br=>d.data.bridges.includes(br.id));
  return b?b.pillars[0]:null;
}

function getBridgesForPillar(pid){
  return BRIDGES.filter(b=>b.pillars.includes(pid)).map(b=>b.id);
}

function getGoneProductIds(pid){
  const bids=getBridgesForPillar(pid);
  return PRODUCTS.filter(p=>p.bridges.some(bid=>bids.includes(bid))).map(p=>p.id);
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
const tt=document.getElementById("tooltip");
function showTT(e,d){
  const isPillar=d.type==="pillar", isBridge=d.type==="bridge";
  const isGone=pulledId && isNodeGone(d);
  let name="",sub="",status="",statusCls="neutral-status";

  if(isPillar){
    name=d.data.title.split(" ").slice(0,6).join(" ")+"...";
    sub=`${fmtK(d.data.direct_cites)} direct citations · ${fmtK(d.data.ris_score)} papers trace back here`;
    status=pulledId===d.id?"Removed from history":"Click to remove from history";
    statusCls=pulledId===d.id?"gone-status":"neutral-status";
    updateInfoPanel(d.data);
  } else if(isBridge){
    name=d.data.title;
    sub=`${d.data.cites} citations · Enabled by: ${d.data.pillars.join(", ")}`;
    if(pulledId){
      status=isGone?"Gone: its enabling pillar was removed":"Unaffected";
      statusCls=isGone?"gone-status":"safe-status";
    }
  } else {
    name=d.data.name;
    const bridgeNames=d.data.bridges.map(bid=>BRIDGES.find(b=>b.id===bid)?.short||bid).join(" → ");
    sub=`Citation chain: Pillar → ${bridgeNames} → this product`;
    if(pulledId){
      status=isGone?"Would NOT exist today":"Unaffected";
      statusCls=isGone?"gone-status":"safe-status";
    }
  }

  document.getElementById("t-name").textContent=name;
  document.getElementById("t-sub").textContent=sub;
  const ts=document.getElementById("t-status");
  ts.textContent=status;ts.className="t-status "+statusCls;
  ts.style.display=status?"inline-block":"none";
  tt.style.display="block";
  tt.style.left=(e.clientX+18)+"px";
  tt.style.top=(Math.min(e.clientY-10, window.innerHeight-120))+"px";
}
function hideTT(){tt.style.display="none";}

nodeSel.on("mouseenter",(e,d)=>showTT(e,d))
  .on("mousemove",(e)=>{tt.style.left=(e.clientX+18)+"px";tt.style.top=(Math.min(e.clientY-10,window.innerHeight-120))+"px"})
  .on("mouseleave",hideTT)
  .on("click",(e,d)=>{if(d.type==="pillar"){if(pulledId===d.id)doReset();else doPull(d.id);}});

// ── Pull ──────────────────────────────────────────────────────────────────────
function isNodeGone(d){
  if(!pulledId) return false;
  if(d.type==="pillar") return d.id===pulledId;
  if(d.type==="bridge") return d.data.pillars.includes(pulledId);
  return d.data.bridges.some(bid=>{const b=BRIDGES.find(x=>x.id===bid);return b&&b.pillars.includes(pulledId);});
}

function doPull(pid){
  pulledId=pid;
  const p=PILLARS.find(x=>x.id===pid);
  const gonePids=getGoneProductIds(pid);
  const goneBids=getBridgesForPillar(pid);

  nodeSel.select(".body").transition().duration(600)
    .attr("fill",d=>{
      if(d.type==="pillar") return d.id===pid?"#1f2937":d.type==="pillar"?"#ef4444":"#ef4444";
      if(d.type==="bridge") return goneBids.includes(d.id)?"#1f2937":"#f59e0b";
      return gonePids.includes(d.id)?"#111827":"#3b82f6";
    })
    .attr("stroke",d=>{
      if(d.type==="pillar") return d.id===pid?"#374151":"#fca5a5";
      if(d.type==="bridge") return goneBids.includes(d.id)?"#1f2937":"#fde68a";
      return gonePids.includes(d.id)?"#1f2937":"#93c5fd";
    });

  nodeSel.select(".halo").transition().duration(600)
    .attr("stroke",d=>{
      if(isNodeGone(d)) return "rgba(30,30,40,0.1)";
      return d.type==="pillar"?"rgba(239,68,68,0.35)":d.type==="bridge"?"rgba(245,158,11,0.25)":"rgba(59,130,246,0.2)";
    });

  nodeSel.select(".lbl").transition().duration(600)
    .attr("fill",d=>{
      if(d.type==="bridge") return goneBids.includes(d.id)?"#374151":"#fde68a";
      return gonePids.includes(d.id)?"#374151":"#93c5fd";
    });

  nodeSel.filter(d=>d.type==="pillar").select(".abbr").text(d=>d.id===pid?"GONE":d.data.abbr)
    .attr("fill",d=>d.id===pid?"#4b5563":"#fff");

  // affected links fade red, unaffected links stay full brightness
  linkSel.transition().duration(600)
    .attr("stroke",d=>d.pillar===pid?"rgba(239,68,68,0.07)":"rgba(99,102,241,0.28)")
    .attr("stroke-width",d=>d.pillar===pid?0.5:1.4);

  // UI updates
  const goneProds=PRODUCTS.filter(pr=>gonePids.includes(pr.id));
  document.getElementById("k-gone").textContent=goneProds.length;
  document.getElementById("k-gone").className="kpi-v red";
  document.getElementById("kpi-gone-lbl").textContent="products gone\nfrom today's world";
  document.getElementById("reset-btn").style.display="block";
  document.getElementById("instruct").textContent=
    `Removed from history. ${goneProds.length} products would not exist today.`;

  document.getElementById("gone-section").style.display="block";
  document.getElementById("gone-title").textContent=
    `Without this paper, these ${goneProds.length} products would not exist`;
  document.getElementById("gone-pills").innerHTML=
    goneProds.map(pr=>`<span class="cpill">${pr.name}</span>`).join("");

  document.getElementById("chain-section").style.display="block";
  document.getElementById("chain-content").innerHTML=
    goneBids.map(bid=>{
      const b=BRIDGES.find(x=>x.id===bid);
      const affected=PRODUCTS.filter(pr=>pr.bridges.includes(bid));
      return `<div class="chain-row">`+
        `<div class="chain-bridge">${b.short} <span>(${b.cites} citations)</span></div>`+
        `<div class="chain-removes">Pillar removed &rarr; this paper cannot exist &rarr; removes:</div>`+
        `<div class="chain-prods">${affected.map(pr=>`<span class="chain-prod">${pr.name}</span>`).join("")}</div>`+
        `</div>`;
    }).join("");

  document.getElementById("quote-box").style.display="block";
  document.getElementById("quote-text").textContent=p.quote;

  updateInfoPanel(p);
}

function doReset(){
  pulledId=null;
  nodeSel.select(".body").transition().duration(400)
    .attr("fill",d=>d.type==="pillar"?"#ef4444":d.type==="bridge"?"#f59e0b":"#3b82f6")
    .attr("stroke",d=>d.type==="pillar"?"#fca5a5":d.type==="bridge"?"#fde68a":"#93c5fd");
  nodeSel.select(".halo").transition().duration(400)
    .attr("stroke",d=>d.type==="pillar"?"rgba(239,68,68,0.35)":d.type==="bridge"?"rgba(245,158,11,0.25)":"rgba(59,130,246,0.2)");
  nodeSel.select(".lbl").transition().duration(400)
    .attr("fill",d=>d.type==="bridge"?"#fde68a":"#93c5fd");
  nodeSel.filter(d=>d.type==="pillar").select(".abbr")
    .text(d=>d.data.abbr).attr("fill","#fff");
  linkSel.transition().duration(400)
    .attr("stroke","rgba(99,102,241,0.22)").attr("stroke-width",1.3);
  document.getElementById("k-gone").textContent="?";
  document.getElementById("k-gone").className="kpi-v";
  document.getElementById("kpi-gone-lbl").textContent="click a red node to count";
  document.getElementById("reset-btn").style.display="none";
  document.getElementById("gone-section").style.display="none";
  document.getElementById("chain-section").style.display="none";
  document.getElementById("quote-box").style.display="none";
  document.getElementById("instruct").textContent=
    "The red nodes are the hidden pillars. Click one to erase it from history and watch the cascade.";
  updateInfoPanel(PILLARS.find(x=>x.id===activePillarId)||PILLARS[0]);
}

// ── Info panel ────────────────────────────────────────────────────────────────
function updateInfoPanel(p){
  activePillarId=p.id;
  document.getElementById("k-cites").textContent=fmtK(p.direct_cites);
  document.getElementById("k-ris").textContent=fmtK(p.ris_score);
  document.getElementById("k-col").textContent=p.collapse_percent+"%";
  document.getElementById("panel-year").textContent=p.year;
  document.getElementById("panel-title").textContent=p.title;
  document.getElementById("gremlin-pre").textContent=p.gremlin_query;
  const bars=document.getElementById("bars");
  bars.innerHTML=Object.entries(p.domain_capture).map(([k,v])=>`
    <div class="bar-row">
      <div class="bar-label">${k}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${v}%;background:${DOMAIN_COLORS[k]||"#3b82f6"}"></div></div>
      <div class="bar-val">${v}%</div>
    </div>`).join("");
  document.getElementById("ris-block").innerHTML=
    `<div style="font-size:9px;color:#2d2d44;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">Reachable Impact Score via PuppyGraph (2-hop)</div>
     <div style="font-size:28px;font-weight:800;color:#fff">${fmtK(p.ris_score)}</div>
     <div style="font-size:10px;color:#334155;margin-top:2px">papers trace back to this one seed</div>`;
}

updateInfoPanel(PILLARS[0]);
