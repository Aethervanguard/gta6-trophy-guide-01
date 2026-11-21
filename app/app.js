// Leonida Trophy Guide — checklist, roadmap and tracker for GTA VI (PS5).
// Data lives in data/trophies.json (official names, descriptions, grades + our own
// cited guides). Progress and settings live in localStorage; nothing is fetched
// from the network except the local data file, by a relative path.

const DATA_URL = 'data/trophies.json';
const PROGRESS_KEY = 'gta6-trophy-progress-v1';
const SETTINGS_KEY = 'gta6-trophy-settings-v1';

const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const KIND_LABEL = { story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities', online: 'Online' };

// The roadmap stages, built from the official descriptions and PowerPyx's roadmap
// (200 hours, 4/10, one playthrough, one potentially missable trophy).
const ROADMAP = [
  {
    title: 'Stage 1 — Play the story, mind the one missable moment',
    time: '60–80 hours · Chapters 1–5',
    points: [
      'Play all 5 chapters and the final mission. Story trophies (Just Like Paradise through Snow Storm, plus the chapter trophies) pop automatically — 13 hidden story trophies in total.',
      'Do the one thing that cannot wait: in Chapter 1, after the mission Down to Earth, talk to Lucia in the kitchen at Jason’s house in the morning, follow her to the balcony and choose Accept — the first meditation for Positive Mental Attitude. It is gone after Chapter 1.',
      'Pick up optional missions as they appear (purple icons, and black icons with pink letters). They introduce robberies, fishing, hunting and the quest givers Andy, Kenton, Billy, Randy, Tyrone and Bret.',
      'Scan every new vehicle with the WAiNK app and study animals through the binoculars as you travel — 100% completion needs 200 of 277 base-model vehicles and 100 of 255 animals.',
      'Keep manual saves: 15 slots. Save at the start and end of each chapter.',
    ],
  },
  {
    title: 'Stage 2 — Strangers, questlines and side characters',
    time: 'Alongside the story',
    points: [
      'Finish the 8 Strangers & Freaks strands that count (Kirk, Kyle, Yago, Pilot Pete and more) — Moses, Tyrone, Yasmani, Andy, Billy and Eddie do not count toward the trophy.',
      'Complete the final mission for each side character: Andy (Lucia only), Kenton (treasure diving, 7 shipwrecks), Billy (Thrillbilly Mudclub), Randy (16 sports cars), Tyrone (Jason only, destroy the Synthetic Labs) and Bret (Jason only, hunting).',
      'Beat Cal in a fishing challenge, finish one arcade game, and try all 9 activity types for Master of None.',
    ],
  },
  {
    title: 'Stage 3 — 100% completion checklist',
    time: 'About 100 hours · after the story',
    points: [
      'After the ending, the checklist opens under Progress, then Stats, then 100% Completion. Everything in it stays doable in free-roam.',
      'Clear every robbery first: all 39 gang operations, all 22 bank jobs, all 8 bank vaults (5 for Maximum Withdrawal, 8 for the checklist), plus the Payday Loan jobs.',
      'Finish the activity grind: 300 stunts (250 for Cunning Stunts), gold in all 42 shooting range challenges, drone races at all 14 locations, 20 different race wins.',
      'Finish the collectibles that count: 15 of 18 card sets, 100 WAiNK scans, 33 underwater discoveries, 100 Cocaine Flamingos, 15 of 18 meditation spots.',
      'Complete any 70 of the 80 challenges — 50 of them pops One Last Thing on the way.',
    ],
  },
  {
    title: 'Stage 4 — Cleanup and the platinum',
    time: 'About 10 hours',
    points: [
      'Mop up the miscellaneous trophies: explore all 52 areas of Leonida, discover 100 vehicles, launder $250,000 in marked bills, spend $100,000 in shops, buy all 8 garages, register 10 vehicles to Scooter Bros.',
      'Do the odd ones: the Ocean Beach cocktail, the blue Banshee through the showroom window, the Kingpin Bowling valuables, max strength with both characters, 500 criminal-profile actions, the Payday Loans store again as Lucia, the UFO north-west of Starlet Motel after 2 AM, and the melee drive-by kicks.',
      'A Long Road (100% completion) is usually the last trophy. When it pops, Vice Got a Price! — the platinum — pops with it.',
    ],
  },
];

const COMPLETION_NEEDS = [
  'All 39 illegal gang operations (Pest Control needs 1 per gang, the checklist needs all 39).',
  'All 22 bank jobs and all 8 large bank vaults.',
  'All shooting range gold medals (42) and all drone races.',
  'All of Bret’s hunting quests (15 Target Decks).',
  'All 33 underwater discoveries.',
  'Any 70 of the 80 challenges.',
  'Any 200 of the 277 base-model vehicles scanned; any 100 of the 255 animals studied.',
  'Any 300 of the 397 stunts.',
  'Any 15 of the 18 collectible card sets; any 15 of the 18 meditation spots.',
  'Any 100 of the optional missions (there are 200–300+, so expired ones do not matter).',
];

const $ = (id) => document.getElementById(id);
const listEl = $('trophyList');
const detailEl = $('detailPanel');

// --- state ---------------------------------------------------------------
const params = new URLSearchParams(location.search);
let earned = loadProgress();
let settings = loadSettings();
let selectedId = null;

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((n) => typeof n === 'number') : []);
  } catch {
    return new Set();
  }
}

