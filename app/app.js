// Leonida Trophy Guide — app logic. Browser standard library only.
// Trophy names, descriptions, grades and guides come from
// data/trophies.json at runtime; nothing is embedded here and nothing is
// fetched from the network.

const DATA_URL = 'data/trophies.json';
const STORAGE_KEY = 'leonida-trophy-guide-v3';
const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

let trophies = [];
let sourceNames = [];
let state = {
  view: 'checklist',
  earned: new Set(),
  counters: {},
  notes: {},
  spoiler: false,
  openId: null,
  filters: { grade: 'all', hidden: 'all', missable: 'all', earned: 'all', search: '' },
  sort: 'id',
};

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
};

// ---------- state: load / save / URL ----------

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.earned)) state.earned = new Set(saved.earned);
    if (saved.counters && typeof saved.counters === 'object') state.counters = saved.counters;
    if (saved.notes && typeof saved.notes === 'object') state.notes = saved.notes;
    if (typeof saved.spoiler === 'boolean') state.spoiler = saved.spoiler;
  } catch (e) { /* corrupted storage: start fresh */ }
}

function saveStored() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      earned: [...state.earned].sort((a, b) => a - b),
      counters: state.counters,
      notes: state.notes,
      spoiler: state.spoiler,
    }));
  } catch (e) { /* storage unavailable: session-only */ }
}

function readUrl() {
  const p = new URLSearchParams(location.search);
  const view = p.get('view');
  if (view === 'checklist' || view === 'roadmap' || view === 'missables' || view === 'planner') {
    state.view = view;
  }
  if (p.has('earn')) {
    state.earned = new Set(
      p.get('earn').split(',').map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n)),
    );
  }
  if (p.has('tgt')) {
    state.counters = {};
    for (const part of p.get('tgt').split(',')) {
      const i = part.indexOf(':');
      if (i > 0) {
        const id = parseInt(part.slice(0, i), 10);
        const val = parseInt(part.slice(i + 1), 10);
        if (Number.isFinite(id) && Number.isFinite(val)) state.counters[id] = Math.max(0, val);
      }
    }
  }
  if (p.has('note')) {
    state.notes = {};
    for (const part of p.get('note').split(',')) {
      const i = part.indexOf(':');
      if (i > 0) {
        const id = parseInt(part.slice(0, i), 10);
        if (Number.isFinite(id)) {
          try { state.notes[id] = decodeURIComponent(part.slice(i + 1)); } catch (e) { state.notes[id] = part.slice(i + 1); }
        }
      }
    }
  }
  const open = p.get('open');
  if (open) {
    const id = parseInt(open, 10);
    if (Number.isFinite(id)) state.openId = id;
  }
  if (p.get('spoiler') === '1') state.spoiler = true;
}

function writeUrl() {
  const p = new URLSearchParams();
  if (state.view !== 'checklist') p.set('view', state.view);
  if (state.earned.size) p.set('earn', [...state.earned].sort((a, b) => a - b).join(','));
  const tgt = Object.entries(state.counters)
    .filter(([, v]) => v > 0)
    .sort((a, b) => a[0] - b[0])
    .map(([id, v]) => id + ':' + v);
  if (tgt.length) p.set('tgt', tgt.join(','));
  const notes = Object.entries(state.notes)
    .filter(([, v]) => v)
    .sort((a, b) => a[0] - b[0])
    .map(([id, v]) => id + ':' + encodeURIComponent(v));
  if (notes.length) p.set('note', notes.join(','));
  if (state.openId) p.set('open', String(state.openId));
  if (state.spoiler) p.set('spoiler', '1');
  const qs = p.toString();
  history.replaceState(null, '', qs ? '?' + qs : location.pathname);
}

function commit() {
  saveStored();
  writeUrl();
  renderAll();
}

// ---------- helpers ----------

function byId(id) { return trophies.find((t) => t.id === id); }
function isEarned(t) { return state.earned.has(t.id); }
function counterOf(t) { return state.counters[t.id] || 0; }
function progressOf(t) {
  if (isEarned(t)) return 1;
  if (t.count) return Math.min(1, counterOf(t) / t.count);
  return 0;
}
function setEarned(t, on) {
  if (on) state.earned.add(t.id); else state.earned.delete(t.id);
}
function setCounter(t, val) {
  const v = Math.max(0, Math.min(t.count || 0, val));
  if (v > 0) state.counters[t.id] = v; else delete state.counters[t.id];
  if (t.count && v >= t.count) state.earned.add(t.id);
}
function gradeLabel(g) { return g.charAt(0).toUpperCase() + g.slice(1); }

