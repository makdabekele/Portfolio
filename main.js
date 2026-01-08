const crownBtn = document.getElementById("crownBtn");
const crownSvg = document.getElementById("crownSvg");
const crownPath = document.getElementById("crownPath");
const basePath  = document.getElementById("basePath");

const hexCanvas = document.getElementById("curtainCanvas");
const fxCanvas  = document.getElementById("fxCanvas");

const heroTitle = document.getElementById("heroTitle");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SCRAMBLE = "!@#$%^&*()_+=-[]{}<>?/\\|~";

let entered = false;

// --- HEX CANVAS STATE ---
let hexCtx = null;
let hexDpr = 1;
let hexCells = [];
let hexRadius = 28;

// --- SPLAT IMAGE ---
const splatImg = new Image();
splatImg.src = "./assets/bluesplatts.png";
let splatReady = false;
splatImg.onload = () => { splatReady = true; redrawCurtain(); };
splatImg.onerror = () => { splatReady = false; redrawCurtain(); };

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

// --- HEX GEOMETRY ---
function hexPointsFlatTop(cx, cy, r){
  const pts = [];
  for (let i = 0; i < 6; i++){
    const a = (Math.PI / 180) * (60 * i);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function buildHexGrid(){
  if (!hexCtx) fitHex();

  const w = window.innerWidth;
  const h = window.innerHeight;

  hexRadius = Math.max(22, Math.min(34, Math.floor(w / 52)));

  const dx = 1.5 * hexRadius;
  const dy = Math.sqrt(3) * hexRadius;

  const cells = [];
  const cols = Math.ceil(w / dx) + 6;
  const rows = Math.ceil(h / dy) + 6;

  for (let c = -3; c < cols; c++){
    const x = c * dx;
    const yOffset = (c % 2) ? (dy / 2) : 0;

    for (let rRow = -3; rRow < rows; rRow++){
      const y = rRow * dy + yOffset;
      if (x < -140 || x > w + 140 || y < -140 || y > h + 140) continue;
      const pts = hexPointsFlatTop(x, y, hexRadius);
      cells.push({ cx: x, cy: y, pts });
    }
  }
  return cells;
}

// --- DRAW CURTAIN ---
function redrawCurtain(){
  if (!hexCtx) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  hexCtx.clearRect(0, 0, w, h);

  hexCtx.save();
  hexCtx.globalCompositeOperation = "source-over";
  hexCtx.fillStyle = "rgba(5, 8, 16, 0.86)";
  hexCtx.fillRect(0, 0, w, h);
  hexCtx.restore();

  if (splatReady){
    const iw = splatImg.naturalWidth || splatImg.width;
    const ih = splatImg.naturalHeight || splatImg.height;

    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;

    hexCtx.save();
    hexCtx.globalCompositeOperation = "screen";
    hexCtx.globalAlpha = 0.18;
    hexCtx.drawImage(splatImg, dx, dy, dw, dh);
    hexCtx.restore();
  }

  hexCtx.save();
  hexCtx.globalCompositeOperation = "source-over";
  hexCtx.fillStyle = "rgba(5, 8, 16, 0.94)";
  for (const cell of hexCells){
    const p = cell.pts;
    hexCtx.beginPath();
    hexCtx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < 6; i++) hexCtx.lineTo(p[i][0], p[i][1]);
    hexCtx.closePath();
    hexCtx.fill();
  }
  hexCtx.restore();

  hexCtx.save();
  hexCtx.lineWidth = 1.15;
  hexCtx.strokeStyle = "rgba(120,170,255,0.18)";
  hexCtx.lineJoin = "round";
  hexCtx.lineCap = "round";

  hexCtx.beginPath();
  for (const cell of hexCells){
    const p = cell.pts;
    hexCtx.moveTo(p[0][0], p[0][1]); hexCtx.lineTo(p[1][0], p[1][1]);
    hexCtx.moveTo(p[1][0], p[1][1]); hexCtx.lineTo(p[2][0], p[2][1]);
    hexCtx.moveTo(p[2][0], p[2][1]); hexCtx.lineTo(p[3][0], p[3][1]);
  }
  hexCtx.stroke();
  hexCtx.restore();
}

// --- ERASE HEX ---
function eraseHex(ctx, pts){
  const expand = 1.55;
  const cx = pts.reduce((s,p)=>s+p[0],0) / 6;
  const cy = pts.reduce((s,p)=>s+p[1],0) / 6;

  ctx.beginPath();
  ctx.moveTo(cx + (pts[0][0]-cx)*expand, cy + (pts[0][1]-cy)*expand);
  for (let i = 1; i < 6; i++){
    ctx.lineTo(cx + (pts[i][0]-cx)*expand, cy + (pts[i][1]-cy)*expand);
  }
  ctx.closePath();
  ctx.fill();
}

function dissolveHexCells(onDone){
  if (!hexCtx) return;

  const order = hexCells
    .map(c => ({ c, k: Math.random() }))
    .sort((a,b)=>a.k-b.k)
    .map(x=>x.c);

  hexCtx.save();
  hexCtx.globalCompositeOperation = "destination-out";
  hexCtx.fillStyle = "rgba(0,0,0,1)";

  let i = 0;
  const batch = prefersReducedMotion ? 9999 : 10;

  const step = () => {
    for (let j = 0; j < batch && i < order.length; j++, i++){
      eraseHex(hexCtx, order[i].pts);
    }
    if (i < order.length) requestAnimationFrame(step);
    else {
      hexCtx.restore();
      onDone?.();
    }
  };

  requestAnimationFrame(step);
}

// --- Crown draw (stable) ---
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

// --- Scramble reveal (FASTER) ---
function scrambleReveal(el, finalText, ms = 520){
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
    const stutter = (t > 0.78 && t < 0.90 && Math.random() < 0.14);

    let out = "";
    for (let i = 0; i < len; i++){
      if (i < revealCount && !stutter) out += finalText[i];
      else out += SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
    }

    el.textContent = out;

    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = finalText;
  }

  requestAnimationFrame(frame);
}

