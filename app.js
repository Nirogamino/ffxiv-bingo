const CENTER = 12;
const OMEGA_SRC = 'omega.svg';
const LINES = [];
for (let r = 0; r < 5; r++) LINES.push([0, 1, 2, 3, 4].map(c => r * 5 + c));
for (let c = 0; c < 5; c++) LINES.push([0, 1, 2, 3, 4].map(r => r * 5 + c));
LINES.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);

const $ = s => document.querySelector(s);

// ---------- utils ----------
function normalize(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim();
}
function keyOf(t) {
  let h = 5381;
  for (const ch of normalize(t)) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0;
  return 'b' + h.toString(36);
}
function padCells(cells) {
  const out = Array.from({ length: 25 }, () => '');
  (Array.isArray(cells) ? cells : []).forEach((v, i) => { if (i < 25) out[i] = String(v || ''); });
  return out;
}
function isHit(cells, i) {
  if (i === CENTER) return true;
  const v = cells[i];
  return !!v && !!confirmed[keyOf(v)];
}
function countHits(cells) {
  let n = 0;
  for (let i = 0; i < 25; i++) if (i !== CENTER && isHit(cells, i)) n++;
  return n;
}
function countLines(cells) {
  return LINES.filter(ln => ln.every(i => isHit(cells, i))).length;
}
function countFilled(cells) {
  let n = 0;
  for (let i = 0; i < 25; i++) if (i !== CENTER && normalize(cells[i])) n++;
  return n;
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2800);
}

// ---------- state ----------
let myId = localStorage.getItem('ffb_myId') || '';
if (!myId) { myId = 'u' + Math.random().toString(36).slice(2, 12); localStorage.setItem('ffb_myId', myId); }
let myCard = null;
let cards = {};
let confirmed = {};
let viewing = null;
let hostOpen = false;
let useFirebase = false;
let fdb = null; // {db, doc, setDoc, updateDoc, deleteDoc, collection, onSnapshot}

function validate() {
  if (!myCard) return 'Sin cartón.';
  const seen = new Set();
  const filled = countFilled(myCard.cells);
  for (let i = 0; i < 25; i++) {
    if (i === CENTER) continue;
    const raw = myCard.cells[i];
    const v = normalize(raw);
    if (!v) continue;
    if (seen.has(v)) return `"${raw.trim()}" aparece dos veces.`;
    seen.add(v);
  }
  if (filled < 24) return `Te faltan ${24 - filled} apuestas por escribir.`;
  return null;
}