// ---------- rendering: header ----------

function renderHeader() {
  const earned = trophies.filter(isEarned).length;
  const total = trophies.length;
  const pct = total ? Math.round((earned / total) * 100) : 0;
  $('earned-count').textContent = earned;
  $('total-count').textContent = total;
  $('earned-pct').textContent = pct + '%';
  $('total-bar').style.width = pct + '%';
  $('total-bar-wrap').setAttribute('aria-valuenow', String(pct));
}

// ---------- rendering: trophy card ----------

function masked(t) { return t.hidden && !state.spoiler; }

function trophyCard(t) {
  const li = el('li', 'trophy-card grade-' + t.grade + (isEarned(t) ? ' earned' : '') + (state.openId === t.id ? ' open' : ''));
  li.dataset.id = t.id;

  const head = el('div', 'trophy-head');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned(t);
  box.setAttribute('aria-label', 'Mark ' + (masked(t) ? 'hidden trophy ' + t.id : t.name) + ' as earned');
  box.addEventListener('change', () => { setEarned(t, box.checked); commit(); });
  head.appendChild(box);

  const nameWrap = el('h3', 'trophy-name');
  const nameBtn = document.createElement('button');
  nameBtn.type = 'button';
  nameBtn.textContent = masked(t) ? 'Hidden trophy #' + t.id : t.name;
  nameBtn.addEventListener('click', () => openDetail(t.id));
  nameWrap.appendChild(nameBtn);
  head.appendChild(nameWrap);

  head.appendChild(el('span', 'badge badge-' + t.grade, gradeLabel(t.grade)));
  if (t.hidden) head.appendChild(el('span', 'badge badge-hidden', 'Hidden'));
  if (t.missable) head.appendChild(el('span', 'badge badge-missable', 'Missable'));
  li.appendChild(head);

  if (masked(t)) {
    li.appendChild(el('p', 'trophy-desc spoiler-mask', 'Hidden until unlocked. Turn on “Show spoilers” to reveal this trophy.'));
    li.appendChild(el('p', 'trophy-guide spoiler-mask', 'Guide hidden — spoilers are off.'));
  } else {
    li.appendChild(el('p', 'trophy-desc', t.description));
    const guide = el('p', 'trophy-guide');
    guide.appendChild(el('strong', null, 'How to get it: '));
    guide.appendChild(document.createTextNode(t.guide));
    li.appendChild(guide);
  }
  if (t.missable && t.missable_note) {
    const note = el('p', 'missable-note');
    note.appendChild(el('strong', null, 'Missable — '));
    note.appendChild(document.createTextNode(t.missable_note));
    li.appendChild(note);
  }

  // Sources line is always visible, even for hidden trophies.
  const src = el('p', 'sources');
  src.appendChild(el('strong', null, 'Sources: '));
  src.appendChild(document.createTextNode((t.sources || []).join(', ')));
  li.appendChild(src);

  if (t.count) {
    const step = el('div', 'stepper');
    const minus = el('button', null, '−');
    minus.type = 'button';
    minus.setAttribute('aria-label', 'Decrease count for ' + t.name);
    minus.addEventListener('click', () => { setCounter(t, counterOf(t) - 1); commit(); });
    const plus = el('button', null, '+');
    plus.type = 'button';
    plus.setAttribute('aria-label', 'Increase count for ' + t.name);
    plus.addEventListener('click', () => { setCounter(t, counterOf(t) + 1); commit(); });
    const label = el('span', 'count-label', counterOf(t) + ' / ' + t.count + ' (' + Math.round(progressOf(t) * 100) + '%)');
    const bar = el('div', 'mini-bar');
    bar.appendChild(el('div')).style.width = (progressOf(t) * 100) + '%';
    step.appendChild(minus);
    step.appendChild(label);
    step.appendChild(plus);
    step.appendChild(bar);
    li.appendChild(step);
  }

  const noteRow = el('div', 'note-row');
  const noteLabel = el('label', null, 'Your note');
  noteLabel.htmlFor = 'note-' + t.id;
  const noteInput = document.createElement('input');
  noteInput.type = 'text';
  noteInput.id = 'note-' + t.id;
  noteInput.placeholder = 'Add a note for this trophy…';
  noteInput.value = state.notes[t.id] || '';
  noteInput.addEventListener('change', () => {
    const v = noteInput.value.trim();
    if (v) state.notes[t.id] = v; else delete state.notes[t.id];
    commit();
  });
  noteRow.appendChild(noteLabel);
  noteRow.appendChild(noteInput);
  li.appendChild(noteRow);

  return li;
}

