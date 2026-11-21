// Leonida Trophy Guide v2 — checklist, roadmap, missables and an Up next planner
// for GTA VI (PS5). Data lives in data/trophies.json (official names, descriptions,
// grades + our own cited guides). Progress, target counters and notes live in
// localStorage; nothing is fetched from the network except the local data file,
// by a relative path.

const DATA_URL = 'data/trophies.json';
const PROGRESS_KEY = 'gta6-trophy-progress-v2';
const TARGETS_KEY = 'gta6-trophy-targets-v2';
const NOTES_KEY = 'gta6-trophy-notes-v2';
const SETTINGS_KEY = 'gta6-trophy-settings-v2';

const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const KIND_LABEL = { story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities', online: 'Online' };
const GRADE_RANK = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

// Roadmap stages, built from the official descriptions and PowerPyx's roadmap
// (200 hours, 4/10, one playthrough, one potentially missable trophy). Each stage
// names the trophies it covers, so the roadmap can show live progress per stage.
const ROADMAP = [
  {
    title: 'Stage 1 — Play the story, mind the one missable moment',
    time: '60–80 hours · Chapters 1–5',
    ids: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 28],
    points: [
      'Play all 5 chapters and the final mission. Story trophies pop automatically — 13 hidden story trophies in total.',
      'Do the one thing that cannot wait: in Chapter 1, after the mission Down to Earth, talk to Lucia in the kitchen at Jason’s house in the morning, follow her to the balcony and choose Accept — the first meditation for Positive Mental Attitude. It is gone after Chapter 1.',
      'Pick up optional missions as they appear (purple icons, and black icons with pink letters). They introduce robberies, fishing, hunting and the quest givers Andy, Kenton, Billy, Randy, Tyrone and Bret.',
      'Scan every new vehicle with the WAiNK app and study animals through the binoculars as you travel — 100% completion needs 200 of 277 base-model vehicles and 100 of 255 animals.',
      'Keep manual saves: 15 slots. Save at the start and end of each chapter.',
    ],
  },
  {
    title: 'Stage 2 — Strangers, questlines and side characters',
    time: 'Alongside the story',
    ids: [16, 20, 21, 22, 23, 24, 25, 26, 27, 29],
    points: [
      'Finish the 8 Strangers & Freaks strands that count (Kirk, Kyle, Yago, Pilot Pete and more) — Moses, Tyrone, Yasmani, Andy, Billy and Eddie do not count toward the trophy.',
      'Complete the final mission for each side character: Andy (Lucia only), Kenton (treasure diving, 7 shipwrecks), Billy (Thrillbilly Mudclub), Randy (16 sports cars), Tyrone (Jason only, destroy the Synthetic Labs) and Bret (Jason only, hunting).',
      'Beat Cal in a fishing challenge, finish one arcade game, and try all 9 activity types for Master of None.',
    ],
  },
  {
    title: 'Stage 3 — 100% completion checklist',
    time: 'About 100 hours · after the story',
    ids: [14, 15, 17, 18, 30, 31, 32, 35, 40, 42, 43],
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
    ids: [1, 33, 34, 36, 37, 38, 39, 41, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55],
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
let targets = loadTargets();
let notes = loadNotes();
let settings = loadSettings();
let selectedId = null;

function loadSet(key) {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((n) => typeof n === 'number') : []);
  } catch {
    return new Set();
  }
}

function loadProgress() { return loadSet(PROGRESS_KEY); }

