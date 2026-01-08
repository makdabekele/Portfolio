/* ============================
   main.js — FULL REPLACEMENT
   Hex dissolve reveals site
   ============================ */

const prefersReducedMotion =
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

const SCRAMBLE = "!@#$%^&*()_+=-[]{}<>?/\\|~";

const curtain = document.getElementById("curtain");
const site = document.getElementById("site");
const heroTitle = document.getElementById("heroTitle");

const crownBtn = document.getElementById("crownBtn");
const crownStrokeSvg = document.getElementById("crownStrokeSvg");
const crownStrokePath = document.getElementById("crownStrokePath");
const crownStrokeBase = document.getElementById("crownStrokeBase");

const hexCanvas = document.getElementById("hexCanvas");
const fxCanvas = document.getElementById("fxCanvas");
const hexCtx = hexCanvas.getContext("2d");
const fxCtx = fxCanvas.getContext("2d");

let entered = false;

/* ---------- Canvas fitting ---------- */
function fitCanvas(canvas, ctx){
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width  = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function fitHex(){ fitCanvas(hexCanvas, hexCtx); }
function fitFx(){ fitCanvas(fxCanvas, fxCtx); }

/* ---------- Hex grid (NO overlap star) ---------- */
let hexCells = [];
let hexR = 28;

function hexPointsFlatTop(cx, cy, r){
  const pts = [];
  for (let i=0;i<6;i++){
    const a = (Math.PI/3)*i; // flat-top
    pts.push([cx + Math.cos(a)*r, cy + Math.sin(a)*r]);
  }
  return pts;
}

function buildHexGrid(){
  const w = window.innerWidth;
  const h = window.innerHeight;

  hexR = Math.max(22, Math.min(34, Math.floor(Math.min(w,h) / 26)));

  const dx = 1.5 * hexR;
  const dy = Math.sqrt(3) * hexR;

  const cells = [];
  const cols = Math.ceil(w / dx) + 6;
  const rows = Math.ceil(h / dy) + 6;

  for (let c = -3; c < cols; c++){
    const x = c * dx;
    const yOff = (c % 2) ? (dy/2) : 0;

    for (let r = -3; r < rows; r++){
      const y = r * dy + yOff;

      const cx = x;
      const cy = y;
      if (cx < -140 || cx > w + 140 || cy < -140 || cy > h + 140) continue;

      const pts = hexPointsFlatTop(cx, cy, hexR);
      cells.push({ cx, cy, pts });
    }
  }
  return cells;
}

function drawHexGrid(){
  const w = window.innerWidth;
  const h = window.innerHeight;
  hexCtx.clearRect(0,0,w,h);

  // draw only 3 edges per hex to avoid double-stroking shared edges
  hexCtx.save();
  hexCtx.lineWidth = 1.15;
  hexCtx.strokeStyle = "rgba(120,170,255,0.22)";
  hexCtx.lineJoin = "round";
  hexCtx.lineCap = "round";

  hexCtx.beginPath();
  for (const cell of hexCells){
    const p = cell.pts;
    // p0->p1, p1->p2, p2->p3
    hexCtx.moveTo(p[0][0], p[0][1]); hexCtx.lineTo(p[1][0], p[1][1]);
    hexCtx.moveTo(p[1][0], p[1][1]); hexCtx.lineTo(p[2][0], p[2][1]);
    hexCtx.moveTo(p[2][0], p[2][1]); hexCtx.lineTo(p[3][0], p[3][1]);
  }
  hexCtx.stroke();
  hexCtx.restore();
}

/* ---------- Dual masks (curtain hides + site reveals) ---------- */
let curtainMaskCanvas, curtainMaskCtx;
let siteMaskCanvas, siteMaskCtx;
let maskDpr = 1;

function fitMasks(){
  maskDpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  // curtain: white visible, black holes
  curtainMaskCanvas = document.createElement("canvas");
  curtainMaskCanvas.width  = Math.floor(window.innerWidth * maskDpr);
  curtainMaskCanvas.height = Math.floor(window.innerHeight * maskDpr);
  curtainMaskCtx = curtainMaskCanvas.getContext("2d");
  curtainMaskCtx.setTransform(maskDpr,0,0,maskDpr,0,0);
  curtainMaskCtx.fillStyle = "white";
  curtainMaskCtx.fillRect(0,0,window.innerWidth,window.innerHeight);

  // site: black hidden, white reveals
  siteMaskCanvas = document.createElement("canvas");
  siteMaskCanvas.width  = Math.floor(window.innerWidth * maskDpr);
  siteMaskCanvas.height = Math.floor(window.innerHeight * maskDpr);
  siteMaskCtx = siteMaskCanvas.getContext("2d");
  siteMaskCtx.setTransform(maskDpr,0,0,maskDpr,0,0);
  siteMaskCtx.fillStyle = "black";
  siteMaskCtx.fillRect(0,0,window.innerWidth,window.innerHeight);

  applyMasks();
}

function applyMasks(){
  // WebKit mask is the most stable here
  const cUrl = curtainMaskCanvas.toDataURL("image/png");
  curtain.style.webkitMaskImage = `url(${cUrl})`;

  const sUrl = siteMaskCanvas.toDataURL("image/png");
  site.style.webkitMaskImage = `url(${sUrl})`;
}

function punchHexBoth(pts){
  const expand = 1.45;
  const cx = pts.reduce((s,p)=>s+p[0],0)/6;
  const cy = pts.reduce((s,p)=>s+p[1],0)/6;

  // curtain hole = black
  curtainMaskCtx.fillStyle = "black";
  curtainMaskCtx.beginPath();
  curtainMaskCtx.moveTo(cx + (pts[0][0]-cx)*expand, cy + (pts[0][1]-cy)*expand);
  for (let i=1;i<6;i++){
    curtainMaskCtx.lineTo(cx + (pts[i][0]-cx)*expand, cy + (pts[i][1]-cy)*expand);
  }
  curtainMaskCtx.closePath();
  curtainMaskCtx.fill();

  // site reveal = white
  siteMaskCtx.fillStyle = "white";
  siteMaskCtx.beginPath();
  siteMaskCtx.moveTo(cx + (pts[0][0]-cx)*expand, cy + (pts[0][1]-cy)*expand);
  for (let i=1;i<6;i++){
    siteMaskCtx.lineTo(cx + (pts[i][0]-cx)*expand, cy + (pts[i][1]-cy)*expand);
  }
  siteMaskCtx.closePath();
  siteMaskCtx.fill();
}

function dissolveCurtainHexesFromPoint(px, py){
  // reveal in a deterministic order (near impact -> outward)
  const order = hexCells.slice().sort((a,b)=>{
    const da = (a.cx-px)*(a.cx-px) + (a.cy-py)*(a.cy-py);
    const db = (b.cx-px)*(b.cx-px) + (b.cy-py)*(b.cy-py);
    return da - db;
  });

  let i = 0;

  function step(){
    // TRUE one-by-one: 1 hex per frame
    if (i < order.length){
      punchHexBoth(order[i].pts);
      applyMasks();
      i++;
      requestAnimationFrame(step);
    } else {
      curtain.remove();
      scrambleReveal(heroTitle, "hi i'm makda", 900);
    }
  }

  requestAnimationFrame(step);
}

/* ---------- FX ---------- */
function impactPulse(x,y){
  if (prefersReducedMotion) return;

  const start = performance.now();
  const dur = 240;

  function frame(now){
    const t = Math.min(1, (now-start)/dur);
    fxCtx.clearRect(0,0,window.innerWidth,window.innerHeight);

    const r = 12 + t * 260;
    const a = (1 - t) * 0.55;

    fxCtx.save();
    fxCtx.globalCompositeOperation = "lighter";
    fxCtx.lineWidth = 2.5;
    fxCtx.strokeStyle = `rgba(0,255,190,${a})`;
    fxCtx.beginPath();
    fxCtx.arc(x,y,r,0,Math.PI*2);
    fxCtx.stroke();
    fxCtx.restore();

    if (t < 1) requestAnimationFrame(frame);
    else fxCtx.clearRect(0,0,window.innerWidth,window.innerHeight);
  }
  requestAnimationFrame(frame);
}

/* ---------- Crown stroke draw-in (keeps doodle image) ---------- */
function animateCrownDraw(){
  if (!crownStrokeSvg || !crownStrokePath || !crownStrokeBase || prefersReducedMotion) return;

  const paths = [crownStrokePath, crownStrokeBase];
  const lens = paths.map(p => p.getTotalLength());

  paths.forEach((p, idx)=>{
    const L = lens[idx];
    p.style.transition = "none";
    p.style.strokeDasharray = `${L} ${L}`;
    p.style.strokeDashoffset = `${L}`;
  });

  // flush
  void crownStrokeSvg.getBoundingClientRect();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      crownStrokePath.style.transition = "stroke-dashoffset 720ms cubic-bezier(.7,1.4,.2,1)";
      crownStrokeBase.style.transition = "stroke-dashoffset 420ms cubic-bezier(.7,1.4,.2,1)";

      crownStrokePath.style.strokeDashoffset = "0";
      setTimeout(()=>{ crownStrokeBase.style.strokeDashoffset = "0"; }, 140);

      // lock final to avoid end “bounce”
      setTimeout(()=>{
        paths.forEach((p, idx)=>{
          const L = lens[idx];
          p.style.transition = "none";
          p.style.strokeDasharray = `${L} ${L}`;
          p.style.strokeDashoffset = "0";
        });
      }, 900);
    });
  });
}

