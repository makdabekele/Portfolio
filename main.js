/* ============================
   main.js — FULL REPLACEMENT
   Curtain canvas draws:
   - bluesplatts.png (top overlay)
   - hex grid lines (single-stroke)
   Then erases hexes to reveal site beneath
   ============================ */

const prefersReducedMotion =
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

const SCRAMBLE = "!@#$%^&*()_+=-[]{}<>?/\\|~";

const stage = document.getElementById("stage");
const site = document.getElementById("site");
const heroTitle = document.getElementById("heroTitle");

const crownBtn = document.getElementById("crownBtn");
const crownSvg = document.getElementById("crownSvg");
const crownPath = document.getElementById("crownPath");
const basePath  = document.getElementById("basePath");

const curtainCanvas = document.getElementById("curtainCanvas");
const fxCanvas = document.getElementById("fxCanvas");

const curtainCtx = curtainCanvas.getContext("2d");
const fxCtx = fxCanvas.getContext("2d");

let entered = false;

/* ---------- DPR fit ---------- */
function fitCanvas(canvas, ctx){
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return dpr;
}

function fitAll(){
  fitCanvas(curtainCanvas, curtainCtx);
  fitCanvas(fxCanvas, fxCtx);
}

/* ---------- Hex grid (tessellated, no “star overlap”) ---------- */
let hexCells = [];
let hexR = 28;