// ---------- rendering: checklist ----------

function filteredTrophies() {
  const f = state.filters;
  const q = f.search.trim().toLowerCase();
  let list = trophies.filter((t) => {
    if (f.grade !== 'all' && t.grade !== f.grade) return false;
    if (f.hidden === 'hidden' && !t.hidden) return false;
    if (f.hidden === 'visible' && t.hidden) return false;
    if (f.missable === 'missable' && !t.missable) return false;
    if (f.earned === 'earned' && !isEarned(t)) return false;
    if (f.earned === 'unearned' && isEarned(t)) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.guide.toLowerCase().includes(q))) return false;
    return true;
  });
  if (state.sort === 'grade') {
    list.sort((a, b) => (GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade]) || (a.id - b.id));
  } else if (state.sort === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (state.sort === 'progress') {
    list.sort((a, b) => (progressOf(b) - progressOf(a)) || (a.id - b.id));
  } else {
    list.sort((a, b) => a.id - b.id);
  }
  return list;
}

function renderChecklist() {
  const list = filteredTrophies();
  const ul = $('trophy-list');
  ul.innerHTML = '';
  $('list-meta').textContent = 'Showing ' + list.length + ' of ' + trophies.length + ' trophies · ' +
    trophies.filter(isEarned).length + ' earned';
  if (!list.length) {
    ul.appendChild(el('li', 'empty', 'No trophies match these filters.'));
    return;
  }
  for (const t of list) ul.appendChild(trophyCard(t));
}

// ---------- rendering: roadmap ----------

const ROADMAP_STAGES = [
  { title: 'Stage 1 — Play the story', kinds: ['story'], text: 'Play the golden story icons in order. Story trophies pop as chapters and missions end. Do the first meditation in Chapter 1 before it ends — see Missables.' },
  { title: 'Stage 2 — 100% completion checklist', kinds: ['completion', 'activity', 'collectible'], text: 'After the story, work the 100% completion checklist in the pause menu: activities, collectibles, vehicles and exploration, category by category.' },
  { title: 'Stage 3 — The long grinds', kinds: ['count', 'challenge'], text: 'The counted grinds last: stunts, races, challenges, robberies and money. Fold them into normal play and chip away at the counters.' },
];

function renderRoadmap() {
  const wrap = $('roadmap-stages');
  wrap.innerHTML = '';
  for (const stage of ROADMAP_STAGES) {
    const items = trophies.filter((t) => stage.kinds.includes(t.kind));
    const earned = items.filter(isEarned).length;
    const pct = items.length ? Math.round((earned / items.length) * 100) : 0;
    const box = el('div', 'roadmap-stage');
    box.appendChild(el('h3', null, stage.title));
    box.appendChild(el('p', null, stage.text));
    const bar = el('div', 'progress-bar');
    bar.appendChild(el('div', 'progress-fill')).style.width = pct + '%';
    box.appendChild(bar);
    box.appendChild(el('p', 'stage-meta', earned + ' / ' + items.length + ' earned · ' + pct + '%'));
    const names = items.map((t) => (masked(t) ? 'Hidden trophy #' + t.id : t.name) + (t.missable ? ' ⚠ missable' : '')).join(' · ');
    box.appendChild(el('p', 'stage-trophies', names));
    wrap.appendChild(box);
  }
  const plat = el('div', 'roadmap-stage');
  plat.appendChild(el('h3', null, 'Finish line — Platinum'));
  const p = byId(1);
  plat.appendChild(el('p', null, p && !isEarned(p)
    ? '“' + p.name + '” unlocks itself the moment the other 54 trophies are earned. There is nothing extra to do.'
    : 'Platinum earned — you are a Leonida Legend.'));
  wrap.appendChild(plat);
}