/* ---------- Scramble reveal ---------- */
function scrambleReveal(el, finalText, ms=900){
  if (!el) return;

  if (prefersReducedMotion){
    el.textContent = finalText;
    return;
  }

  const start = performance.now();
  const len = finalText.length;

  function frame(now){
    const t = Math.min(1, (now-start)/ms);
    const revealCount = Math.floor(t * len);

    let out = "";
    for (let i=0;i<len;i++){
      if (i < revealCount) out += finalText[i];
      else out += SCRAMBLE[Math.floor(Math.random()*SCRAMBLE.length)];
    }
    el.textContent = out;

    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = finalText;
  }

  requestAnimationFrame(frame);
}

/* ---------- Enter sequence ---------- */
function enter(){
  if (entered) return;
  entered = true;

  // prep sizes + masks FIRST (prevents overlay weirdness)
  fitFx();
  fitHex();
  hexCells = buildHexGrid();
  drawHexGrid();
  fitMasks();

  // now allow the site to exist visually (still masked black)
  document.body.classList.add("revealing");
  site.setAttribute("aria-hidden","false");

  // slam starts immediately via CSS
  document.body.classList.add("entered");

  // impact coords
  const impactX = window.innerWidth * 0.50;
  const impactY = window.innerHeight * 0.88;

  // small delay so the slam reads as “hit” then dissolve starts
  const hitDelay = prefersReducedMotion ? 0 : 220;

  setTimeout(()=>{
    document.body.classList.add("impact");
    impactPulse(impactX, impactY);

    // start reveal
    dissolveCurtainHexesFromPoint(impactX, impactY);

    setTimeout(()=>document.body.classList.remove("impact"), 180);
  }, hitDelay);
}

/* ---------- Init ---------- */
function init(){
  entered = false;
  document.body.classList.remove("revealing","entered","impact");
  site.setAttribute("aria-hidden","true");
  if (heroTitle) heroTitle.textContent = "";

  fitFx();
  fitHex();
  hexCells = buildHexGrid();
  drawHexGrid();
  fitMasks();
  animateCrownDraw();
}

window.addEventListener("DOMContentLoaded", init);

window.addEventListener("resize", () => {
  // don’t rebuild mid dissolve
  if (entered) return;
  fitFx();
  fitHex();
  hexCells = buildHexGrid();
  drawHexGrid();
  fitMasks();
});

crownBtn.addEventListener("click", enter);
crownBtn.addEventListener("keydown", (e)=>{
  if (e.key === "Enter" || e.key === " ") enter();
});