function loadSettings() {
  const base = { spoiler: false, hideEarned: false };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...base, ...JSON.parse(raw) };
  } catch { /* fall through with defaults */ }
  if (params.get('spoiler') === '1') base.spoiler = true;
  if (params.get('spoiler') === '0') base.spoiler = false;
  return base;
}

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Preview links (?earn=2,3,15) mark trophies earned for this view only,
// without touching saved progress — handy for sharing a checklist state.
const previewEarned = new Set(
  (params.get('earn') || '').split(',').map((s) => Number(s)).filter((n) => Number.isInteger(n) && n > 0),
);

function isEarned(t) {
  return earned.has(t.id) || previewEarned.has(t.id);
}

// --- data ----------------------------------------------------------------
const doc = await (await fetch(DATA_URL)).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));
const missables = trophies.filter((t) => t.missable);

// --- spoiler masking -----------------------------------------------------
function isSpoilerHidden(t) {
  return settings.spoiler && t.kind === 'story' && !isEarned(t);
}

// --- rendering: progress --------------------------------------------------
function renderProgress() {
  const total = trophies.length;
  const done = trophies.filter(isEarned).length;
  const pct = Math.round((done / total) * 100);
  $('progressCount').textContent = `${done} / ${total}`;
  $('progressPct').textContent = `${pct}%`;
  $('progressFill').style.width = `${pct}%`;
  $('progressBar').setAttribute('aria-valuenow', String(done));
  $('progressLine').textContent = done === total
    ? 'Platinum earned — Vice Got a Price! Congratulations, Leonida Legend.'
    : `Platinum: Vice Got a Price! — earn the other 54 trophies. ${total - done} to go.`;
  const counts = $('gradeCounts');
  counts.replaceChildren();
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const all = trophies.filter((t) => t.grade === grade);
    const got = all.filter(isEarned).length;
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = `dot ${grade}`;
    li.append(dot, document.createTextNode(`${GRADE_LABEL[grade]} ${got}/${all.length}`));
    counts.append(li);
  }
}

// --- rendering: checklist -------------------------------------------------
function visibleTrophies() {
  const kind = $('kindFilter').value;
  const grade = $('gradeFilter').value;
  const q = $('searchInput').value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (kind !== 'all') {
      if (kind === 'missable') { if (!t.missable) return false; }
      else if (t.kind !== kind) return false;
    }
    if (grade !== 'all' && t.grade !== grade) return false;
    if (settings.hideEarned && isEarned(t)) return false;
    if (q) {
      const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function formatCount(t) {
  if (t.count == null) return null;
  if (t.id === 1) return '54 trophies';
  if (t.id === 14) return '100%';
  if (t.id === 52 || t.id === 53) return `$${t.count.toLocaleString('en-US')}`;
  return `${t.count}×`;
}

function renderList() {
  const shown = visibleTrophies();
  listEl.replaceChildren();
  for (const t of shown) {
    const hidden = isSpoilerHidden(t);
    const li = document.createElement('li');
    li.className = 'trophy-item' + (isEarned(t) ? ' earned' : '') + (selectedId === t.id ? ' selected' : '');
    li.dataset.id = String(t.id);

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = isEarned(t);
    box.setAttribute('aria-label', `Mark ${hidden ? 'story trophy' : t.name} as earned`);
    box.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleEarned(t, box.checked);
    });

    const body = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'trophy-name' + (hidden ? ' spoiler-name' : '');
    name.textContent = hidden ? 'Hidden story trophy — earn it to reveal' : t.name;
    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = hidden ? 'Hidden story trophy — earn it to reveal' : t.description;
    body.append(name, desc);

    const meta = document.createElement('div');
    meta.className = 'trophy-meta';
    const gradeBadge = document.createElement('span');
    gradeBadge.className = `badge-grade ${t.grade}`;
    gradeBadge.textContent = GRADE_LABEL[t.grade];
    meta.append(gradeBadge);
    const kindBadge = document.createElement('span');
    kindBadge.className = 'badge-kind';
    kindBadge.textContent = KIND_LABEL[t.kind] || t.kind;
    meta.append(kindBadge);
    const count = formatCount(t);
    if (count) {
      const countBadge = document.createElement('span');
      countBadge.className = 'badge-count';
      countBadge.textContent = `Target ${count}`;
      meta.append(countBadge);
    }
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'badge-missable';
      m.textContent = 'Missable';
      meta.append(m);
    }
    if (t.hidden && !hidden) {
      const h = document.createElement('span');
      h.className = 'badge-hidden';
      h.textContent = 'Hidden on PSN';
      meta.append(h);
    }
    body.append(meta);

    li.append(box, body);
    li.addEventListener('click', () => selectTrophy(t.id));
    listEl.append(li);
  }
  $('resultCount').textContent = `${shown.length} of ${trophies.length} shown`;
}