// ---------- rendering: missables ----------

function renderMissables() {
  const ul = $('missable-list');
  ul.innerHTML = '';
  const list = trophies.filter((t) => t.missable);
  if (!list.length) {
    ul.appendChild(el('li', 'empty', 'No missable trophies.'));
    return;
  }
  for (const t of list) ul.appendChild(trophyCard(t));
}

// ---------- rendering: planner ----------

function renderPlanner() {
  const ol = $('planner-list');
  ol.innerHTML = '';
  const queue = [];
  const add = (t, why) => { if (t && !queue.some((q) => q.t.id === t.id)) queue.push({ t, why }); };

  const missable = trophies.find((t) => t.missable && !isEarned(t));
  if (missable) add(missable, 'Missable — do it in Chapter 1, before it can be lost.');

  const nextStory = trophies.filter((t) => t.kind === 'story' && !isEarned(t)).sort((a, b) => a.id - b.id);
  for (const t of nextStory.slice(0, 3)) add(t, 'Next story trophy — keep playing the main missions.');

  const counted = trophies
    .filter((t) => t.count && !isEarned(t))
    .sort((a, b) => (progressOf(b) - progressOf(a)) || (a.id - b.id));
  for (const t of counted.slice(0, 5)) {
    add(t, 'Closest grind — ' + counterOf(t) + ' / ' + t.count + ' (' + Math.round(progressOf(t) * 100) + '% done).');
  }

  const rest = trophies.filter((t) => !isEarned(t)).sort((a, b) => a.id - b.id);
  for (const t of rest) {
    if (queue.length >= 10) break;
    add(t, 'Next on the list.');
  }

  if (!queue.length) {
    ol.appendChild(el('li', 'planner-done', 'All 55 trophies earned — platinum is yours.'));
    return;
  }
  queue.forEach((item, i) => {
    const li = el('li', 'planner-item');
    li.appendChild(el('span', 'planner-rank', String(i + 1)));
    const body = el('div');
    const h = el('h3');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = masked(item.t) ? 'Hidden trophy #' + item.t.id : item.t.name;
    btn.addEventListener('click', () => openDetail(item.t.id));
    h.appendChild(btn);
    body.appendChild(h);
    body.appendChild(el('p', 'planner-why', item.why));
    body.appendChild(el('p', null, item.t.description));
    if (item.t.count) {
      body.appendChild(el('p', null, 'Progress: ' + counterOf(item.t) + ' / ' + item.t.count + ' (' + Math.round(progressOf(item.t) * 100) + '%).'));
    }
    li.appendChild(body);
    ol.appendChild(li);
  });
}

// ---------- detail panel ----------

function fillDetail(id) {
  const t = byId(id);
  const panel = $('detail-panel');
  const body = $('detail-body');
  body.innerHTML = '';
  if (!t) { panel.hidden = true; return; }
  body.appendChild(el('h2', null, masked(t) ? 'Hidden trophy #' + t.id : t.name));
  body.appendChild(el('p', null, '')).textContent = gradeLabel(t.grade) + ' trophy' + (t.hidden ? ' · Hidden' : '') + (t.missable ? ' · Missable' : '') + (isEarned(t) ? ' · Earned' : '');
  if (!masked(t)) {
    body.appendChild(el('p', null, t.description));
    const guide = el('p', null, '');
    guide.appendChild(el('strong', null, 'How to get it: '));
    guide.appendChild(document.createTextNode(t.guide));
    body.appendChild(guide);
  } else {
    body.appendChild(el('p', 'spoiler-mask', 'Hidden until unlocked. Turn on “Show spoilers” to reveal this trophy.'));
  }
  if (t.missable && t.missable_note) {
    const note = el('p', 'missable-note');
    note.appendChild(el('strong', null, 'Missable — '));
    note.appendChild(document.createTextNode(t.missable_note));
    body.appendChild(note);
  }
  const src = el('p', 'sources');
  src.appendChild(el('strong', null, 'Sources: '));
  src.appendChild(document.createTextNode((t.sources || []).join(', ')));
  body.appendChild(src);
  if (t.count) {
    body.appendChild(el('p', null, 'Progress: ' + counterOf(t) + ' / ' + t.count + ' (' + Math.round(progressOf(t) * 100) + '%). Use the − / + stepper on the trophy card to update it.'));
  }
  panel.hidden = false;
}

