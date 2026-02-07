/* app.js - Valentine’s Week full implementation
   - Date unlocks (Asia/Kolkata)
   - 8 minigames (simple, mobile-first)
   - Photo privacy: stored in IndexedDB "valweek-photos"
   - Completed progress saved in localStorage key "valweek_progress"
*/

/* =========================
   CONFIG
   ========================= */

const DAYS = [
  { key: 'rose', date: '2026-02-07', title: 'Rose Day 🌹', desc: 'Tap petals to collect' },
  { key: 'propose', date: '2026-02-08', title: 'Propose Day 💍', desc: 'Photo Jigsaw' },
  { key: 'chocolate', date: '2026-02-09', title: 'Chocolate Day 🍫', desc: 'Stack Choccy pieces' },
  { key: 'teddy', date: '2026-02-10', title: 'Teddy Day 🧸', desc: 'Teddy Hide & Seek' },
  { key: 'promise', date: '2026-02-11', title: 'Promise Day 🤝', desc: 'Choose a promise and sign it' },
  { key: 'hug', date: '2026-02-12', title: 'Hug Day 🤗', desc: 'Hold the screen to warm' },
  { key: 'kiss', date: '2026-02-13', title: 'Kiss Day 💋', desc: 'Timing kiss meter' },
  { key: 'valentine', date: '2026-02-14', title: 'Valentine’s Day ❤️', desc: 'Memory Lane' }
];

const DB_NAME = 'valweek-photos';
const DB_STORE = 'photos';

/* =========================
   UTILS
   ========================= */

function getParams() {
  return new URLSearchParams(window.location.search);
}
const params = getParams();
const devMode = params.get('dev') === '1';
const overrideDate = params.get('date');

function getKolkataDate(override) {
  if (override) return new Date(override + 'T00:00:00+05:30');
  const now = new Date();
  const s = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(s);
}
const today = getKolkataDate(overrideDate);
const todayYMD = today.toISOString().slice(0,10);

function formatDate(ymd) {
  const d = new Date(ymd + 'T00:00:00+05:30');
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}

function saveProgress(key) {
  const p = JSON.parse(localStorage.getItem('valweek_progress') || '{}');
  p[key] = { completed: true, at: new Date().toISOString() };
  localStorage.setItem('valweek_progress', JSON.stringify(p));
}

function isCompleted(key) {
  const p = JSON.parse(localStorage.getItem('valweek_progress') || '{}');
  return p[key] && p[key].completed;
}

/* =========================
   SIMPLE INDEXEDDB WRAPPER
   ========================= */