function hexPointsFlatTop(cx, cy, r){
  // true flat-top: start angle at 30deg
  const pts = [];
  for (let i=0;i<6;i++){
    const a = (Math.PI/3)*i + Math.PI/6;
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
  const cols = Math.ceil(w / dx) + 8;
  const rows = Math.ceil(h / dy) + 8;

  for (let c = -4; c < cols; c++){
    const x = c * dx;
    const yOff = (c % 2) ? (dy/2) : 0;

    for (let r = -4; r < rows; r++){
      const y = r * dy + yOff;

      const cx = x;
      const cy = y;

      if (cx < -160 || cx > w + 160 || cy < -160 || cy > h + 160) continue;

      const pts = hexPointsFlatTop(cx, cy, hexR);
      cells.push({ cx, cy, pts });
    }
  }
  return cells;
}

function drawHexGridLines(){
  // single-stroke trick: draw only 3 edges per hex (prevents thick intersections)
  curtainCtx.save();
  curtainCtx.lineWidth = 1.15;
  curtainCtx.strokeStyle = "rgba(120,170,255,0.22)";
  curtainCtx.lineJoin = "round";
  curtainCtx.lineCap = "round";

  curtainCtx.beginPath();
  for (const cell of hexCells){
    const p = cell.pts;
    // top-right-ish half: p0->p1, p1->p2, p2->p3
    curtainCtx.moveTo(p[0][0], p[0][1]); curtainCtx.lineTo(p[1][0], p[1][1]);
    curtainCtx.moveTo(p[1][0], p[1][1]); curtainCtx.lineTo(p[2][0], p[2][1]);
    curtainCtx.moveTo(p[2][0], p[2][1]); curtainCtx.lineTo(p[3][0], p[3][1]);
  }
  curtainCtx.stroke();
  curtainCtx.restore();
}

/* ---------- Curtain drawing: bluesplatts + vignette + hex lines ---------- */
const splatImg = new Image();
splatImg.src = "./assets/bluesplatts.png";

function drawCoverImage(ctx, img){
  const w = window.innerWidth;
  const h = window.innerHeight;

  // cover fit
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const scale = Math.max(w/iw, h/ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;

  ctx.drawImage(img, dx, dy, dw, dh);
}

function redrawCurtain(){
  const w = window.innerWidth;
  const h = window.innerHeight;

  curtainCtx.clearRect(0,0,w,h);

  // bluesplatts (ONLY texture you wanted)
  drawCoverImage(curtainCtx, splatImg);

  // subtle dark veil so it reads “curtain”
  curtainCtx.save();
  curtainCtx.fillStyle = "rgba(5,9,21,0.55)";
  curtainCtx.fillRect(0,0,w,h);

  // vignette
  const g = curtainCtx.createRadialGradient(w*0.5, h*0.45, 40, w*0.5, h*0.45, Math.max(w,h)*0.75);
  g.addColorStop(0, "rgba(0,0,0,0.0)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  curtainCtx.fillStyle = g;
  curtainCtx.fillRect(0,0,w,h);
  curtainCtx.restore();

  // hex lines on top
  drawHexGridLines();
}

/* ---------- Erase hexes to reveal the site ---------- */
function eraseHex(pts){
  // expand a bit so hexes “eat” the curtain cleanly (no tiny leftover lines)
  const expand = 1.50;
  const cx = pts.reduce((s,p)=>s+p[0],0)/6;
  const cy = pts.reduce((s,p)=>s+p[1],0)/6;

  curtainCtx.beginPath();
  curtainCtx.moveTo(cx + (pts[0][0]-cx)*expand, cy + (pts[0][1]-cy)*expand);
  for (let i=1;i<6;i++){
    curtainCtx.lineTo(cx + (pts[i][0]-cx)*expand, cy + (pts[i][1]-cy)*expand);
  }
  curtainCtx.closePath();
  curtainCtx.fill();
}

function dissolveCurtainFastRandom(){
  // random order
  const order = hexCells
    .map(c => ({ c, k: Math.random() }))
    .sort((a,b)=>a.k-b.k)
    .map(x=>x.c);

  curtainCtx.save();
  curtainCtx.globalCompositeOperation = "destination-out";
  curtainCtx.fillStyle = "rgba(0,0,0,1)";

  let i = 0;

  // faster: more per frame
  const batch = prefersReducedMotion ? 99999 : 18;

  function step(){
    for (let j=0; j<batch && i<order.length; j++, i++){
      eraseHex(order[i].pts);
    }
    if (i < order.length) requestAnimationFrame(step);
    else {
      curtainCtx.restore();
      // once fully gone, you can drop the canvas entirely
      setTimeout(()=>{ curtainCanvas.remove(); }, 80);
    }
  }

  requestAnimationFrame(step);
}

/* ---------- Small impact pulse ---------- */
function impactPulse(x,y){
  if (prefersReducedMotion) return;

  const start = performance.now();
  const dur = 220;

  function frame(now){
    const t = Math.min(1, (now-start)/dur);
    fxCtx.clearRect(0,0,window.innerWidth,window.innerHeight);

    const r = 10 + t * 240;
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

/* ---------- Crown draw (stable) ---------- */
function animateCrownDraw(){
  if (!crownPath || !basePath || prefersReducedMotion) return;

  const paths = [crownPath, basePath];
  const lengths = paths.map(p => p.getTotalLength());

  paths.forEach((p, idx) => {
    const len = lengths[idx];
    p.style.transition = "none";
    p.style.strokeDasharray = `${len} ${len}`;
    p.style.strokeDashoffset = `${len}`;
  });

  void crownSvg.getBoundingClientRect();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      crownPath.style.transition = "stroke-dashoffset 720ms cubic-bezier(.7,1.4,.2,1)";
      basePath.style.transition  = "stroke-dashoffset 420ms cubic-bezier(.7,1.4,.2,1)";

      crownPath.style.strokeDashoffset = "0";
      setTimeout(() => { basePath.style.strokeDashoffset = "0"; }, 140);

      setTimeout(() => {
        paths.forEach((p, idx) => {
          const len = lengths[idx];
          p.style.transition = "none";
          p.style.strokeDashoffset = "0";
          p.style.strokeDasharray = `${len} ${len}`;
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

/* ---------- Enter ---------- */
function enter(){
  if (entered) return;
  entered = true;

  // make under page available BUT still hidden by curtain canvas
  document.body.classList.add("unlocked");
  site.setAttribute("aria-hidden","false");

  // slam starts instantly
  document.body.classList.add("entered");

  // impact moment (sync-ish with slam)
  const impactX = window.innerWidth * 0.50;
  const impactY = window.innerHeight * 0.88;

  const hitDelay = prefersReducedMotion ? 0 : 210;

  setTimeout(() => {
    document.body.classList.add("impact");
    impactPulse(impactX, impactY);

    // start erasing the curtain (splat + hex) in hex chunks
    dissolveCurtainFastRandom();

    // title reveal
    scrambleReveal(heroTitle, "hi i'm makda", 820);

    setTimeout(()=>document.body.classList.remove("impact"), 180);
  }, hitDelay);
}

/* ---------- Init ---------- */
function init(){
  entered = false;
  document.body.classList.remove("entered","impact");
  document.body.classList.remove("unlocked");
  site.setAttribute("aria-hidden","true");
  if (heroTitle) heroTitle.textContent = "";

  fitAll();
  hexCells = buildHexGrid();

  // wait for splat to load before first paint (prevents flash)
  if (splatImg.complete && splatImg.naturalWidth){
    redrawCurtain();
  } else {
    splatImg.onload = () => {
      if (!entered) redrawCurtain();
    };
  }

  animateCrownDraw();
}

window.addEventListener("DOMContentLoaded", init);

window.addEventListener("resize", () => {
  if (entered) return;
  fitAll();
  hexCells = buildHexGrid();
  if (splatImg.complete && splatImg.naturalWidth) redrawCurtain();
});

crownBtn.addEventListener("click", enter);
crownBtn.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") enter();
});