function toggleEarned(t, on) {
  if (previewEarned.has(t.id)) previewEarned.delete(t.id);
  if (on) earned.add(t.id);
  else earned.delete(t.id);
  saveProgress();
  renderProgress();
  renderList();
  if (selectedId === t.id) renderDetail();
}

// --- rendering: detail panel ----------------------------------------------
function renderDetail() {
  const t = byId.get(selectedId);
  if (!t) {
    detailEl.replaceChildren();
    const p = document.createElement('p');
    p.className = 'detail-empty';
    p.textContent = 'Select a trophy to read its guide and sources.';
    detailEl.append(p);
    return;
  }
  const hidden = isSpoilerHidden(t);
  detailEl.replaceChildren();

  // The head (name, description, badges) stays pinned while the guide below scrolls.
  const head = document.createElement('div');
  head.className = 'detail-head';
  const h = document.createElement('h3');
  h.textContent = hidden ? 'Hidden story trophy' : t.name;
  head.append(h);

  const desc = document.createElement('p');
  desc.className = 'trophy-desc';
  desc.textContent = hidden ? 'Hidden story trophy — earn it to reveal' : t.description;
  head.append(desc);

  const meta = document.createElement('div');
  meta.className = 'trophy-meta';
  const gradeBadge = document.createElement('span');
  gradeBadge.className = `badge-grade ${t.grade}`;
  gradeBadge.textContent = GRADE_LABEL[t.grade];
  meta.append(gradeBadge);
  if (t.missable) {
    const m = document.createElement('span');
    m.className = 'badge-missable';
    m.textContent = 'Missable';
    meta.append(m);
  }
  const count = formatCount(t);
  if (count) {
    const c = document.createElement('span');
    c.className = 'badge-count';
    c.textContent = `Target ${count}`;
    meta.append(c);
  }
  head.append(meta);
  detailEl.append(head);

  if (t.missable) {
    const warn = document.createElement('p');
    warn.className = 'missable-warn';
    warn.textContent = t.missable_note;
    detailEl.append(warn);
  }

  const guideH = document.createElement('h4');
  guideH.textContent = 'Guide';
  detailEl.append(guideH);
  const guide = document.createElement('p');
  guide.className = 'guide-text';
  guide.textContent = hidden ? 'This guide is hidden until the trophy is earned.' : t.guide;
  detailEl.append(guide);

  if (!hidden && Array.isArray(t.sources) && t.sources.length) {
    const srcH = document.createElement('h4');
    srcH.textContent = 'Sources';
    detailEl.append(srcH);
    const ul = document.createElement('ul');
    ul.className = 'source-list';
    for (const s of t.sources) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = s.name;
      li.append(a);
      ul.append(li);
    }
    detailEl.append(ul);
  }

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'btn earned-toggle';
  toggleBtn.textContent = isEarned(t) ? '✓ Earned — mark as not earned' : 'Mark as earned';
  toggleBtn.addEventListener('click', () => toggleEarned(t, !isEarned(t)));
  detailEl.append(toggleBtn);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn close-btn';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => selectTrophy(null));
  detailEl.append(closeBtn);
}

function selectTrophy(id) {
  selectedId = id;
  renderList();
  renderDetail();
}

// Escape closes the open trophy detail, so keyboard users can get back to the list.
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && selectedId !== null) selectTrophy(null);
});

// --- rendering: roadmap ---------------------------------------------------
function renderRoadmap() {
  const ol = $('roadmapList');
  ol.replaceChildren();
  for (const stage of ROADMAP) {
    const li = document.createElement('li');
    const h = document.createElement('h3');
    h.append(document.createTextNode(stage.title + ' '));
    const time = document.createElement('span');
    time.className = 'stage-time';
    time.textContent = stage.time;
    h.append(time);
    li.append(h);
    const ul = document.createElement('ul');
    for (const point of stage.points) {
      const p = document.createElement('li');
      p.textContent = point;
      ul.append(p);
    }
    li.append(ul);
    ol.append(li);
  }
  const cl = $('completionList');
  cl.replaceChildren();
  for (const need of COMPLETION_NEEDS) {
    const li = document.createElement('li');
    li.textContent = need;
    cl.append(li);
  }
}