function loadTargets() {
  try {
    const raw = localStorage.getItem(TARGETS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    const map = new Map();
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        const id = Number(k);
        if (Number.isInteger(id) && Number.isFinite(v) && v > 0) map.set(id, Math.floor(v));
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

function loadNotes() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    const map = new Map();
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        const id = Number(k);
        if (Number.isInteger(id) && typeof v === 'string' && v.trim()) map.set(id, v);
      }
    }
    return map;
  } catch {
    return new Map();
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
function saveTargets() {
  localStorage.setItem(TARGETS_KEY, JSON.stringify(Object.fromEntries(targets)));
}
function saveNotes() {
  localStorage.setItem(NOTES_KEY, JSON.stringify(Object.fromEntries(notes)));
}
function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Preview links (?earn=2,3,15) mark trophies earned for this view only,
// without touching saved progress — handy for sharing a checklist state.
// ?tgt=15:120,17:20 previews target counters the same way, and
// ?note=28:do+the+balcony+meditation+first previews a note.
const previewEarned = new Set(
  (params.get('earn') || '').split(',').map((s) => Number(s)).filter((n) => Number.isInteger(n) && n > 0),
);
const previewTargets = new Map();
for (const part of (params.get('tgt') || '').split(',').filter(Boolean)) {
  const [a, b] = part.split(':').map(Number);
  if (Number.isInteger(a) && Number.isInteger(b) && b > 0) previewTargets.set(a, b);
}
const previewNotes = new Map();
{
  const raw = params.get('note');
  if (raw) {
    const colon = raw.indexOf(':');
    if (colon > 0) {
      const id = Number(raw.slice(0, colon));
      if (Number.isInteger(id)) previewNotes.set(id, raw.slice(colon + 1));
    }
  }
}

function isEarned(t) {
  return earned.has(t.id) || previewEarned.has(t.id);
}
function targetOf(t) {
  return previewTargets.get(t.id) ?? targets.get(t.id) ?? 0;
}
function noteOf(t) {
  return previewNotes.get(t.id) ?? notes.get(t.id) ?? '';
}
// How far a trophy is toward done: 1 when earned, else its target fraction.
function progressFrac(t) {
  if (isEarned(t)) return 1;
  if (t.count) return Math.min(1, targetOf(t) / t.count);
  return 0;
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
  const next = nextUp(1)[0];
  $('nextUpLine').textContent = next
    ? `Next up: ${next.t.name} — ${next.whyShort}`
    : 'All 55 trophies earned — platinum complete.';
}

// --- Up next planner ------------------------------------------------------
// Ranked by what matters most: the missable first, then the next story trophy
// in guide order, then the count trophies closest to finishing, then the
// remaining gold and silver, then everything else.
function nextUp(n) {
  const remaining = trophies.filter((t) => !isEarned(t) && t.id !== 1);
  const ranked = [];
  const miss = remaining.find((t) => t.missable);
  if (miss) {
    ranked.push({ t: miss, why: 'The only missable trophy in the game — do it in Chapter 1, before it is gone for good.', whyShort: 'the one missable — do it in Chapter 1' });
  }
  const nextStory = remaining.filter((t) => t.kind === 'story' && !t.missable).sort((a, b) => a.id - b.id)[0];
  if (nextStory && !ranked.some((r) => r.t.id === nextStory.id)) {
    ranked.push({ t: nextStory, why: 'The next story trophy in order — it pops as you play the next chapter, so it is the cheapest trophy on the list right now.', whyShort: 'the next story trophy in order' });
  }
  const closest = remaining
    .filter((t) => t.count && progressFrac(t) > 0 && !ranked.some((r) => r.t.id === t.id))
    .sort((a, b) => progressFrac(b) - progressFrac(a) || a.id - b.id);
  for (const t of closest) {
    ranked.push({ t, why: `You are already ${Math.round(progressFrac(t) * 100)}% there (${fmtCount(targetOf(t), t)} of ${fmtCount(t.count, t)} on PSN's tracker) — finish this one before starting a new grind.`, whyShort: `${Math.round(progressFrac(t) * 100)}% done already — finish it first` });
  }
  const medals = remaining
    .filter((t) => (t.grade === 'gold' || t.grade === 'silver') && !ranked.some((r) => r.t.id === t.id))
    .sort((a, b) => GRADE_RANK[a.grade] - GRADE_RANK[b.grade] || a.id - b.id);
  for (const t of medals) {
    ranked.push({ t, why: `A ${GRADE_LABEL[t.grade].toLowerCase()} trophy still on the table — worth chasing before the long bronze cleanup.`, whyShort: `a ${GRADE_LABEL[t.grade].toLowerCase()} trophy still on the table` });
  }
  const rest = remaining
    .filter((t) => !ranked.some((r) => r.t.id === t.id))
    .sort((a, b) => a.id - b.id);
  for (const t of rest) {
    ranked.push({ t, why: 'Still to earn — open it in the checklist to read its guide and sources.', whyShort: 'still to earn' });
  }
  return ranked.slice(0, n);
}

function renderPlanner() {
  const ol = $('plannerList');
  ol.replaceChildren();
  const picks = nextUp(6);
  if (!picks.length) {
    const li = document.createElement('li');
    li.className = 'planner-empty';
    li.textContent = 'Every trophy is earned — the platinum is yours.';
    ol.append(li);
    return;
  }
  picks.forEach((pick, i) => {
    const t = pick.t;
    const li = document.createElement('li');
    if (t.missable) li.classList.add('missable-first');
    const rank = document.createElement('span');
    rank.className = 'plan-rank';
    rank.textContent = String(i + 1);
    const body = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'trophy-name';
    name.textContent = t.name;
    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = t.description;
    const why = document.createElement('p');
    why.className = 'plan-why';
    why.append(document.createTextNode('Why now: '), document.createElement('strong'));
    why.lastChild.textContent = pick.why;
    body.append(name, desc, why);
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
    body.append(meta);
    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'btn plan-open';
    openBtn.textContent = 'Open guide';
    openBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      showView('checklist');
      selectTrophy(t.id);
    });
    li.append(rank, body, openBtn);
    li.addEventListener('click', () => {
      showView('checklist');
      selectTrophy(t.id);
    });
    ol.append(li);
  });
}