// ---------- UI ----------
function buildGrid(container, cells, editable) {
  container.innerHTML = '';
  for (let i = 0; i < 25; i++) {
    const d = document.createElement('div');
    d.className = 'cell';
    d.dataset.i = i;
    if (i === CENTER) {
      d.classList.add('free');
      const img = document.createElement('img');
      img.src = OMEGA_SRC; img.alt = 'Omega';
      const s = document.createElement('span');
      s.textContent = 'FREE';
      d.append(img, s);
    } else if (editable) {
      const ta = document.createElement('textarea');
      ta.maxLength = 60;
      ta.placeholder = 'Tu apuesta…';
      ta.value = cells[i] || '';
      ta.oninput = () => onType(i, ta.value);
      d.appendChild(ta);
    } else {
      d.textContent = cells[i] || '· · ·';
    }
    container.appendChild(d);
  }
}
function renderHits(container, cells) {
  if (!cells) return;
  container.querySelectorAll('.cell').forEach(d => {
    const i = +d.dataset.i;
    if (i === CENTER) return;
    d.classList.toggle('hit', isHit(cells, i));
  });
}
function renderMe() {
  const hasCard = !!myCard;
  $('#joinPanel').classList.toggle('hidden', hasCard);
  $('#cardPanel').classList.toggle('hidden', !hasCard);
  if (!hasCard) return;
  const cells = myCard.cells;
  const hits = countHits(cells), lines = countLines(cells), filled = countFilled(cells);
  const err = validate();
  $('#myStatus').textContent =
    `Aciertos ${hits}/24 · Líneas ${lines} · Escritas ${filled}/24 · ${myCard.locked ? '🔒 Validado' : 'Sin validar'} · ${useFirebase ? 'en vivo ☁️' : 'local 📁'}`;
  $('#lockBtn').classList.toggle('hidden', myCard.locked);
  $('#unlockBtn').classList.toggle('hidden', !myCard.locked);
  $('#lockBtn').disabled = !!err;
  $('#validMsg').textContent = myCard.locked ? '' : (err || '¡Todo listo! Ya puedes validar.');
  const b = $('#bingoBanner');
  b.classList.toggle('hidden', lines === 0);
  b.textContent = `¡BINGO! ${lines} línea(s) · Celebración, nadie gana`;
  renderHits($('#myGrid'), cells);
}
function renderBoard() {
  const tb = $('#board');
  const rows = Object.entries(cards).map(([id, c]) => {
    const cells = padCells(c.cells);
    return { id, name: c.name || 'Anónimo', cells, locked: !!c.locked, hits: countHits(cells), lines: countLines(cells), filled: countFilled(cells) };
  }).sort((a, b) => b.lines - a.lines || b.hits - a.hits || a.name.localeCompare(b.name));
  tb.innerHTML = '';
  if (!rows.length) { tb.innerHTML = '<tr><td colspan="4">Aún nadie. ¡Entra tú primero!</td></tr>'; return; }
  rows.forEach(p => {
    const tr = document.createElement('tr');
    tr.className = 'clickable'; tr.dataset.id = p.id;
    const tdN = document.createElement('td'); tdN.textContent = p.name + (p.locked ? ' 🔒' : '');
    if (p.id === myId) tdN.textContent += ' (tú)';
    const tdH = document.createElement('td'); tdH.textContent = `${p.hits}/24`;
    const tdL = document.createElement('td'); tdL.textContent = p.lines ? `🎉 ${p.lines}` : '0';
    const tdF = document.createElement('td'); tdF.textContent = `${p.filled}/24`;
    tr.append(tdN, tdH, tdL, tdF);
    tb.appendChild(tr);
  });
}
function renderViewer() {
  const c = viewing && cards[viewing];
  $('#viewPanel').classList.toggle('hidden', !c);
  if (!c) return;
  const cells = padCells(c.cells);
  $('#viewTitle').textContent = `Cartón de ${c.name || 'Anónimo'}`;
  buildGrid($('#viewGrid'), cells, false);
  renderHits($('#viewGrid'), cells);
}
function renderFeed() {
  const ul = $('#feed');
  const items = Object.entries(confirmed).sort((a, b) => (b[1].at || 0) - (a[1].at || 0)).slice(0, 15);
  ul.innerHTML = '';
  if (!items.length) { ul.innerHTML = '<li>Aún no ha pasado nada...</li>'; return; }
  items.forEach(([, c]) => { const li = document.createElement('li'); li.textContent = '✦ ' + (c.text || ''); ul.appendChild(li); });
}
function renderHost() {
  const map = {};
  Object.values(cards).forEach(c => padCells(c.cells).forEach((v, i) => {
    if (i === CENTER || !normalize(v)) return;
    const k = keyOf(v);
    if (!map[k]) map[k] = { text: v.trim(), count: 0 };
    map[k].count++;
  }));
  const list = $('#hostList');
  list.innerHTML = '';
  const entries = Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  if (!entries.length) { list.textContent = 'Aún no hay apuestas escritas.'; return; }
  entries.forEach(([k, o]) => {
    const b = document.createElement('button');
    b.className = 'betbtn' + (confirmed[k] ? ' on' : '');
    const label = document.createElement('span');
    label.textContent = (confirmed[k] ? '★ ' : '') + o.text;
    const n = document.createElement('small');
    n.textContent = `×${o.count}`;
    b.append(label, n);
    b.onclick = () => toggleBet(k, o.text, !confirmed[k]);
    list.appendChild(b);
  });
}
function render() { renderMe(); renderBoard(); renderFeed(); renderViewer(); if (hostOpen) renderHost(); }

// ---------- storage ----------
function persistLocal() {
  localStorage.setItem('ffb_cards', JSON.stringify(cards));
  localStorage.setItem('ffb_confirmed', JSON.stringify(confirmed));
}
function loadLocal() {
  try { cards = JSON.parse(localStorage.getItem('ffb_cards') || '{}'); } catch { cards = {}; }
  try { confirmed = JSON.parse(localStorage.getItem('ffb_confirmed') || '{}'); } catch { confirmed = {}; }
  myCard = cards[myId] ? { name: cards[myId].name, cells: padCells(cards[myId].cells), locked: !!cards[myId].locked } : null;
  if (myCard) buildGrid($('#myGrid'), myCard.cells, !myCard.locked);
  render();
}
async function saveCellsLocal(cells) {
  cards[myId] = { name: myCard.name, cells, locked: myCard.locked };
  myCard.cells = cells.slice();
  persistLocal(); render();
}

let saveT = null;
function onType(i, value) {
  myCard.cells[i] = value;
  renderMe(); renderBoard(); if (hostOpen) renderHost();
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    if (useFirebase) saveCellsFirebase(myCard.cells.slice());
    else saveCellsLocal(myCard.cells.slice());
  }, 500);
}

async function joinGame(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 20);
  if (!name) { toast('Pon un nombre para entrar.'); return; }
  localStorage.setItem('ffb_name', name);
  if (useFirebase) {
    const { doc, setDoc } = fdb;
    try {
      await setDoc(doc(fdb.db, 'cards', myId), { name, cells: Array(25).fill(''), locked: false }, { merge: true });
    } catch (e) { toast('Error: ' + e.message); }
  } else {
    if (!cards[myId]) {
      cards[myId] = { name, cells: Array(25).fill(''), locked: false };
      persistLocal();
    } else {
      cards[myId].name = name; persistLocal();
    }
    myCard = { name, cells: padCells(cards[myId].cells), locked: !!cards[myId].locked };
    buildGrid($('#myGrid'), myCard.cells, !myCard.locked);
    render();
  }
}