function openDetail(id) {
  state.openId = id;
  fillDetail(id);
  commit();
}

function closeDetail() {
  state.openId = null;
  $('detail-panel').hidden = true;
  commit();
}

// ---------- export / import ----------

function exportData() {
  const data = {
    game: 'Grand Theft Auto VI',
    guide: 'Leonida Trophy Guide',
    version: 3,
    earned: [...state.earned].sort((a, b) => a - b),
    counters: state.counters,
    notes: state.notes,
    spoiler: state.spoiler,
  };
  const text = JSON.stringify(data, null, 2);
  $('io-text').value = text;
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leonida-trophy-progress.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importData(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { alert('Could not read that JSON. Check the text and try again.'); return; }
  if (Array.isArray(data.earned)) state.earned = new Set(data.earned.filter((n) => Number.isFinite(n)));
  if (data.counters && typeof data.counters === 'object') state.counters = data.counters;
  if (data.notes && typeof data.notes === 'object') state.notes = data.notes;
  if (typeof data.spoiler === 'boolean') state.spoiler = data.spoiler;
  $('spoiler-toggle').checked = state.spoiler;
  commit();
}

// ---------- tabs / view ----------

function setView(view) {
  state.view = view;
  document.querySelectorAll('.tab').forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('.view').forEach((v) => {
    v.classList.toggle('active', v.id === 'view-' + view);
  });
  commit();
}

// ---------- render all ----------

function renderAll() {
  renderHeader();
  renderChecklist();
  renderRoadmap();
  renderMissables();
  renderPlanner();
  document.querySelectorAll('.tab').forEach((tab) => {
    const active = tab.dataset.view === state.view;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('.view').forEach((v) => {
    v.classList.toggle('active', v.id === 'view-' + state.view);
  });
  $('spoiler-toggle').checked = state.spoiler;
  if (state.openId && byId(state.openId)) fillDetail(state.openId);
  else $('detail-panel').hidden = true;
}

// ---------- boot ----------

async function boot() {
  loadStored();
  readUrl();
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    trophies = data.trophies || [];
    sourceNames = (data.sources || []).map((s) => s.name);
  } catch (e) {
    $('trophy-list').innerHTML = '';
    $('trophy-list').appendChild(el('li', 'empty', 'Could not load the trophy data. Open this guide from its own folder so data/trophies.json can load.'));
    return;
  }
  if (state.openId && !byId(state.openId)) state.openId = null;

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => setView(tab.dataset.view));
  });
  $('search').addEventListener('input', (e) => { state.filters.search = e.target.value; renderChecklist(); });
  $('filter-grade').addEventListener('change', (e) => { state.filters.grade = e.target.value; renderChecklist(); });
  $('filter-hidden').addEventListener('change', (e) => { state.filters.hidden = e.target.value; renderChecklist(); });
  $('filter-missable').addEventListener('change', (e) => { state.filters.missable = e.target.value; renderChecklist(); });
  $('filter-earned').addEventListener('change', (e) => { state.filters.earned = e.target.value; renderChecklist(); });
  $('sort').addEventListener('change', (e) => { state.sort = e.target.value; renderChecklist(); });
  $('spoiler-toggle').addEventListener('change', (e) => { state.spoiler = e.target.checked; commit(); });
  $('export-btn').addEventListener('click', exportData);
  $('import-btn').addEventListener('click', () => {
    const text = $('io-text').value.trim();
    if (text) { importData(text); return; }
    $('import-file').click();
  });
  $('import-file').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { $('io-text').value = String(reader.result || ''); importData(String(reader.result || '')); };
    reader.readAsText(file);
    e.target.value = '';
  });
  $('reset-btn').addEventListener('click', () => {
    if (!confirm('Reset all progress, counters and notes?')) return;
    state.earned = new Set();
    state.counters = {};
    state.notes = {};
    commit();
  });
  $('detail-close').addEventListener('click', closeDetail);
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
      e.preventDefault();
      if (state.view !== 'checklist') setView('checklist');
      $('search').focus();
    }
    if (e.key === 'Escape' && state.openId) closeDetail();
  });

  renderAll();
  // Persist the URL-resolved state once, so a plain reload keeps it.
  saveStored();
  writeUrl();
}

boot();