// --- rendering: missables --------------------------------------------------
function renderMissables() {
  $('missableBadge').textContent = String(missables.length);
  $('spoilerStatus').textContent = settings.spoiler
    ? 'Spoiler protection is ON — story trophy names and descriptions stay hidden in the checklist until you earn them (change it in Settings).'
    : 'Spoiler protection is OFF — story trophy names are shown in the checklist (change it in Settings).';
  const ul = $('missableList');
  ul.replaceChildren();
  for (const t of missables) {
    const li = document.createElement('li');
    li.className = 'trophy-item missable-card';
    const name = document.createElement('p');
    name.className = 'trophy-name';
    name.textContent = t.name;
    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = t.description;
    const body = document.createElement('div');
    body.append(name, desc);
    const warn = document.createElement('p');
    warn.className = 'missable-warn';
    warn.textContent = t.missable_note;
    body.append(warn);
    const guide = document.createElement('p');
    guide.className = 'guide-text';
    guide.textContent = t.guide;
    body.append(guide);
    li.append(body);
    li.addEventListener('click', () => {
      showView('checklist');
      selectTrophy(t.id);
    });
    ul.append(li);
  }
}

// --- views ------------------------------------------------------------------
function showView(name) {
  for (const btn of document.querySelectorAll('.tab')) {
    const active = btn.dataset.view === name;
    btn.classList.toggle('active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  }
  $('view-checklist').hidden = name !== 'checklist';
  $('view-roadmap').hidden = name !== 'roadmap';
  $('view-missables').hidden = name !== 'missables';
}

for (const btn of document.querySelectorAll('.tab')) {
  btn.addEventListener('click', () => showView(btn.dataset.view));
}

// --- settings, export, import ----------------------------------------------
const settingsPanel = $('settingsPanel');
$('settingsBtn').addEventListener('click', () => {
  const open = settingsPanel.hidden;
  settingsPanel.hidden = !open;
  $('settingsBtn').setAttribute('aria-expanded', String(open));
});

function syncSettingsUI() {
  $('spoilerToggle').checked = settings.spoiler;
  $('hideEarnedToggle').checked = settings.hideEarned;
}
$('spoilerToggle').addEventListener('change', (ev) => {
  settings.spoiler = ev.target.checked;
  saveSettings();
  renderList();
  renderDetail();
  renderMissables();
});
$('hideEarnedToggle').addEventListener('change', (ev) => {
  settings.hideEarned = ev.target.checked;
  saveSettings();
  renderList();
});

$('exportBtn').addEventListener('click', () => {
  const payload = {
    game: 'Grand Theft Auto VI',
    platform: 'PlayStation 5',
    exported: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

$('importFile').addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  const msg = $('importMsg');
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(ids)) throw new Error('no earned list');
    const valid = ids.filter((n) => Number.isInteger(n) && byId.has(n));
    earned = new Set(valid);
    saveProgress();
    renderProgress();
    renderList();
    renderDetail();
    msg.textContent = `Imported ${valid.length} earned trophies from ${file.name}.`;
  } catch {
    msg.textContent = `Could not import ${file.name}: not a valid progress file.`;
  }
  ev.target.value = '';
});

$('resetBtn').addEventListener('click', () => {
  if (!window.confirm('Reset all progress? This clears every earned trophy.')) return;
  earned = new Set();
  previewEarned.clear();
  saveProgress();
  renderProgress();
  renderList();
  renderDetail();
});

// --- filters ------------------------------------------------------------------
$('kindFilter').addEventListener('change', renderList);
$('gradeFilter').addEventListener('change', renderList);
$('searchInput').addEventListener('input', renderList);

// --- init ---------------------------------------------------------------------
syncSettingsUI();
if (params.get('kind')) $('kindFilter').value = params.get('kind');
if (params.get('grade')) $('gradeFilter').value = params.get('grade');
if (params.get('search')) $('searchInput').value = params.get('search');
renderProgress();
renderList();
renderRoadmap();
renderMissables();
renderDetail();
if (params.get('open')) {
  const id = Number(params.get('open'));
  if (byId.has(id)) selectTrophy(id);
}
if (params.get('view') && ['checklist', 'roadmap', 'missables'].includes(params.get('view'))) {
  showView(params.get('view'));
}
if (params.get('settings') === '1') {
  settingsPanel.hidden = false;
  $('settingsBtn').setAttribute('aria-expanded', 'true');
}
