const crownBtn = document.getElementById("crownBtn");
const crownSvg = document.getElementById("crownSvg");
const crownPath = document.getElementById("crownPath");
const basePath  = document.getElementById("basePath");

const hexCanvas = document.getElementById("hexCanvas");
const fxCanvas  = document.getElementById("fx");

const site      = document.getElementById("site");
const heroTitle = document.getElementById("heroTitle");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// EXACT scramble set you asked for:
const SCRAMBLE = "!@#$%^&*()_+=-[]{}<>?/\\|~";

let entered = false;

// --- HEX CANVAS STATE ---
let hexCtx = null;
let hexDpr = 1;
let hexCells = []; // { cx, cy, pts }
let hexRadius = 28;

// --- FX CANVAS ---
function fitFx(){
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  fxCanvas.width = Math.floor(window.innerWidth * dpr);
  fxCanvas.height = Math.floor(window.innerHeight * dpr);
  fxCanvas.style.width = `${window.innerWidth}px`;
  fxCanvas.style.height = `${window.innerHeight}px`;
  const ctx = fxCanvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function fitHex(){
  hexDpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  hexCanvas.width  = Math.floor(window.innerWidth * hexDpr);
  hexCanvas.height = Math.floor(window.innerHeight * hexDpr);
  hexCanvas.style.width  = `${window.innerWidth}px`;
  hexCanvas.style.height = `${window.innerHeight}px`;

  hexCtx = hexCanvas.getContext("2d");
  hexCtx.setTransform(hexDpr, 0, 0, hexDpr, 0, 0);
}

function hexPointsFlatTop(cx, cy, r){
  // flat-top hex (top edge flat) matches our spacing
  const pts = [];
  for (let i = 0; i < 6; i++){
    const a = (Math.PI / 180) * (60 * i);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function strokeHex(ctx, pts){
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.stroke();
}

function buildHexGrid(){
  if (!hexCtx) fitHex();

  const w = window.innerWidth;
  const h = window.innerHeight;

  // tune size to feel “blueprint”
  hexRadius = Math.max(22, Math.min(34, Math.floor(w / 52)));

  // flat-top layout spacing
  const dx = 1.5 * hexRadius;
  const dy = Math.sqrt(3) * hexRadius;

  hexCtx.clearRect(0, 0, w, h);
  hexCtx.lineWidth = 1;
  hexCtx.lineJoin = "round";
  hexCtx.strokeStyle = "rgba(120,170,255,0.16)";

  const cells = [];
  const cols = Math.ceil(w / dx) + 4;
  const rows = Math.ceil(h / dy) + 4;

  for (let c = -2; c < cols; c++){
    const x = c * dx;
    const yOffset = (c % 2) ? (dy / 2) : 0;

    for (let rRow = -2; rRow < rows; rRow++){
      const y = rRow * dy + yOffset;

      if (x < -120 || x > w + 120 || y < -120 || y > h + 120) continue;

      const pts = hexPointsFlatTop(x, y, hexRadius);
      strokeHex(hexCtx, pts);
      cells.push({ cx: x, cy: y, pts });
    }
  }

  // add a faint second pass for “ink wobble” (super subtle)
  hexCtx.strokeStyle = "rgba(120,170,255,0.06)";
  hexCtx.lineWidth = 1;
  for (let i = 0; i < cells.length; i += 2){
    strokeHex(hexCtx, cells[i].pts);
  }

  return cells;
}

function eraseHex(ctx, pts){
  // erase slightly bigger than stroke so it fully disappears
  const expand = 1.45;

  const cx = pts.reduce((s,p)=>s+p[0],0) / 6;
  const cy = pts.reduce((s,p)=>s+p[1],0) / 6;

  ctx.beginPath();
  ctx.moveTo(cx + (pts[0][0]-cx)*expand, cy + (pts[0][1]-cy)*expand);
  for (let i=1;i<6;i++){
    ctx.lineTo(cx + (pts[i][0]-cx)*expand, cy + (pts[i][1]-cy)*expand);
  }
  ctx.closePath();
  ctx.fill();
}

function dissolveHexCells(){
  if (!hexCtx) return;

  const order = hexCells
    .map(c => ({ c, k: Math.random() }))
    .sort((a,b)=>a.k-b.k)
    .map(x=>x.c);

  // “reveal below” = actual cut-out
  hexCtx.save();
  hexCtx.globalCompositeOperation = "destination-out";
  hexCtx.fillStyle = "rgba(0,0,0,1)";

  let i = 0;
  const step = () => {
    const batch = prefersReducedMotion ? 9999 : 2; // tune speed here
    for (let j = 0; j < batch && i < order.length; j++, i++){
      eraseHex(hexCtx, order[i].pts);
    }
    if (i < order.length) requestAnimationFrame(step);
    else hexCtx.restore();
  };

  requestAnimationFrame(step);
}

/* ---------------------------
   Crown draw (stable, no bounce)
---------------------------- */
function animateCrownDraw(){
  if (!crownPath || !basePath || prefersReducedMotion) return;

  const paths = [crownPath, basePath];
  const lengths = paths.map(p => p.getTotalLength());

  // prep
  paths.forEach((p, idx) => {
    const len = lengths[idx];
    p.style.transition = "none";
    p.style.strokeDasharray = `${len} ${len}`; // stable
    p.style.strokeDashoffset = `${len}`;
  });

  void crownSvg.getBoundingClientRect();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      crownPath.style.transition = "stroke-dashoffset 720ms cubic-bezier(.7,1.4,.2,1)";
      basePath.style.transition  = "stroke-dashoffset 420ms cubic-bezier(.7,1.4,.2,1)";

      crownPath.style.strokeDashoffset = "0";
      setTimeout(() => { basePath.style.strokeDashoffset = "0"; }, 140);

      // finalize WITHOUT switching dasharray modes (prevents start-point bounce)
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

/* ---------------------------
   Scramble reveal (with a tiny stutter)
---------------------------- */
function scrambleReveal(el, finalText, ms = 900){
  if (!el) return;
  if (prefersReducedMotion){
    el.textContent = finalText;
    return;
  }

  const start = performance.now();
  const len = finalText.length;

  function frame(now){
    const t = Math.min(1, (now - start) / ms);
    const revealCount = Math.floor(t * len);

    const stutter = (t > 0.72 && t < 0.88 && Math.random() < 0.20);

    let out = "";
    for (let i = 0; i < len; i++){
      if (i < revealCount && !stutter) out += finalText[i];
      else out += SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
    }

    el.textContent = out;

    if (t < 1) requestAnimationFrame(frame);
    else {
      el.textContent = finalText;
      el.animate(
        [{ transform:"translateY(-1px)" }, { transform:"translateY(0px)" }],
        { duration: 140, easing:"cubic-bezier(.2,.9,.2,1)" }
      );
    }
  }

  requestAnimationFrame(frame);
}

/* ---------------------------
   Particle burst (toxic glow)
---------------------------- */
function rand(min, max){ return min + Math.random() * (max - min); }

function burstFromCrown(){
  if (prefersReducedMotion) return;

  const rect = crownBtn.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2 + 8;

  const ctx = fxCanvas.getContext("2d");
  const particles = [];
  const n = 130;

  for (let i = 0; i < n; i++){
    const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
    const sp = rand(4.5, 13.0);
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(a) * sp + rand(-1.2, 1.2),
      vy: Math.sin(a) * sp - rand(0, 2),
      life: rand(420, 820),
      age: 0,
      r: rand(1.2, 3.6),
      hue: rand(38, 66),     // gold → toxic green range
      sat: rand(85, 98),
      lit: rand(55, 72),
      alpha: rand(0.60, 0.95)
    });
  }

  const g = 0.30;
  const drag = 0.985;
  const start = performance.now();

  function draw(now){
    const dt = Math.min(32, now - (draw._last || now));
    draw._last = now;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // additive-ish look
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const p of particles){
      p.age += dt;

      p.vx *= drag;
      p.vy = p.vy * drag + g * (dt / 16);

      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);

      const k = Math.max(0, 1 - p.age / p.life);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.7 + 0.7 * k), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue} ${p.sat}% ${p.lit}% / ${p.alpha * k})`;
      ctx.fill();
    }

    ctx.restore();

    const alive = particles.some(p => p.age < p.life);
    if (alive && now - start < 1300) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  requestAnimationFrame(draw);
}

/* ---------------------------
   Click sequence
---------------------------- */
function enter(){
  if (entered) return;
  entered = true;

  document.body.classList.add("entered");
  burstFromCrown();

  setTimeout(() => {
    document.body.classList.add("unlocked");
    dissolveHexCells();
    scrambleReveal(heroTitle, "hi i'm makda", 900);
  }, prefersReducedMotion ? 0 : 220);
}

/* ---------------------------
   Init
---------------------------- */
function init(){
  fitFx();
  fitHex();
  hexCells = buildHexGrid();
  animateCrownDraw();

  if (heroTitle) heroTitle.textContent = "";
}

window.addEventListener("DOMContentLoaded", init);
window.addEventListener("resize", () => {
  fitFx();
  fitHex();
  hexCells = buildHexGrid();
});

crownBtn.addEventListener("click", enter);
crownBtn.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") enter();
});