async function saveCellsFirebase(cells) {
  try {
    const { doc, updateDoc } = fdb;
    await updateDoc(doc(fdb.db, 'cards', myId), { cells });
  } catch (e) { toast('No se guardó: ' + e.message); }
}
async function lockCard() {
  const err = validate();
  if (err) { toast(err); return; }
  clearTimeout(saveT);
  if (useFirebase) {
    try {
      const { doc, updateDoc } = fdb;
      await updateDoc(doc(fdb.db, 'cards', myId), { cells: myCard.cells.slice(), locked: true });
      toast('🔒 ¡Cartón validado!');
    } catch (e) { toast('No se pudo validar: ' + e.message); }
  } else {
    cards[myId] = { name: myCard.name, cells: myCard.cells.slice(), locked: true };
    myCard.locked = true; persistLocal();
    buildGrid($('#myGrid'), myCard.cells, false);
    toast('🔒 ¡Cartón validado!');
    render();
  }
}
async function unlockCard() {
  if (useFirebase) {
    try {
      const { doc, updateDoc } = fdb;
      await updateDoc(doc(fdb.db, 'cards', myId), { locked: false });
      buildGrid($('#myGrid'), myCard.cells, true);
    } catch (e) { toast(e.message); }
  } else {
    myCard.locked = false; cards[myId].locked = false; persistLocal();
    buildGrid($('#myGrid'), myCard.cells, true);
    render();
  }
}
async function toggleBet(k, text, on) {
  if (useFirebase) {
    try {
      const { doc, setDoc, deleteDoc } = fdb;
      if (on) await setDoc(doc(fdb.db, 'confirmed', k), { text, at: Date.now() });
      else await deleteDoc(doc(fdb.db, 'confirmed', k));
    } catch (e) { toast(e.message); }
  } else {
    if (on) confirmed[k] = { text, at: Date.now() };
    else delete confirmed[k];
    persistLocal(); render();
  }
}

// ---------- init firebase (opcional) ----------
async function tryFirebase() {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey || cfg.apiKey.includes('PEGA_AQUI')) return false;
  try {
    const appMod = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const fsMod = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const auMod = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    const app = appMod.initializeApp(cfg);
    const db = fsMod.getFirestore(app);
    const auth = auMod.getAuth(app);
    await auMod.signInAnonymously(auth);
    fdb = { db, ...fsMod };
    useFirebase = true;
    fsMod.onSnapshot(fsMod.collection(db, 'cards'), snap => {
      cards = {};
      snap.docs.forEach(d => { cards[d.id] = d.data(); });
      // si es mi primera vez, crear; si ya existe, sincronizar
      if (cards[myId]) {
        const mine = cards[myId];
        const localName = localStorage.getItem('ffb_name');
        myCard = { name: mine.name, cells: padCells(mine.cells), locked: !!mine.locked };
        if (!myCard.locked) {
          // reconstruir grid solo si no estoy escribiendo: hacerlo simple, no pisar foco
          const active = document.activeElement?.tagName === 'TEXTAREA';
          if (!active) buildGrid($('#myGrid'), myCard.cells, true);
        } else {
          buildGrid($('#myGrid'), myCard.cells, false);
        }
      } else if (localStorage.getItem('ffb_name')) {
        joinGame(localStorage.getItem('ffb_name'));
      }
      render();
    });
    fsMod.onSnapshot(fsMod.collection(db, 'confirmed'), snap => {
      confirmed = {};
      snap.docs.forEach(d => { confirmed[d.id] = d.data(); });
      render();
    });
    return true;
  } catch (e) {
    console.warn('Firebase falló, modo local:', e);
    return false;
  }
}

// ---------- events ----------
$('#joinForm').onsubmit = e => { e.preventDefault(); joinGame($('#nameInput').value); };
$('#lockBtn').onclick = lockCard;
$('#unlockBtn').onclick = unlockCard;
$('#board').onclick = e => { const tr = e.target.closest('tr[data-id]'); if (tr) { viewing = tr.dataset.id; renderViewer(); } };
$('#hostBtn').onclick = () => { hostOpen = !hostOpen; $('#hostPanel').classList.toggle('hidden', !hostOpen); if (hostOpen) renderHost(); };
$('#exportBtn').onclick = () => {
  if (!myCard) return;
  const blob = new Blob([JSON.stringify({ name: myCard.name, cells: myCard.cells }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `bingo-${myCard.name || 'carton'}.json`; a.click();
};

(async function init() {
  $('#nameInput').value = localStorage.getItem('ffb_name') || '';
  const ok = await tryFirebase();
  const n = $('#notice');
  if (ok) {
    n.textContent = '☁️ Modo en vivo: todos los que abran esta página comparten cartones.';
    n.classList.remove('hidden');
  } else {
    n.textContent = '📁 Modo local: funciona sin configurar nada. Para jugar en vivo entre móviles/PCs, configura Firebase (ver README).';
    n.classList.remove('hidden');
    loadLocal();
    window.addEventListener('storage', loadLocal);
  }
})();