// --- rendering: checklist -------------------------------------------------
function visibleTrophies() {
  const kind = $('kindFilter').value;
  const grade = $('gradeFilter').value;
  const sort = $('sortFilter').value;
  const q = $('searchInput').value.trim().toLowerCase();
  const shown = trophies.filter((t) => {
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
  if (sort === 'name') shown.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'grade') shown.sort((a, b) => GRADE_RANK[a.grade] - GRADE_RANK[b.grade] || a.id - b.id);
  else if (sort === 'closest') shown.sort((a, b) => progressFrac(b) - progressFrac(a) || a.id - b.id);
  return shown;
}

function fmtCount(n, t) {
  if (t && (t.id === 52 || t.id === 53)) return `$${n.toLocaleString('en-US')}`;
  return String(n);
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
    if (noteOf(t)) {
      const nb = document.createElement('span');
      nb.className = 'badge-note';
      nb.textContent = 'Note';
      meta.append(nb);
    }
    body.append(meta);
    li.append(box, body);

    // Target progress bar under the badges, for PSN-tracked count trophies.
    if (t.count && t.id !== 1 && !hidden) {
      const frac = progressFrac(t);
      if (frac > 0) {
        const bar = document.createElement('div');
        bar.className = 'target-bar';
        const fill = document.createElement('span');
        fill.style.width = `${Math.round(frac * 100)}%`;
        bar.append(fill);
        const text = document.createElement('div');
        text.className = 'target-text';
        text.textContent = `${fmtCount(targetOf(t), t)} / ${fmtCount(t.count, t)} — ${Math.round(frac * 100)}%`;
        li.append(bar, text);
      }
    }

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
  renderRoadmap();
  renderPlanner();
  if (selectedId === t.id) renderDetail();
}

function stepSize(t) {
  if (t.count >= 10000) return 5000;
  if (t.count >= 100) return 5;
  return 1;
}

function setTarget(t, value) {
  const clamped = Math.max(0, Math.min(t.count, value));
  if (previewTargets.has(t.id)) previewTargets.delete(t.id);
  if (clamped === 0) targets.delete(t.id);
  else targets.set(t.id, clamped);
  saveTargets();
  renderProgress();
  renderList();
  renderPlanner();
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

  // Compact source line right under the head, so the citation is visible
  // in any screenshot even when the long guide runs past the fold.
  if (!hidden && Array.isArray(t.sources) && t.sources.length) {
    const srcLine = document.createElement('p');
    srcLine.className = 'source-line';
    srcLine.append(document.createTextNode('Sources: '));
    t.sources.forEach((s, i) => {
      if (i > 0) srcLine.append(document.createTextNode(' · '));
      const a = document.createElement('a');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = s.name.split(' — ')[0];
      srcLine.append(a);
    });
    detailEl.append(srcLine);
  }

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

  // Target counter: track PSN's count here, and the checklist + planner follow.
  if (!hidden && t.count && t.id !== 1) {
    const targetH = document.createElement('h4');
    targetH.textContent = 'Your progress';
    detailEl.append(targetH);
    const stepper = document.createElement('div');
    stepper.className = 'stepper';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', 'Decrease count');
    minus.addEventListener('click', () => setTarget(t, targetOf(t) - stepSize(t)));
    const value = document.createElement('span');
    value.className = 'stepper-value';
    value.textContent = `${fmtCount(targetOf(t), t)} / ${fmtCount(t.count, t)}`;
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.setAttribute('aria-label', 'Increase count');
    plus.addEventListener('click', () => setTarget(t, targetOf(t) + stepSize(t)));
    stepper.append(minus, value, plus);
    detailEl.append(stepper);
    const stepNote = document.createElement('p');
    stepNote.className = 'stepper-note';
    stepNote.textContent = `PSN tracks this one up to ${fmtCount(t.count, t)} — tap + as you go; it is saved in this browser and feeds the Up next planner.`;
    detailEl.append(stepNote);
  }

  // Personal note, saved in the browser.
  if (!hidden) {
    const noteH = document.createElement('h4');
    noteH.textContent = 'Your note';
    detailEl.append(noteH);
    const box = document.createElement('textarea');
    box.id = 'noteBox';
    box.className = 'note-box';
    box.placeholder = 'Your own note — where you left off, what to try next… (press n to jump here)';
    box.value = noteOf(t);
    const saved = document.createElement('p');
    saved.className = 'note-saved';
    box.addEventListener('input', () => {
      const v = box.value;
      if (previewNotes.has(t.id)) previewNotes.delete(t.id);
      if (v.trim()) notes.set(t.id, v);
      else notes.delete(t.id);
      saveNotes();
      saved.textContent = 'Note saved in this browser.';
      renderList();
    });
    detailEl.append(box, saved);
  }

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

// Keyboard: / focuses search, e toggles the selected trophy, n focuses the
// note box, Esc closes the open guide. Typing in a field disables them (except Esc).
document.addEventListener('keydown', (ev) => {
  const tag = (ev.target && ev.target.tagName) || '';
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  if (ev.key === 'Escape') {
    if (selectedId !== null) { selectTrophy(null); ev.preventDefault(); }
    return;
  }
  if (typing || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (ev.key === '/') { $('searchInput').focus(); ev.preventDefault(); }
  else if (ev.key === 'e' && selectedId !== null) {
    const t = byId.get(selectedId);
    if (t) toggleEarned(t, !isEarned(t));
  } else if (ev.key === 'n' && selectedId !== null) {
    const box = $('noteBox');
    if (box) { box.focus(); ev.preventDefault(); }
  }
});

// --- rendering: roadmap ---------------------------------------------------
function renderRoadmap() {
  const ol = $('roadmapList');
  ol.replaceChildren();
  for (const stage of ROADMAP) {
    const covered = stage.ids.map((id) => byId.get(id)).filter(Boolean);
    const done = covered.filter(isEarned).length;
    const li = document.createElement('li');
    const h = document.createElement('h3');
    h.append(document.createTextNode(stage.title + ' '));
    const time = document.createElement('span');
    time.className = 'stage-time';
    time.textContent = stage.time;
    h.append(time);
    li.append(h);
    const prog = document.createElement('div');
    prog.className = 'stage-progress';
    const bar = document.createElement('div');
    bar.className = 'stage-bar';
    const fill = document.createElement('span');
    fill.style.width = `${covered.length ? Math.round((done / covered.length) * 100) : 0}%`;
    bar.append(fill);
    const cnt = document.createElement('span');
    cnt.className = 'stage-count' + (done === covered.length ? ' stage-done' : '');
    cnt.textContent = done === covered.length ? `${done}/${covered.length} — stage complete` : `${done}/${covered.length} trophies`;
    prog.append(bar, cnt);
    li.append(prog);
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
    if (Array.isArray(t.sources) && t.sources.length) {
      const srcLine = document.createElement('p');
      srcLine.className = 'source-line';
      srcLine.append(document.createTextNode('Sources: '));
      t.sources.forEach((s, i) => {
        if (i > 0) srcLine.append(document.createTextNode(' · '));
        const a = document.createElement('a');
        a.href = s.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = s.name.split(' — ')[0];
        srcLine.append(a);
      });
      body.append(srcLine);
    }
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
const VIEWS = ['checklist', 'roadmap', 'missables', 'planner'];
function showView(name) {
  for (const btn of document.querySelectorAll('.tab')) {
    const active = btn.dataset.view === name;
    btn.classList.toggle('active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  }
  for (const v of VIEWS) $(`view-${v}`).hidden = v !== name;
  if (name === 'planner') renderPlanner();
  if (name === 'roadmap') renderRoadmap();
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
    version: 2,
    exported: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
    targets: Object.fromEntries(targets),
    notes: Object.fromEntries(notes),
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
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      targets = new Map();
      if (data.targets && typeof data.targets === 'object') {
        for (const [k, v] of Object.entries(data.targets)) {
          const id = Number(k);
          if (Number.isInteger(id) && byId.has(id) && Number.isFinite(v) && v > 0) targets.set(id, Math.floor(v));
        }
      }
      saveTargets();
      notes = new Map();
      if (data.notes && typeof data.notes === 'object') {
        for (const [k, v] of Object.entries(data.notes)) {
          const id = Number(k);
          if (Number.isInteger(id) && byId.has(id) && typeof v === 'string' && v.trim()) notes.set(id, v);
        }
      }
      saveNotes();
    }
    renderProgress();
    renderList();
    renderDetail();
    renderRoadmap();
    renderPlanner();
    msg.textContent = `Imported ${valid.length} earned trophies from ${file.name}.`;
  } catch {
    msg.textContent = `Could not import ${file.name}: not a valid progress file.`;
  }
  ev.target.value = '';
});

$('resetBtn').addEventListener('click', () => {
  if (!window.confirm('Reset all progress? This clears every earned trophy, target counter and note.')) return;
  earned = new Set();
  targets = new Map();
  notes = new Map();
  previewEarned.clear();
  previewTargets.clear();
  previewNotes.clear();
  saveProgress();
  saveTargets();
  saveNotes();
  renderProgress();
  renderList();
  renderDetail();
  renderRoadmap();
  renderPlanner();
});

// --- filters ------------------------------------------------------------------
$('kindFilter').addEventListener('change', renderList);
$('gradeFilter').addEventListener('change', renderList);
$('sortFilter').addEventListener('change', renderList);
$('searchInput').addEventListener('input', renderList);

// --- init ---------------------------------------------------------------------
syncSettingsUI();
if (params.get('kind')) $('kindFilter').value = params.get('kind');
if (params.get('grade')) $('gradeFilter').value = params.get('grade');
if (params.get('sort')) $('sortFilter').value = params.get('sort');
if (params.get('search')) $('searchInput').value = params.get('search');
renderProgress();
renderList();
renderRoadmap();
renderMissables();
renderPlanner();
renderDetail();
if (params.get('open')) {
  const id = Number(params.get('open'));
  if (byId.has(id)) selectTrophy(id);
}
if (params.get('view') && VIEWS.includes(params.get('view'))) {
  showView(params.get('view'));
}
if (params.get('settings') === '1') {
  settingsPanel.hidden = false;
  $('settingsBtn').setAttribute('aria-expanded', 'true');
}