// --- Particle burst ---
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
      x: originX, y: originY,
      vx: Math.cos(a) * sp + rand(-1.2, 1.2),
      vy: Math.sin(a) * sp - rand(0, 2),
      life: rand(420, 820),
      age: 0,
      r: rand(1.2, 3.6),
      hue: rand(38, 66),
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

/* -------- Tabs -------- */
function setActiveTab(name){
  const tabs = document.querySelectorAll(".tab[data-tab]");
  const panels = document.querySelectorAll(".panel[data-panel]");

  tabs.forEach(btn => {
    const isOn = btn.dataset.tab === name;
    btn.classList.toggle("is-active", isOn);
    btn.setAttribute("aria-selected", isOn ? "true" : "false");
  });

  panels.forEach(p => {
    const isOn = p.dataset.panel === name;
    p.classList.toggle("is-active", isOn);
    if (isOn) p.removeAttribute("hidden");
    else p.setAttribute("hidden", "");
  });
}

function bindTabs(){
  const tabs = document.querySelectorAll(".tab[data-tab]");
  tabs.forEach(btn => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setActiveTab(btn.dataset.tab);
      }
    });
  });
}

// --- Click sequence (unchanged) ---
function enter(){
  if (entered) return;
  entered = true;

  document.body.classList.add("entered");
  burstFromCrown();

  const startDissolve = () => {
    dissolveHexCells(() => {
      document.body.classList.add("unlocked");
      setActiveTab("about");
      scrambleReveal(heroTitle, "hi i'm makda", 520);
    });
  };

  setTimeout(startDissolve, prefersReducedMotion ? 0 : 160);
}

// --- Init ---
function init(){
  fitFx();
  fitHex();
  hexCells = buildHexGrid();
  redrawCurtain();
  animateCrownDraw();

  bindTabs();
  setActiveTab("about");

  if (heroTitle) heroTitle.textContent = "";

  document.body.classList.remove("entered","unlocked");
  entered = false;
}

window.addEventListener("DOMContentLoaded", init);
window.addEventListener("resize", () => {
  if (entered) return;
  fitFx();
  fitHex();
  hexCells = buildHexGrid();
  redrawCurtain();
});

crownBtn.addEventListener("click", enter);
crownBtn.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") enter();
});