function openDb() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function idbPut(obj) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    store.put(obj);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function idbGet(id) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const req = store.get(id);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function idbGetAll() {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const req = store.getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function idbDelete(id) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    store.delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

/* =========================
   RENDER DAY CARDS
   ========================= */

const daysContainer = document.getElementById('days');
const modal = document.getElementById('game-modal');
const gameContent = document.getElementById('game-content');
const closeGameBtn = document.getElementById('closeGame');

closeGameBtn.addEventListener('click', closeGame);

DAYS.forEach(day => {
  const unlocked = devMode || todayYMD >= day.date;
  const card = document.createElement('div');
  card.className = 'day-card' + (unlocked ? '' : ' locked');

  const completed = isCompleted(day.key);
  card.innerHTML = `
    <div class="day-row">
      <div class="day-info">
        <h2>${day.title} ${completed ? '✓' : ''}</h2>
        <p class="small">${day.desc}</p>
        <p class="hint small">Date: ${formatDate(day.date)}</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
        ${!unlocked ? `<div class="badge">Unlocks ${formatDate(day.date)}</div>` : ''}
        <button class="btn" ${unlocked ? '' : 'disabled'}>${unlocked ? (completed ? 'Replay' : 'Play') : 'Locked'}</button>
      </div>
    </div>
  `;
  if (unlocked) {
    card.querySelector('button').addEventListener('click', () => openGame(day.key));
  }
  daysContainer.appendChild(card);
});

/* =========================
   MODAL HELPERS
   ========================= */

function openGame(key) {
  gameContent.innerHTML = '';
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  switch (key) {
    case 'rose': renderPetalTap(key); break;
    case 'propose': renderProposeJigsaw(key); break;
    case 'chocolate': renderChocolateStack(key); break;
    case 'teddy': renderTeddyHide(key); break;
    case 'promise': renderPromisePledge(key); break;
    case 'hug': renderVirtualHug(key); break;
    case 'kiss': renderKissMeter(key); break;
    case 'valentine': renderMemoryLane(key); break;
    default: gameContent.textContent = 'Not implemented'; break;
  }
}

function closeGame() {
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  gameContent.innerHTML = '';
}

/* =========================
   1) PETAL TAP — Rose Day
   simple canvas one-tap collect
   ========================= */

function renderPetalTap(key) {
  gameContent.innerHTML = `
    <div>
      <div class="game-title">Rose Day — Petal Tap</div>
      <div class="small">Tap petals as they fall to collect them. Get 20 petals to win.</div>
      <div style="height:18px"></div>
      <div style="background:#fff;border-radius:12px;padding:10px">
        <canvas id="petalCanvas" width="360" height="420" style="width:100%;height:420px;border-radius:10px"></canvas>
        <div style="display:flex;justify-content:space-between;margin-top:8px">
          <div class="small hint">Petals: <span id="petalCount">0</span></div>
          <button id="pt-restart" class="small-btn">Restart</button>
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById('petalCanvas');
  const ctx = canvas.getContext('2d');
  let w = canvas.width, h = canvas.height;
  let petals = [];
  let collected = 0;
  const target = 20;
  const petalCount = document.getElementById('petalCount');
  function seed() {
    petals = [];
    collected = 0;
    petalCount.textContent = '0';
    for (let i=0;i<12;i++) spawnPetal(true);
  }
  function spawnPetal(off=false) {
    petals.push({
      x: Math.random()*w,
      y: off? Math.random()*h*0.3 - 40 : -20 - Math.random()*200,
      vx: (Math.random()-0.5)*0.6,
      vy: 0.5 + Math.random()*1.2,
      r: 8 + Math.random()*10,
      rot: Math.random()*Math.PI*2,
      rotSpeed:(Math.random()-0.5)*0.06,
      color: `hsl(${320 + Math.random()*20}deg 70% 75%)`
    });
  }
  function loop() {
    ctx.clearRect(0,0,w,h);
    // background subtle
    ctx.fillStyle = 'linear-gradient';
    // draw petals
    for (let i=petals.length-1;i>=0;i--) {
      const p = petals[i];
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotSpeed;
      // draw ellipse petal
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.ellipse(0,0,p.r*1.2,p.r*0.7,0,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
      if (p.y > h + 20) {
        petals.splice(i,1);
        spawnPetal();
      }
    }
    requestAnimationFrame(loop);
  }

  function onTap(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const py = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      
      const x = px * scaleX;
      const y = py * scaleY;

    for (let i=petals.length-1;i>=0;i--) {
      const p = petals[i];
      const dx = p.x - x, dy = p.y - y;
      if (dx*dx + dy*dy < (p.r*1.8)*(p.r*1.8)) {
        // collect
        petals.splice(i,1);
        collected++;
        petalCount.textContent = collected;
        spawnPetal();
        // tiny circle pop
        burstAt(ctx, x, y);
        if (collected >= target) {
          showWin('A Rose for my Rose 🌹 (since I cannot give you a real one)', key);
          saveProgress(key);
        }
        break;
      }
    }
  }

  function burstAt(ctx, x, y) {
    for (let i=0;i<6;i++) {
      const a = Math.random()*Math.PI*2;
      const r = 4 + Math.random()*8;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(240,120,160,0.9)';
      ctx.arc(x + Math.cos(a)*r, y + Math.sin(a)*r, 3, 0, Math.PI*2);
      ctx.fill();
    }
  }

  canvas.addEventListener('click', onTap);
  canvas.addEventListener('touchstart', onTap);

  document.getElementById('pt-restart').addEventListener('click', () => {
    seed();
  });

  seed();
  loop();
}

/* =========================
   2) PROPOSE DAY — Photo Jigsaw
   2x3 or 3x3 draggable snap tiles
   ========================= */

function renderProposeJigsaw(key) {
  const IMAGE_URL = './assets/photos/1.jpg';

   gameContent.innerHTML = `
    <div>
      <div class="game-title">Propose Day — Photo Jigsaw</div>
      <div class="small">Upload one photo. Choose grid (2×3 or 3×3). Drag tiles into place.</div>
      <div style="height:10px"></div>

      
      <div style="height:10px"></div>
      <div style="display:flex;gap:8px">
        <button id="grid23" class="small-btn">2 × 3 (easy)</button>
        <button id="grid33" class="small-btn">3 × 3</button>
        <button id="pj-clear" class="small-btn">Clear</button>
      </div>
      <div style="height:12px"></div>
      <div id="pj-board" style="min-height:280px"></div>
    </div>
  `;

  const file = document.getElementById('pj-file');
  const board = document.getElementById('pj-board');
  let imgData = null, rows = 2, cols = 3;

  

  document.getElementById('grid23').addEventListener('click', () => { rows=2; cols=3; startPuzzle(); });
  document.getElementById('grid33').addEventListener('click', () => { rows=3; cols=3; startPuzzle(); });
  

  (async () => {
  try {
    const img = await loadImage(IMAGE_URL);
    imgData = img;
    startPuzzle();
  } catch (e) {
    board.innerHTML = '<div class="small">Image not found.</div>';
  }
})();


  async function startPuzzle() {
    board.innerHTML = '';
    if (!imgData) {
      board.innerHTML = `<div class="small hint">Upload a photo to start the puzzle.</div>`;
      return;
    }
    // compute tile sizes based on board width
    const containerW = Math.min(420, window.innerWidth - 48);
    const tileW = Math.floor(containerW / cols);
    const tileH = Math.floor((imgData.height/imgData.width) * containerW / rows);

    // split onto canvases
    const tiles = [];
    for (let r=0;r<rows;r++){
      for (let c=0;c<cols;c++){
        const sx = Math.floor(c * (imgData.width/cols));
        const sy = Math.floor(r * (imgData.height/rows));
        const sW = Math.ceil(imgData.width/cols);
        const sH = Math.ceil(imgData.height/rows);
        const canvas = document.createElement('canvas');
        canvas.width = sW;
        canvas.height = sH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgData, sx, sy, sW, sH, 0, 0, sW, sH);
        tiles.push({ canvas, r, c, correctIndex: r*cols + c });
      }
    }

    // render board area
    const boardWrap = document.createElement('div');
    boardWrap.style.position = 'relative';
    boardWrap.style.minHeight = (tileH*rows + 20) + 'px';
    boardWrap.style.borderRadius = '10px';
    boardWrap.style.padding = '6px';
    boardWrap.style.background = '#fff';
    board.appendChild(boardWrap);

    // create target grid
    const targetCells = [];
    for (let r=0;r<rows;r++){
      for (let c=0;c<cols;c++){
        const cell = document.createElement('div');
        cell.style.width = tileW + 'px';
        cell.style.height = tileH + 'px';
        cell.style.position = 'absolute';
        cell.style.left = c*tileW + 'px';
        cell.style.top = r*tileH + 'px';
        cell.style.boxSizing='border-box';
        cell.style.borderRadius='8px';
        // subtle placeholder
        cell.style.background = '#faf5f6';
        cell.dataset.index = r*cols + c;
        boardWrap.appendChild(cell);
        targetCells.push(cell);
      }
    }

    // shuffle tiles into tray area (below)
    const tray = document.createElement('div');
    tray.style.marginTop = (rows*tileH + 12) + 'px';
    tray.style.display = 'flex';
    tray.style.flexWrap = 'wrap';
    tray.style.gap = '8px';
    board.appendChild(tray);

    // create draggable elements
    const shuffled = tiles.slice().sort(()=>Math.random()-0.5);
    shuffled.forEach((t,i) => {
      const imgEl = document.createElement('canvas');
      imgEl.width = t.canvas.width;
      imgEl.height = t.canvas.height;
      imgEl.style.width = tileW + 'px';
      imgEl.style.height = tileH + 'px';
      imgEl.style.borderRadius = '8px';
      imgEl.style.touchAction = 'none';
      const ctx = imgEl.getContext('2d');
      ctx.drawImage(t.canvas,0,0);
      imgEl.dataset.correct = t.correctIndex;
      imgEl.dataset.placed = '0';
      tray.appendChild(imgEl);
      makeDraggable(imgEl, boardWrap, targetCells, tileW, tileH);
    });

    // on completion reveal full
    function checkComplete() {
      const placed = Array.from(boardWrap.querySelectorAll('[data-placed="1"]')).length;
      if (placed >= rows*cols) {
        // reveal the full image (fade-in)
        const full = document.createElement('div');
        full.style.position='absolute';
        full.style.left='0';
        full.style.top='0';
        full.style.right='0';
        full.style.bottom='0';
        full.style.display='flex';
        full.style.alignItems='center';
        full.style.justifyContent='center';
        full.style.borderRadius='10px';
        full.style.background = 'rgba(255,255,255,0.0)';
        const fImg = document.createElement('img');
        fImg.src = imgData.src;
        fImg.style.maxWidth='100%';
        fImg.style.maxHeight='100%';
        fImg.style.borderRadius='10px';
        full.appendChild(fImg);
        boardWrap.appendChild(full);
        setTimeout(()=> {
          full.style.background='rgba(0,0,0,0.02)';
        },100);
        showWin('So pretty 🥺 Will you be my Valentine?', 'propose');
        saveProgress('propose');
      }
    }

    function makeDraggable(el, boardEl, targets, tileW, tileH) {
      el.style.position = 'absolute';
      el.style.left = (Math.random()*(boardEl.clientWidth - tileW)) + 'px';
      el.style.top = (boardEl.clientHeight + 12 + Math.random()*80) + 'px';
      el.style.zIndex = 50;
      boardEl.appendChild(el);

      let dragging = false, offsetX=0, offsetY=0;

      function pointerDown(e) {
        e.preventDefault();
        dragging = true;
        el.setPointerCapture && el.setPointerCapture(e.pointerId);
        const rect = el.getBoundingClientRect();
        offsetX = (e.clientX) - rect.left;
        offsetY = (e.clientY) - rect.top;
        el.style.transition = 'none';
        el.style.zIndex = 999;
      }
      function pointerMove(e) {
        if (!dragging) return;
        const parentRect = boardEl.getBoundingClientRect();
        const x = e.clientX - parentRect.left - offsetX;
        const y = e.clientY - parentRect.top - offsetY;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
      }
      function pointerUp(e) {
        if (!dragging) return;
        dragging = false;
        el.releasePointerCapture && el.releasePointerCapture(e.pointerId);
        el.style.zIndex = 50;
        el.style.transition = 'left .12s, top .12s';
        // snap check
        const parentRect = boardEl.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const ex = elRect.left - parentRect.left + elRect.width/2;
        const ey = elRect.top - parentRect.top + elRect.height/2;
        let snapped = false;
        for (const t of targets) {
          const tr = t.getBoundingClientRect();
          const tx = tr.left - parentRect.left + tr.width/2;
          const ty = tr.top - parentRect.top + tr.height/2;
          const dist = Math.hypot(tx-ex, ty-ey);
          if (dist < Math.max(tileW, tileH) * 0.45) {
            // snap
            el.style.left = (t.offsetLeft) + 'px';
            el.style.top = (t.offsetTop) + 'px';
            // check correct index
            if (parseInt(el.dataset.correct,10) === parseInt(t.dataset.index,10)) {
              el.dataset.placed = '1';
              t.style.background = 'transparent';
            } else {
              // wrong spot -> little shake
              el.dataset.placed = '0';
              el.style.left = (Math.random()*(boardEl.clientWidth - tileW)) + 'px';
              el.style.top = (boardEl.clientHeight + 12 + Math.random()*80) + 'px';
            }
            snapped = true;
            break;
          }
        }
        if (!snapped) {
          // return to tray-ish
          el.style.left = (Math.random()*(boardEl.clientWidth - tileW)) + 'px';
          el.style.top = (boardEl.clientHeight + 12 + Math.random()*80) + 'px';
          el.dataset.placed = '0';
        }
        setTimeout(checkComplete, 180);
      }

      el.style.touchAction='none';
      el.addEventListener('pointerdown', pointerDown);
      window.addEventListener('pointermove', pointerMove);
      window.addEventListener('pointerup', pointerUp);
    }
  }
}

/* =========================
   3) CHOCOLATE STACK
   click to drop a bar, keep it balanced
   ========================= */

function renderChocolateStack(key) {
  gameContent.innerHTML = `
    <div>
      <div class="game-title">Chocolate Day — Stack the Bars</div>
      <div class="small">Tap to drop a bar. Stack as high as you can. 10 bars to win.</div>
      <div style="height:10px"></div>
      <canvas id="chocCanvas" width="360" height="420" style="width:100%;height:420px;border-radius:10px"></canvas>
      <div style="display:flex;justify-content:space-between;margin-top:8px">
        <div class="small hint">Height: <span id="chocHeight">0</span></div>
        <button id="choc-drop" class="small-btn">Drop</button>
      </div>
    </div>
  `;
  const canvas = document.getElementById('chocCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const bars = [];
  let gravity = 0.7;
  const target = 10;
  const heightEl = document.getElementById('chocHeight');

  function draw() {
    ctx.clearRect(0,0,W,H);
    // base
    ctx.fillStyle='#fff1f3';
    ctx.fillRect(0,0,W,H);
    // platform
    ctx.fillStyle='#ffe6ea';
    ctx.fillRect(30,H-28,W-60,24);
    // draw bars
    for (const b of bars) {
      ctx.save();
      ctx.translate(b.x,b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = '#7b3f2f';
      ctx.fillRect(-b.w/2,-b.h/2,b.w,b.h);
      ctx.restore();
    }
    requestAnimationFrame(draw);
  }

  function spawnBar() {
    const w = 120 + Math.random()*40;
    const h = 18;
    const bar = {
      x: W/2,
      y: 40,
      vx: (Math.random()-0.5)*1,
      vy: 0,
      rot: (Math.random()-0.5)*0.02,
      w, h,
      settled: false
    };
    bars.push(bar);
  }

  function physicsStep() {
    for (let i=0;i<bars.length;i++){
      const b = bars[i];
      if (b.settled) continue;
      b.vy += gravity;
      b.x += b.vx;
      b.y += b.vy;
      b.rot += (Math.random()-0.5)*0.004;
      // collides with top of stack (simple)
      if (b.y + b.h/2 > H-28) {
        b.y = H-28 - b.h/2;
        b.vy = 0;
        b.vx *= 0.2;
        b.rot *= 0.2;
        b.settled = true;
      } else {
        for (let j=0;j<i;j++){
          const other = bars[j];
          // simple distance check
          const dx = b.x - other.x;
          const dy = b.y - other.y;
          if (Math.abs(dx) < (b.w+other.w)/2 && Math.abs(dy) < (b.h+other.h)/2) {
            // nudge
            b.vy = -Math.abs(b.vy)*0.3;
            b.x += dx*0.02;
          }
        }
      }
    }
    setTimeout(physicsStep, 20);
    heightEl.textContent = bars.length;
    if (bars.length >= target) {
      showWin('Stacked 10 bars — sweet win!');
      saveProgress('chocolate');
    }
  }

  document.getElementById('choc-drop').addEventListener('click', () => spawnBar());
  spawnBar();
  physicsStep();
  draw();
}

/* =========================
   4) TEDDY HIDE & SEEK
   click/tap to find teddy in a generated scene
   ========================= */

function renderTeddyHide(key) {
  gameContent.innerHTML = `
    <div>
      <div class="game-title">Teddy Day — Hide & Seek</div>
      <div class="small">Tap around the scene to find the hidden teddy. He hides behind objects.</div>
      <div style="height:12px"></div>
      <canvas id="teddyCanvas" width="360" height="420" style="width:100%;height:420px;border-radius:12px"></canvas>
      <div style="height:8px"></div>
      <div class="small hint">Find him to reveal a sweet caption.</div>
    </div>
  `;
  const canvas = document.getElementById('teddyCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // simple scene: couch + rug + plant; teddy hidden at random x,y
  const teddy = { x: 80 + Math.random()*(W-160), y: 120 + Math.random()*(H-180), r: 26, found: false };

  function drawScene() {
    // bg
    ctx.fillStyle = '#fff8f9';
    ctx.fillRect(0,0,W,H);
    // rug
    ctx.fillStyle = '#fff1f3';
    roundRect(ctx, 20, H-140, W-40, 110, 16, true);
    // couch (simple)
    ctx.fillStyle = '#ffdfe6';
    roundRect(ctx, 40, H-220, W-80, 100, 16, true);
    // plant (left)
    ctx.fillStyle='#e9fbe9';
    roundRect(ctx, 18, H-320, 56, 80, 10, true);
    // overlapping shadows so teddy can be behind
    // teddy drawn in a way that part covered
    // draw teddy partly covered if not found
    if (!teddy.found) {
      // cover-shaped shadow
      ctx.fillStyle='rgba(255,245,246,0.9)';
      roundRect(ctx, teddy.x-30, teddy.y-10, 60, 50, 12, true);
    }
    // small decor
    ctx.fillStyle='#f7d8e0';
    ctx.fillRect(W-80, 40, 44, 44);
    // if found, draw teddy fully
    if (teddy.found) {
      drawTeddy(ctx, teddy.x, teddy.y);
    } else {
      // draw a small ear peeking
      drawTeddyEar(ctx, teddy.x, teddy.y+10);
    }
    requestAnimationFrame(drawScene);
  }

  function drawTeddy(ctx,x,y){
    ctx.save();
    ctx.translate(x,y);
    ctx.fillStyle='#e6a87a';
    ctx.beginPath();ctx.arc(0,0,22,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d28a5c';
    ctx.beginPath();ctx.arc(-8,-10,6,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(8,-10,6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='black';
    ctx.beginPath();ctx.arc(-5,0,2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(5,0,2,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  function drawTeddyEar(ctx,x,y){
    ctx.save();
    ctx.translate(x,y);
    ctx.fillStyle='#e6a87a';
    ctx.beginPath();ctx.ellipse(-6,0,8,10,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  function roundRect(ctx,x,y,w,h,r,fill){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
    if (fill) ctx.fill();
  }

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const d = Math.hypot(cx - teddy.x, cy - teddy.y);
    if (d < teddy.r + 18) {
      teddy.found = true;
      showWin("Found him! You're the best seeker ❤️", key);
      saveProgress(key);
    } else {
      // playful ripple
      rippleAt(ctx, cx, cy);
    }
  });

  function rippleAt(ctx,x,y){
    const maxR = 50;
    let r=6;
    const id = setInterval(()=> {
      ctx.beginPath();
      ctx.strokeStyle='rgba(200,120,150,0.6)';
      ctx.lineWidth=2;
      ctx.arc(x,y,r,0,Math.PI*2);
      ctx.stroke();
      r += 6;
      if (r>maxR) clearInterval(id);
    },40);
  }

  drawScene();
}

/* =========================
   5) PROMISE PLEDGE
   choose pledge, sign (canvas), export as PNG
   ========================= */

function renderPromisePledge(key) {
  gameContent.innerHTML = `
    <div>
      <div class="game-title">Promise Day — Pledge & Sign</div>
      <div class="small">Choose a sweet promise, sign it with your finger, and download the card.</div>
      <div style="height:10px"></div>
      <select id="pp-promise" style="width:100%;padding:10px;border-radius:10px">
        <option value="I will always make you coffee in the mornings">I will always make you coffee in the mornings</option>
        <option value="I will hold your hand in crowded places">I will hold your hand in crowded places</option>
        <option value="I will laugh at your bad jokes">I will laugh at your bad jokes</option>
        <option value="I will make time for us every week">I will make time for us every week</option>
      </select>
      <div style="height:10px"></div>
      <canvas id="sigCanvas" class="signature" width="720" height="300"></canvas>
      <div style="height:8px"></div>
      <div style="display:flex;gap:8px">
        <button id="sig-clear" class="small-btn">Clear</button>
        <button id="sig-save" class="small-btn">Save Card</button>
      </div>
    </div>
  `;
  const canvas = document.getElementById('sigCanvas');
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#b0304a';
  let drawing = false;
  let last = null;

  function toLocalCoords(e){
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: x * (canvas.width/rect.width), y: y * (canvas.height/rect.height) };
  }

  canvas.addEventListener('pointerdown', (e)=> {
    drawing = true; last = toLocalCoords(e); ctx.beginPath(); ctx.moveTo(last.x, last.y);
  });
  window.addEventListener('pointermove', (e)=> {
    if (!drawing) return;
    const p = toLocalCoords(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  window.addEventListener('pointerup', ()=> { drawing=false; last=null; });

  document.getElementById('sig-clear').addEventListener('click', () => {
    ctx.clearRect(0,0,canvas.width,canvas.height);
  });

  document.getElementById('sig-save').addEventListener('click', async () => {
    const promiseText = document.getElementById('pp-promise').value;
    // create a card canvas
    const cardW = 1200, cardH = 800;
    const c = document.createElement('canvas');
    c.width = cardW; c.height = cardH;
    const cctx = c.getContext('2d');
    // bg
    cctx.fillStyle = '#fff6f7';
    cctx.fillRect(0,0,cardW,cardH);
    // title
    cctx.fillStyle = '#b0304a';
    cctx.font = '48px Inter, sans-serif';
    cctx.fillText('My Promise', 60, 120);
    // promise text
    cctx.fillStyle = '#333';
    cctx.font = '34px Inter, sans-serif';
    wrapText(cctx, promiseText, 60, 200, cardW-120, 42);
    // paste signature
    cctx.drawImage(canvas, 60, 320, 800, 200);
    // small footer
    cctx.fillStyle = '#b0304a';
    cctx.font = '20px Inter';
    cctx.fillText('Signed with love', 60, 560);
    // finish
    const dataUrl = c.toDataURL('image/png');
    downloadDataUrl(dataUrl, 'promise-card.png');
    showWin('Saved your promise!', key);
    saveProgress(key);
  });

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }
}

/* =========================
   6) VIRTUAL HUG
   hold the screen to warm the scene
   ========================= */

function renderVirtualHug(key) {
  gameContent.innerHTML = `
    <div>
      <div class="game-title">Hug Day — Virtual Hug</div>
      <div class="small">Place a finger on the screen and hold to warm the scene. Hold for 6 seconds to win.</div>
      <div style="height:12px"></div>
      <div style="background:#fff;padding:12px;border-radius:12px">
        <div id="hugArea" style="height:360px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-direction:column">
          <div id="hugText" class="small">Hold to hug</div>
          <div style="height:12px"></div>
          <div style="width:80%;height:12px;background:#ffeef3;border-radius:8px;overflow:hidden">
            <div id="hugBar" style="height:100%;width:0%;background:linear-gradient(90deg,#f8a5b6,#f0627e)"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  const hugArea = document.getElementById('hugArea');
  const hugBar = document.getElementById('hugBar');
  const hugText = document.getElementById('hugText');
  let progress = 0;
  let holdTimer = null;
  let lastTime = null;
  const needed = 6000; // ms
  function startHold() {
    if (holdTimer) return;
    lastTime = performance.now();
    holdTimer = requestAnimationFrame(step);
    hugText.textContent = 'Holding...';
  }
  function step(now) {
    const dt = now - lastTime;
    lastTime = now;
    progress += dt;
    const pct = Math.min(100, (progress/needed)*100);
    hugBar.style.width = pct + '%';
    // warm background color proportional
    const warm = 220 + Math.floor((progress/needed)*30);
    hugArea.style.background = `rgb(255,${warm},${warm})`;
    if (progress >= needed) {
      cancelAnimationFrame(holdTimer);
      holdTimer = null;
      showWin("That was a warm hug ❤️", key);
      saveProgress(key);
      hugText.textContent = 'You did it!';
      return;
    }
    holdTimer = requestAnimationFrame(step);
  }
  function stopHold() {
    if (holdTimer) { cancelAnimationFrame(holdTimer); holdTimer = null; }
    progress = Math.max(0, progress - 800); // slight decay
    const pct = Math.min(100, (progress/needed)*100);
    hugBar.style.width = pct + '%';
    hugText.textContent = 'Hold to hug';
    hugArea.style.background = '';
  }
  hugArea.addEventListener('pointerdown', (e)=> { e.preventDefault(); startHold(); });
  window.addEventListener('pointerup', stopHold);
  hugArea.addEventListener('pointerleave', stopHold);
}

/* =========================
   7) KISS METER
   press to charge, release at sweet spot
   ========================= */

function renderKissMeter(key) {
  gameContent.innerHTML = `
    <div>
      <div class="game-title">Kiss Day — Kiss Meter</div>
      <div class="small">Press & hold to fill the meter. Release in the green zone for the perfect kiss.</div>
      <div style="height:12px"></div>
      <div style="background:white;padding:12px;border-radius:12px">
        <div style="height:260px;display:flex;align-items:center;justify-content:center;flex-direction:column">
          <div style="width:80%;height:18px;background:#ffeef3;border-radius:8px;position:relative;overflow:hidden">
            <div id="kissFill" style="height:100%;width:0%;background:linear-gradient(90deg,#ff8aa8,#f0627e)"></div>
            <div style="position:absolute;left:60%;top:-6px;width:6px;height:30px;background:rgba(0,0,0,0.06)"></div>
            <div style="position:absolute;left:40%;top:-6px;width:6px;height:30px;background:rgba(0,0,0,0.06)"></div>
            <div style="position:absolute;left:48%;top:-6px;width:6px;height:30px;background:rgba(0,0,0,0.06)"></div>
          </div>
          <div style="height:14px"></div>
          <button id="kiss-press" class="btn" style="width:220px">Press & Hold</button>
        </div>
      </div>
    </div>
  `;
  const fill = document.getElementById('kissFill');
  const btn = document.getElementById('kiss-press');
  let charging = false;
  let pct = 0;
  const rate = 0.6; // percent per tick
  const perfectRange = [45, 65];

  let interval = null;
  function startCharge() {
    if (charging) return;
    charging = true;
    interval = setInterval(()=> {
      pct = Math.min(100, pct + rate + Math.random()*0.6);
      fill.style.width = pct + '%';
    }, 20);
    btn.textContent = 'Release';
  }
  function release() {
    if (!charging) return;
    charging = false;
    clearInterval(interval); interval = null;
    // evaluate
    const score = pct;
    let msg = '';
    if (score >= perfectRange[0] && score <= perfectRange[1]) {
      msg = "Perfect kiss! 😘";
      showWin(msg, key);
      saveProgress(key);
    } else if (score < perfectRange[0]) {
      msg = "Too shy! Try again.";
    } else {
      msg = "Too overenthusiastic! Try again.";
    }
    alert(msg);
    // reset slowly
    const id = setInterval(()=> {
      pct = Math.max(0, pct - 4);
      fill.style.width = pct + '%';
      if (pct <= 0) clearInterval(id);
    }, 40);
    btn.textContent = 'Press & Hold';
  }

  btn.addEventListener('pointerdown', (e)=> { e.preventDefault(); startCharge(); });
  window.addEventListener('pointerup', release);
}

/* =========================
   8) MEMORY LANE — Valentine’s Day
   Upload 3–5 photos. Owner sets 'correct' choices beforehand.
   ========================= */

function renderMemoryLane(key) {
const MEMORY_LANE_CONFIG = [
  {
    src: './assets/photos/2.jpg',
    captionA: 'Our first photo',
    captionB: 'Our second photo',
    correct: 'A'
  },
  {
    src: './assets/photos/valentines/3.jpg',
    captionA: 'Upvan',
    captionB: 'Airoli Park Walk',
    correct: 'A'
  },
  {
    src: './assets/photos/valentines/4.jpg',
    captionA: 'Our first concert',
    captionB: 'Our only concert',
    correct: 'A'
  }
];


function playMemoryLane(photos, key) {
  let index = 0;
  let score = 0;

  function renderSlide() {
    if (index >= photos.length) {
      renderFinalLetter();
      saveProgress(key);
      return;
    }

    const p = photos[index];

    gameContent.innerHTML = `
      <div>
        <div class="game-title">Memory ${index + 1} / ${photos.length}</div>
        <div style="height:12px"></div>

        <div style="background:#fff;padding:12px;border-radius:12px">
          <div style="height:220px;border-radius:10px;overflow:hidden;margin-bottom:12px">
            <img src="${p.img.src}" style="width:100%;height:100%;object-fit:cover">
          </div>

          <div style="display:flex;gap:8px">
            <button id="optA" class="small-btn">${escapeHtml(p.captionA)}</button>
            <button id="optB" class="small-btn">${escapeHtml(p.captionB)}</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('optA').onclick = () => handleAnswer('A');
    document.getElementById('optB').onclick = () => handleAnswer('B');

    function handleAnswer(choice) {
      if (choice === p.correct) {
        score++;
      }
      index++;
      setTimeout(renderSlide, 300);
    }
  }

  function renderFinalLetter() {
    let letter;
    if (score === photos.length) {
      letter = `Perfect score ❤️

You remember the little things.
That’s why I love you.
Happy Valentine’s Day.`;
    } else if (score >= Math.ceil(photos.length * 0.6)) {
      letter = `You got most of them right.

What matters is that these moments exist —
and that we keep making more together ❤️`;
    } else {
      letter = `Some memories fade,
but what we have doesn’t.

Happy Valentine’s Day ❤️`;
    }

    gameContent.innerHTML = `
      <div>
        <div class="game-title">For You ❤️</div>
        <div style="background:#fff;padding:16px;border-radius:12px;white-space:pre-line">
          ${escapeHtml(letter)}
        </div>
      </div>
    `;
  }

  renderSlide();
}


  function wrapTextCanvas(ctx, text, x, y, maxW) {
    ctx.font = '28px Inter';
    ctx.fillStyle = '#222';
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (let n=0;n<words.length;n++){
      const testLine = line + words[n] + ' ';
      const width = ctx.measureText(testLine).width;
      if (width > maxW && n>0) {
        ctx.fillText(line, x, yy);
        line = words[n] + ' ';
        yy += 36;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, yy);
  }
}

/* =========================
   UTIL: file -> dataURL
   ========================= */

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = ()=> res(fr.result);
    fr.onerror = ()=> rej(fr.error);
    fr.readAsDataURL(file);
  });
}
function loadImage(dataUrl) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = ()=> res(img);
    img.onerror = rej;
    img.src = dataUrl;
  });
}
function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function escapeHtml(s){ return (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* =========================
   SMALL SHARED UX
   ========================= */

function showWin(text, key=undefined) {
  // brief celebratory overlay
  const overlay = document.createElement('div');
  overlay.style.position='fixed';
  overlay.style.left='0'; overlay.style.right='0'; overlay.style.top='0'; overlay.style.bottom='0';
  overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center';
  overlay.style.background='rgba(0,0,0,0.35)'; overlay.style.zIndex=3000;
  const card = document.createElement('div');
  card.style.background='#fff'; card.style.padding='20px'; card.style.borderRadius='12px'; card.style.textAlign='center'; card.style.maxWidth='90%';
  card.innerHTML = `<div style="font-size:1.1rem;font-weight:600;color:#b0304a">${escapeHtml(text)}</div><div style="height:12px"></div><button class="small-btn">Accept 🥺</button>`;
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  card.querySelector('button').addEventListener('click', ()=> { overlay.remove(); });
}

/* =========================
   small helpers used earlier
   ========================= */

function heartBurst() {
  // small ephemeral hearts
  const h = document.createElement('div');
  h.style.position='fixed'; h.style.left='50%'; h.style.top='20%'; h.style.transform='translateX(-50%)';
  h.style.zIndex=4000;
  h.innerHTML = '<div style="font-size:2rem">💖</div>';
  document.body.appendChild(h);
  setTimeout(()=> h.remove(),900);
}
