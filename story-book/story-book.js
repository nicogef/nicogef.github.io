import { load as parse, dump } from 'https://esm.sh/js-yaml@4';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/src/marked.js';

marked.setOptions({ headerIds: false, mangle: false });

const storyList   = document.getElementById('story-list');
const storyReader = document.getElementById('story-reader');
const storyWriter = document.getElementById('story-writer');
const storyTitle  = document.getElementById('story-title');
const pageImage   = document.getElementById('page-image');
const pageText    = document.getElementById('page-text');
const choicesEl   = document.getElementById('choices');
const backBtn     = document.getElementById('back-btn');
const mapBtn      = document.getElementById('map-btn');
const loadingMsg  = document.getElementById('loading-msg');
const treeModal   = document.getElementById('tree-modal');
const treeContent = document.getElementById('tree-content');
const closeTree   = document.getElementById('close-tree');
const treeOverlay = document.getElementById('tree-overlay');

let currentPages = null;
let currentStory = null;

// ── Writer state ──────────────────────────────────────────────────────────────
let draftStory      = null;   // { title, description, start, pages: [] }
let editingPageId   = null;
let editingPageImage = null;  // base64 data URL for current page image
let fromWriter      = false;

// ── Utilities ─────────────────────────────────────────────────────────────────

function generateUID() {
  return 'p-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

function normalizeStory(story) {
  if (!Array.isArray(story.pages)) return story;
  return { ...story, pages: story.pages.map(p => p.title ? p : { ...p, title: p.id }) };
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function fetchText(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

async function fetchIndex() {
  const text = await fetchText('./stories/index.yaml');
  return parse(text);
}

async function fetchStory(filename) {
  const text = await fetchText(`./stories/${filename}`);
  return normalizeStory(parse(text));
}

// ── Story list ────────────────────────────────────────────────────────────────

function downloadStory(story) {
  const { _localId, ...storyData } = story;
  const yaml = dump(storyData);
  const blob = new Blob([yaml], { type: 'text/yaml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = (story.title || 'story').replace(/\s+/g, '-').toLowerCase() + '.yaml';
  a.click();
  URL.revokeObjectURL(url);
}

function makeDownloadBtn(story) {
  const btn = document.createElement('button');
  btn.className = 'story-download-btn';
  btn.title = 'Download YAML';
  btn.textContent = '⬇️';
  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (story.password && story.lockReading) {
      const input = prompt('Enter password to download this story:');
      if (input === null) return;
      if (input !== String(story.password)) { alert('Incorrect password.'); return; }
    }
    downloadStory(story);
  });
  return btn;
}

function makeMapBtn(story) {
  const btn = document.createElement('button');
  btn.className = 'story-map-btn';
  btn.title = story.password ? 'View map (password required)' : 'View map';
  btn.textContent = '🗺️';
  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (story.password) {
      const input = prompt('Enter password to view the story map:');
      if (input === null) return;
      if (input !== String(story.password)) { alert('Incorrect password.'); return; }
    }
    const pages = new Map(story.pages.map(p => [p.id, p]));
    showTreeModal(pages, story.start);
  });
  return btn;
}

function makeCardActions(...btns) {
  const wrap = document.createElement('div');
  wrap.className = 'story-card-actions';
  btns.forEach(b => wrap.appendChild(b));
  return wrap;
}

function renderStoryCard(story, filename) {
  const card = document.createElement('div');
  card.className = 'story-card';

  if (story.cover) {
    const img = document.createElement('img');
    img.src = story.cover.startsWith('data:') ? story.cover : `./stories/${story.cover}`;
    img.alt = story.title;
    card.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'story-card-placeholder';
    placeholder.textContent = '📖';
    card.appendChild(placeholder);
  }

  const info = document.createElement('div');
  info.className = 'story-card-info';

  const title = document.createElement('h3');
  title.textContent = story.title;
  info.appendChild(title);

  if (story.description) {
    const desc = document.createElement('p');
    desc.textContent = story.description;
    info.appendChild(desc);
  }

  card.appendChild(info);

  const editBtn = document.createElement('button');
  editBtn.className = 'story-edit-btn';
  editBtn.title = story.password ? 'Edit story (password required)' : 'Edit story';
  editBtn.textContent = '✏️';
  editBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (story.password) {
      const input = prompt('Enter password to edit this story:');
      if (input === null) return;
      if (input !== String(story.password)) { alert('Incorrect password.'); return; }
    }
    loadStoryIntoWriter(story);
  });
  card.appendChild(makeCardActions(makeMapBtn(story), editBtn, makeDownloadBtn(story)));
  card.addEventListener('click', () => openStory(story, filename));
  storyList.appendChild(card);
}

function setHeaderControls(visible) {
  const v = visible ? '' : 'none';
  document.getElementById('write-story-card').style.display = v;
  document.getElementById('upload-story-btn').style.display = v;
}

function setReaderMode(active) {
  setHeaderControls(!active);
  mapBtn.style.display = active ? 'none' : '';
}

function openStory(story, filename) {
  if (story.password && story.lockReading) {
    const input = prompt('Enter password to read this story:');
    if (input === null) return;
    if (input !== String(story.password)) { alert('Incorrect password.'); return; }
  }

  currentStory = story;
  currentPages = new Map(story.pages.map(p => [p.id, p]));

  storyTitle.textContent = story.title;
  storyList.style.display = 'none';
  storyReader.style.display = 'block';
  setReaderMode(true);

  if (story.cover) {
    showCover(story);
  } else {
    renderPage(story.start);
  }
}

function showCover(story) {
  pageImage.src = story.cover.startsWith('data:') ? story.cover : `./stories/${story.cover}`;
  pageImage.classList.add('cover-mode');
  pageImage.style.display = 'block';
  pageText.innerHTML = '';
  choicesEl.innerHTML = '';

  const btn = document.createElement('button');
  btn.className = 'choice-btn';
  btn.textContent = 'Start reading →';
  btn.addEventListener('click', () => {
    pageImage.classList.remove('cover-mode');
    renderPage(story.start);
  });
  choicesEl.appendChild(btn);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Reader ────────────────────────────────────────────────────────────────────

function renderPage(id) {
  const page = currentPages.get(id);
  if (!page) {
    pageText.innerHTML = `<p style="color:red">Page not found: ${id}</p>`;
    return;
  }

  if (page.image) {
    pageImage.src = page.image.startsWith('data:') ? page.image : `./stories/${page.image}`;
    pageImage.style.display = 'block';
  } else {
    pageImage.style.display = 'none';
  }

  pageText.innerHTML = marked.parse(page.text || '');
  choicesEl.innerHTML = '';

  if (page.choices && page.choices.length > 0) {
    page.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      btn.addEventListener('click', () => renderPage(choice.next));
      choicesEl.appendChild(btn);
    });
  } else if (page.next) {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = 'Next →';
    btn.addEventListener('click', () => renderPage(page.next));
    choicesEl.appendChild(btn);
  } else {
    const msg = document.createElement('p');
    msg.className = 'end-message';
    msg.textContent = 'The End';
    choicesEl.appendChild(msg);

    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = fromWriter ? '← Back to editor' : 'Read another story';
    btn.addEventListener('click', () => {
      storyReader.style.display = 'none';
      setReaderMode(false);
      if (fromWriter) {
        fromWriter = false;
        storyWriter.style.display = 'block';
      } else {
        storyList.style.display = 'grid';
      }
    });
    choicesEl.appendChild(btn);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Story tree (SVG) ──────────────────────────────────────────────────────────

function escXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderTreeSvg(pages, startId) {
  const NW = 145, NH = 54, CW = 195, CH = 140, PX = 60, PY = 24;

  const globallyExpanded = new Set();

  function makeNode(pageId, path) {
    if (path.has(pageId)) {
      const lp = pages.get(pageId);
      return { id: pageId, title: lp?.title || pageId, isPhantom: true, phantomType: 'loop' };
    }
    const page = pages.get(pageId);
    if (!page)                        return { id: pageId, title: pageId, isPhantom: true, phantomType: 'missing' };
    if (globallyExpanded.has(pageId)) return { id: pageId, title: page.title || pageId, isPhantom: true, phantomType: 'ref' };
    globallyExpanded.add(pageId);

    const rawText = (page.text || '').replace(/[*#_`>]/g, '').split('\n').map(l => l.trim()).find(l => l.length > 0) || '';
    const preview = rawText.slice(0, 28) + (rawText.length > 28 ? '…' : '');
    const isEnd = !page.choices && !page.next;
    const node = { id: pageId, title: page.title || pageId, type: isEnd ? 'end' : 'normal', preview, children: [], labels: [] };

    const childPath = new Set(path);
    childPath.add(pageId);
    if (page.choices?.length > 0) {
      for (const c of page.choices) {
        node.labels.push(c.text.slice(0, 20) + (c.text.length > 20 ? '…' : ''));
        node.children.push(makeNode(c.next, childPath));
      }
    } else if (page.next) {
      node.labels.push('');
      node.children.push(makeNode(page.next, childPath));
    }
    return node;
  }

  const root = makeNode(startId, new Set());

  let leafCount = 0;
  function assignPos(node, depth) {
    node.depth = depth;
    const real = node.children.filter(c => !c.isPhantom);
    const refs  = node.children.filter(c => c.isPhantom && c.phantomType === 'ref');
    for (const c of real) assignPos(c, depth + 1);
    for (const r of refs) { r.depth = depth + 1; r.col = leafCount++; }
    const positioned = [...real, ...refs];
    if (positioned.length === 0) { node.col = leafCount++; }
    else { node.col = (positioned[0].col + positioned[positioned.length - 1].col) / 2; }
  }
  assignPos(root, 0);

  const allNodes = [], allEdges = [], backEdges = [];
  function collect(node) {
    allNodes.push(node);
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i], label = node.labels[i];
      if (child.isPhantom) {
        if (child.phantomType === 'loop') {
          backEdges.push({ from: node, toId: child.id, type: 'loop', label });
        } else if (child.phantomType === 'ref') {
          allNodes.push(child);
          allEdges.push({ from: node, to: child, label });
        }
      } else {
        allEdges.push({ from: node, to: child, label });
        collect(child);
      }
    }
  }
  collect(root);

  const maxDepth = Math.max(...allNodes.map(n => n.depth));
  const loopEdges = backEdges.filter(e => e.type === 'loop');
  const svgW = leafCount * CW + PX * 2;
  const svgH = (maxDepth + 1) * CH + PY * 2;

  const ncx   = n => PX + n.col * CW + CW / 2;
  const ncy   = n => PY + n.depth * CH + NH / 2;
  const nleft = n => ncx(n) - NW / 2;
  const ntop  = n => PY + n.depth * CH;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="font-family:'Segoe UI',Arial,sans-serif;display:block">`;

  s += `<defs>
    <filter id="ns" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.09"/>
    </filter>
    <marker id="ma"    markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto"><path d="M0 0 L7 2.5 L0 5Z" fill="#9aa0cc"/></marker>
    <marker id="mloop" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto"><path d="M0 0 L7 2.5 L0 5Z" fill="#e74c3c"/></marker>
  </defs>`;

  s += `<rect width="${svgW}" height="${svgH}" fill="#f7f8fc"/>`;
  for (let d = 0; d <= maxDepth; d++) {
    if (d % 2 === 0) s += `<rect x="0" y="${PY + d * CH - 8}" width="${svgW}" height="${NH + 16}" fill="rgba(107,115,255,0.04)"/>`;
  }

  for (const e of allEdges) {
    const x1 = ncx(e.from), y1 = ncy(e.from) + NH / 2;
    const x2 = ncx(e.to),   y2 = ncy(e.to)   - NH / 2;
    const cp = (y2 - y1) * 0.5;
    s += `<path d="M${x1} ${y1} C${x1} ${y1+cp} ${x2} ${y2-cp} ${x2} ${y2}" fill="none" stroke="#9aa0cc" stroke-width="1.6" marker-end="url(#ma)"/>`;
    if (e.label) {
      const lx = (x1 + x2) / 2, ly = (y1 + y2) / 2;
      const lw = Math.min(e.label.length * 6 + 18, 128);
      s += `<rect x="${lx-lw/2}" y="${ly-9}" width="${lw}" height="17" rx="5" fill="#fff" stroke="#c8ccf0" stroke-width="1"/>`;
      s += `<text x="${lx}" y="${ly+4.5}" text-anchor="middle" font-size="9" fill="#6b73ff" font-weight="600">${escXml(e.label)}</text>`;
    }
  }

  loopEdges.forEach((e, idx) => {
    const fromNode = e.from;
    const toNode = allNodes.find(n => n.id === e.toId);
    if (!toNode) return;
    const x1 = ncx(fromNode) - NW / 2, y1 = ncy(fromNode);
    const x2 = ncx(toNode)   - NW / 2, y2 = ncy(toNode);
    const lane = Math.min(x1, x2) - 28 - idx * 18;
    s += `<path d="M${x1} ${y1} C${lane} ${y1} ${lane} ${y2} ${x2} ${y2}" fill="none" stroke="#e74c3c" stroke-width="1.8" marker-end="url(#mloop)"/>`;
    if (e.label) {
      const lx = lane, ly = (y1 + y2) / 2;
      const lw = Math.min(e.label.length * 6 + 18, 120);
      s += `<rect x="${lx-lw/2}" y="${ly-9}" width="${lw}" height="17" rx="5" fill="#fff" stroke="#f5c6c0" stroke-width="1"/>`;
      s += `<text x="${lx}" y="${ly+4.5}" text-anchor="middle" font-size="9" fill="#e74c3c" font-weight="600">${escXml(e.label)}</text>`;
    }
  });

  for (const node of allNodes) {
    const x = nleft(node), y = ntop(node), cx = ncx(node);

    if (node.isPhantom) {
      const dashStyle = node.phantomType === 'missing'
        ? 'fill="#fff0f0" stroke="#e74c3c"'
        : 'fill="#f4f4f4" stroke="#aaa"';
      s += `<rect x="${x}" y="${y}" width="${NW}" height="${NH}" rx="11" ${dashStyle} stroke-width="1.5" stroke-dasharray="5,3"/>`;
      const displayStr = node.title.length > 18 ? node.title.slice(0, 18) + '…' : node.title;
      const label = node.phantomType === 'missing' ? '⚠ missing' : '↗ see above';
      const labelColor = node.phantomType === 'missing' ? '#e74c3c' : '#aaa';
      s += `<text x="${cx}" y="${y+20}" text-anchor="middle" font-size="11" font-weight="700" fill="${labelColor}">${escXml(displayStr)}</text>`;
      s += `<text x="${cx}" y="${y+35}" text-anchor="middle" font-size="9" fill="${labelColor}">${label}</text>`;
      continue;
    }

    const isEnd = node.type === 'end';
    const bg = isEnd ? '#eaf9f0' : '#ffffff';
    const border = isEnd ? '#27ae60' : '#6b73ff';
    const titleColor = isEnd ? '#1a6b3a' : '#2d3a4b';

    s += `<rect x="${x}" y="${y}" width="${NW}" height="${NH}" rx="11" fill="${bg}" stroke="${border}" stroke-width="2" filter="url(#ns)"/>`;
    const displayStr = node.title.length > 18 ? node.title.slice(0, 18) + '…' : node.title;
    s += `<text x="${cx}" y="${y+20}" text-anchor="middle" font-size="11" font-weight="700" fill="${titleColor}">${escXml(displayStr)}</text>`;
    if (node.preview) {
      s += `<text x="${cx}" y="${y+35}" text-anchor="middle" font-size="9" fill="#777" font-style="italic">${escXml(node.preview)}</text>`;
    }
    if (isEnd) {
      s += `<rect x="${cx-16}" y="${y+NH-14}" width="32" height="12" rx="4" fill="#27ae60" opacity="0.2"/>`;
      s += `<text x="${cx}" y="${y+NH-4}" text-anchor="middle" font-size="8.5" fill="#1a7a40" font-weight="700">★ END</text>`;
    }
  }

  return s + '</svg>';
}

// ── Zoom ──────────────────────────────────────────────────────────────────────

let treeZoom = 1;

function setTreeZoom(z) {
  const svg = treeContent.querySelector('svg');
  if (!svg) return;
  treeZoom = Math.max(0.25, Math.min(2, z));
  const vb = svg.getAttribute('viewBox').split(' ').map(Number);
  svg.setAttribute('width',  Math.round(vb[2] * treeZoom));
  svg.setAttribute('height', Math.round(vb[3] * treeZoom));
  document.getElementById('zoom-label').textContent = Math.round(treeZoom * 100) + '%';
}

document.getElementById('zoom-in') .addEventListener('click', () => setTreeZoom(treeZoom + 0.15));
document.getElementById('zoom-out').addEventListener('click', () => setTreeZoom(treeZoom - 0.15));

function showTreeModal(pages, startId) {
  treeContent.innerHTML = renderTreeSvg(pages, startId);
  treeModal.style.display = 'flex';

  requestAnimationFrame(() => {
    const svg = treeContent.querySelector('svg');
    if (!svg) return;
    const vb = svg.getAttribute('viewBox').split(' ').map(Number);
    const fitZoom = Math.min(
      treeContent.clientWidth  / vb[2],
      treeContent.clientHeight / vb[3]
    );
    treeZoom = fitZoom;
    svg.setAttribute('width',  Math.round(vb[2] * treeZoom));
    svg.setAttribute('height', Math.round(vb[3] * treeZoom));
    document.getElementById('zoom-label').textContent = Math.round(treeZoom * 100) + '%';
  });
}

function openTreeModal() {
  if (!currentStory || !currentPages) return;
  if (currentStory.password) {
    const code = prompt('Enter password to view the story map:');
    if (code === null) return;
    if (code !== String(currentStory.password)) { alert('Incorrect password.'); return; }
  }
  showTreeModal(currentPages, currentStory.start);
}

function closeTreeModal() {
  treeModal.style.display = 'none';
}

mapBtn.addEventListener('click', openTreeModal);
closeTree.addEventListener('click', closeTreeModal);
treeOverlay.addEventListener('click', closeTreeModal);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeTreeModal();
});

// ── Navigation ────────────────────────────────────────────────────────────────

backBtn.addEventListener('click', () => {
  storyReader.style.display = 'none';
  setReaderMode(false);
  if (fromWriter) {
    fromWriter = false;
    storyWriter.style.display = 'block';
  } else {
    storyList.style.display = 'grid';
  }
});

// ── Writer ────────────────────────────────────────────────────────────────────

function syncDraftMeta() {
  const titleEl = document.getElementById('writer-title-input');
  const descEl  = document.getElementById('writer-desc-input');
  const pwEl    = document.getElementById('writer-password-input');
  if (titleEl && draftStory) draftStory.title       = titleEl.value;
  if (descEl  && draftStory) draftStory.description = descEl.value;
  if (pwEl    && draftStory) draftStory.password    = pwEl.value.trim() || undefined;
  const lockEl = document.getElementById('writer-lock-reading');
  if (lockEl  && draftStory) draftStory.lockReading = lockEl.checked || undefined;
}

function getPageOptions(excludeId) {
  return draftStory.pages.map(p => p.id).filter(id => id !== excludeId);
}

function createNewPage() {
  const id = generateUID();
  draftStory.pages.push({ id, title: 'Page ' + (draftStory.pages.length + 1), text: '', choices: [] });
  renderPageList();
  return id;
}

// Custom dropdown — avoids native <select> which breaks inside backdrop-filter on Windows Chrome.
function makePicker(dest) {
  const wrap = document.createElement('div');
  wrap.className = 'dest-wrap';
  wrap.dataset.value = dest || '';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'dest-trigger';

  const menu = document.createElement('div');
  menu.className = 'dest-menu';

  function label(id) {
    const p = draftStory.pages.find(pg => pg.id === id);
    return p ? (p.title || id) : id;
  }

  function setSelected(id) {
    wrap.dataset.value = id || '';
    trigger.textContent = id ? label(id) : '— pick a page —';
    trigger.textContent += ' ▾';
    menu.querySelectorAll('.dest-item[data-id]').forEach(el =>
      el.classList.toggle('active', el.dataset.id === id)
    );
  }

  function buildMenu() {
    menu.innerHTML = '';
    getPageOptions(editingPageId).forEach(id => {
      const item = document.createElement('div');
      item.className = 'dest-item';
      item.dataset.id = id;
      item.textContent = label(id);
      if (id === wrap.dataset.value) item.classList.add('active');
      item.addEventListener('click', () => { setSelected(id); menu.classList.remove('open'); });
      menu.appendChild(item);
    });

    const newItem = document.createElement('div');
    newItem.className = 'dest-item dest-new';
    newItem.textContent = '✨ New page';
    newItem.addEventListener('click', () => {
      const id = createNewPage();
      buildMenu();
      setSelected(id);
      menu.classList.remove('open');
    });
    menu.appendChild(newItem);
  }

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    buildMenu();
    menu.classList.toggle('open');
  });

  document.addEventListener('click', () => menu.classList.remove('open'));

  setSelected(dest);
  wrap.append(trigger, menu);
  return wrap;
}

function addChoiceRow(container, text, dest) {
  const row = document.createElement('div');
  row.className = 'writer-choice-row';

  const textInput = document.createElement('input');
  textInput.className = 'choice-text-input';
  textInput.placeholder = 'Choice text…';
  textInput.value = text || '';

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'choice-del-btn';
  delBtn.title = 'Remove choice';
  delBtn.textContent = '✕';
  delBtn.addEventListener('click', () => row.remove());

  row.append(textInput, makePicker(dest), delBtn);
  container.appendChild(row);
}

function openPageEditor(pageId) {
  editingPageId = pageId;
  renderPageList();

  const page = draftStory.pages.find(p => p.id === pageId);
  if (!page) return;

  let pageType = 'end';
  if (page.choices && page.choices.length > 0) pageType = 'choices';
  else if (page.next) pageType = 'continue';

  const opts = getPageOptions(pageId);
  const nextVal = page.next || opts[0] || '';

  editingPageImage = page.image || null;

  const editor = document.getElementById('writer-editor');
  editor.innerHTML = `
    <label class="writer-field-label">Page title</label>
    <input id="ed-title" class="writer-id-input" value="${escHtml(page.title || page.id)}" />

    <label class="writer-field-label">Page image <span style="font-weight:400;color:#aaa">(optional)</span></label>
    <div id="ed-image-area"></div>
    <input type="file" id="ed-image-input" accept="image/*" style="display:none" />

    <label class="writer-field-label">Story text</label>
    <textarea id="ed-text" class="writer-textarea">${escHtml(page.text || '')}</textarea>

    <label class="writer-field-label">Page type</label>
    <div class="writer-type-row">
      <button type="button" class="writer-type-btn ${pageType === 'choices'  ? 'active' : ''}" data-type="choices">🔀 Choices</button>
      <button type="button" class="writer-type-btn ${pageType === 'continue' ? 'active' : ''}" data-type="continue">➡ Next Page</button>
      <button type="button" class="writer-type-btn ${pageType === 'end'      ? 'active' : ''}" data-type="end">★ End</button>
    </div>

    <div id="ed-choices-section" style="display:${pageType === 'choices' ? 'block' : 'none'}">
      <label class="writer-field-label">Choices</label>
      <div id="choice-rows"></div>
      <button type="button" id="ed-add-choice" class="writer-add-choice">+ Add Choice</button>
    </div>

    <div id="ed-continue-section" style="display:${pageType === 'continue' ? 'block' : 'none'}">
      <label class="writer-field-label">Next page</label>
      <div id="ed-next-picker"></div>
    </div>

    <button id="ed-save" type="button" class="writer-save-btn">💾 Save</button>
  `;

  // Populate existing choices
  if (page.choices && page.choices.length > 0) {
    const choiceRows = document.getElementById('choice-rows');
    page.choices.forEach(c => addChoiceRow(choiceRows, c.text, c.next));
  }

  // Type toggle buttons
  editor.querySelectorAll('.writer-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      editor.querySelectorAll('.writer-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const t = btn.dataset.type;
      document.getElementById('ed-choices-section').style.display  = t === 'choices'  ? 'block' : 'none';
      document.getElementById('ed-continue-section').style.display = t === 'continue' ? 'block' : 'none';
    });
  });

  // Populate "continue" next-page picker
  const nextPickerEl = document.getElementById('ed-next-picker');
  nextPickerEl.appendChild(makePicker(nextVal));

  // Add choice
  document.getElementById('ed-add-choice').addEventListener('click', () => {
    const choiceRows = document.getElementById('choice-rows');
    const firstDest = getPageOptions(editingPageId)[0] || '';
    addChoiceRow(choiceRows, '', firstDest);
  });

  // Page image
  renderPageImagePreview();
  document.getElementById('ed-image-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const r = new FileReader();
    r.onload = ev => { editingPageImage = ev.target.result; renderPageImagePreview(); };
    r.readAsDataURL(file);
  });

  // Save
  document.getElementById('ed-save').addEventListener('click', () => saveCurrentPage(true));
}

function renderPageImagePreview() {
  const area = document.getElementById('ed-image-area');
  if (!area) return;
  area.innerHTML = '';
  if (editingPageImage) {
    const img = document.createElement('img');
    img.src = editingPageImage;
    img.className = 'ed-image-preview';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'ed-image-remove';
    removeBtn.textContent = '✕ Remove';
    removeBtn.addEventListener('click', () => { editingPageImage = null; renderPageImagePreview(); });
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'writer-add-choice';
    uploadBtn.textContent = '📷 Change';
    uploadBtn.style.marginTop = '4px';
    uploadBtn.addEventListener('click', () => document.getElementById('ed-image-input').click());
    area.append(img, removeBtn, uploadBtn);
  } else {
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'writer-add-choice';
    uploadBtn.textContent = '📷 Add image';
    uploadBtn.addEventListener('click', () => document.getElementById('ed-image-input').click());
    area.appendChild(uploadBtn);
  }
}

function showSaveError(msg) {
  const saveBtn = document.getElementById('ed-save');
  if (!saveBtn) return;
  const orig = saveBtn.textContent;
  saveBtn.textContent = msg || '⚠ Fix errors';
  saveBtn.classList.add('save-btn-error');
  setTimeout(() => { saveBtn.textContent = orig; saveBtn.classList.remove('save-btn-error'); }, 2000);
}

function markError(el) {
  if (!el) return;
  el.classList.add('input-error');
  el.addEventListener('input', () => el.classList.remove('input-error'), { once: true });
}

function saveCurrentPage(validate = false) {
  syncDraftMeta();
  const titleEl = document.getElementById('ed-title');
  const textEl  = document.getElementById('ed-text');
  if (!editingPageId) return;

  const activeBtn = document.getElementById('writer-editor').querySelector('.writer-type-btn.active');
  const pageType  = activeBtn ? activeBtn.dataset.type : 'end';

  const pageIdx = draftStory.pages.findIndex(p => p.id === editingPageId);
  if (pageIdx === -1) return;

  // Validate only on explicit save
  if (validate) {
    let hasError = false;
    if (!titleEl?.value.trim()) { markError(titleEl); hasError = true; }
    if (!textEl?.value.trim())  { markError(textEl);  hasError = true; }
    if (hasError) { showSaveError('⚠ Fix errors'); return; }
  }

  const page = {
    id:    editingPageId,
    title: titleEl ? titleEl.value.trim() : editingPageId,
    text:  textEl  ? textEl.value : '',
    image: editingPageImage || undefined,
  };

  if (pageType === 'choices') {
    page.choices = [];
    let choiceError = false;
    document.querySelectorAll('#choice-rows .writer-choice-row').forEach(row => {
      const input = row.querySelector('.choice-text-input');
      const text  = input.value.trim();
      const next  = row.querySelector('.dest-wrap')?.dataset.value || '';
      if (validate && !text) {
        markError(input);
        choiceError = true;
      } else if (text) {
        page.choices.push({ text, next });
      }
    });
    if (choiceError) { showSaveError('⚠ Fix errors'); return; }
  } else if (pageType === 'continue') {
    const pickerEl = document.querySelector('#ed-next-picker .dest-wrap');
    const nextVal = pickerEl ? pickerEl.dataset.value : '';
    if (nextVal) page.next = nextVal;
  }

  draftStory.pages[pageIdx] = page;
  renderPageList();

  if (validate) {
    persistDraft();
    const saveBtn = document.getElementById('ed-save');
    if (saveBtn) {
      const orig = saveBtn.textContent;
      saveBtn.textContent = '✅ Saved!';
      setTimeout(() => { saveBtn.textContent = orig; }, 1500);
    }
  }
}

function renderPageList() {
  const list = document.getElementById('writer-page-list');
  list.innerHTML = '';

  draftStory.pages.forEach((page, idx) => {
    const card = document.createElement('div');
    card.className = 'writer-page-card' + (page.id === editingPageId ? ' active' : '');

    const label = document.createElement('span');
    label.className = 'writer-page-label';
    label.textContent = (idx === 0 ? '🏠 ' : '📄 ') + (page.title || page.id);

    const delBtn = document.createElement('button');
    delBtn.className = 'writer-page-del';
    delBtn.textContent = '✕';
    delBtn.disabled = draftStory.pages.length === 1;
    delBtn.title = 'Delete page';
    delBtn.addEventListener('click', e => { e.stopPropagation(); deletePage(page.id); });

    card.appendChild(label);
    card.appendChild(delBtn);
    card.addEventListener('click', () => {
      if (editingPageId && editingPageId !== page.id) {
        saveCurrentPage();
        persistDraft();
      }
      openPageEditor(page.id);
    });
    list.appendChild(card);
  });
}

function addPage() {
  const id = generateUID();
  draftStory.pages.push({ id, title: 'Page ' + draftStory.pages.length, text: '', choices: [] });
  renderPageList();
  openPageEditor(id);
}

function deletePage(pageId) {
  if (draftStory.pages.length <= 1) return;
  draftStory.pages = draftStory.pages.filter(p => p.id !== pageId);
  if (editingPageId === pageId) {
    editingPageId = null;
    document.getElementById('writer-editor').innerHTML = '<p class="writer-hint">← Pick a page or add a new one!</p>';
  }
  renderPageList();
}

function openWriter() {
  storyList.style.display = 'none';
  storyWriter.style.display = 'block';
  setHeaderControls(false);

  const startUid = generateUID();
  draftStory = {
    title: '',
    description: '',
    start: startUid,
    pages: [{ id: startUid, title: 'Start', text: '', choices: [] }],
  };
  editingPageId = null;

  document.getElementById('writer-title-input').value    = '';
  document.getElementById('writer-desc-input').value     = '';
  document.getElementById('writer-password-input').value = '';
  document.getElementById('writer-lock-reading').checked = false;
  renderCoverPreview();

  renderPageList();
  openPageEditor(startUid);
}

function loadStoryIntoWriter(story) {
  storyList.style.display = 'none';
  storyWriter.style.display = 'block';
  setHeaderControls(false);

  draftStory = {
    _localId:    story._localId    || undefined,
    title:       story.title       || '',
    description: story.description || '',
    password:    story.password    || undefined,
    lockReading: story.lockReading || undefined,
    start:       story.start       || story.pages[0]?.id || 'start',
    pages:       story.pages.map(p => ({ ...p })),
  };
  editingPageId = null;

  document.getElementById('writer-title-input').value    = draftStory.title;
  document.getElementById('writer-desc-input').value     = draftStory.description;
  document.getElementById('writer-password-input').value = story.password || '';
  document.getElementById('writer-lock-reading').checked = !!story.lockReading;
  renderCoverPreview();

  renderPageList();
  if (draftStory.pages.length > 0) openPageEditor(draftStory.pages[0].id);
}

// ── Local library (localStorage) ──────────────────────────────────────────────

const LIBRARY_KEY = 'nicogef-story-book-library';

function persistDraft() {
  if (!draftStory || !draftStory.pages?.length) return;
  syncDraftMeta();
  if (!draftStory._localId) draftStory._localId = Date.now().toString(36);
  const library = getLibrary();
  const idx = library.findIndex(s => s._localId === draftStory._localId);
  if (idx === -1) library.push({ ...draftStory });
  else library[idx] = { ...draftStory };
  setLibrary(library);
}

function getLibrary() {
  try { return JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]').map(normalizeStory); }
  catch { return []; }
}

function setLibrary(stories) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(stories));
}

function saveToLibrary() {
  saveCurrentPage();
  syncDraftMeta();
  if (!draftStory.title.trim()) {
    alert('Please add a story title before saving.');
    return;
  }
  if (!draftStory._localId) draftStory._localId = Date.now().toString(36);
  const library = getLibrary();
  const idx = library.findIndex(s => s._localId === draftStory._localId);
  if (idx === -1) library.push({ ...draftStory });
  else library[idx] = { ...draftStory };
  setLibrary(library);
  refreshLocalStories();

  const btn = document.getElementById('writer-save-library-btn');
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = '✅ Saved!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  }
}

function deleteLocalStory(localId) {
  setLibrary(getLibrary().filter(s => s._localId !== localId));
  refreshLocalStories();
}

function refreshLocalStories() {
  document.querySelectorAll('.local-story-card').forEach(c => c.remove());
  getLibrary().forEach(story => renderLocalStoryCard(story));
}

function renderLocalStoryCard(story) {
  const card = document.createElement('div');
  card.className = 'story-card local-story-card';

  if (story.cover) {
    const img = document.createElement('img');
    img.src = story.cover.startsWith('data:') ? story.cover : `./stories/${story.cover}`;
    img.alt = story.title;
    card.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'story-card-placeholder';
    placeholder.textContent = '📝';
    card.appendChild(placeholder);
  }

  const info = document.createElement('div');
  info.className = 'story-card-info';

  const title = document.createElement('h3');
  title.textContent = story.title || 'Untitled Story';
  info.appendChild(title);

  if (story.description) {
    const desc = document.createElement('p');
    desc.textContent = story.description;
    info.appendChild(desc);
  }

  const badge = document.createElement('span');
  badge.className = 'local-badge';
  badge.textContent = 'My story';
  info.appendChild(badge);

  card.appendChild(info);

  card.addEventListener('click', () => openStory(story, null));

  const editBtn = document.createElement('button');
  editBtn.className = 'story-edit-btn';
  editBtn.title = story.password ? 'Edit story (password required)' : 'Edit story';
  editBtn.textContent = '✏️';
  editBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (story.password) {
      const input = prompt('Enter password to edit this story:');
      if (input === null) return;
      if (input !== String(story.password)) { alert('Incorrect password.'); return; }
    }
    loadStoryIntoWriter(story);
  });

  const delBtn = document.createElement('button');
  delBtn.className = 'story-delete-btn';
  delBtn.title = story.password ? 'Delete from library (password required)' : 'Delete from library';
  delBtn.textContent = '🗑️';
  delBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (story.password) {
      const input = prompt('Enter password to delete this story:');
      if (input === null) return;
      if (input !== String(story.password)) { alert('Incorrect password.'); return; }
    }
    if (confirm(`Delete "${story.title || 'this story'}" from your library?`)) {
      deleteLocalStory(story._localId);
    }
  });

  card.appendChild(makeCardActions(makeMapBtn(story), editBtn, makeDownloadBtn(story), delBtn));
  storyList.appendChild(card);
}

function openMapDirect() {
  saveCurrentPage();
  const pages = new Map(draftStory.pages.map(p => [p.id, p]));
  showTreeModal(pages, draftStory.start);
}

function playDraft() {
  saveCurrentPage();
  persistDraft();
  fromWriter    = true;
  currentPages  = new Map(draftStory.pages.map(p => [p.id, p]));
  currentStory  = { ...draftStory };
  storyTitle.textContent = draftStory.title || 'My Story';
  storyWriter.style.display = 'none';
  storyReader.style.display = 'block';
  setReaderMode(true);
  renderPage(draftStory.start);
}

function downloadDraft() {
  saveCurrentPage();
  syncDraftMeta();
  // Also save/update in local library
  if (!draftStory._localId) draftStory._localId = Date.now().toString(36);
  const library = getLibrary();
  const idx = library.findIndex(s => s._localId === draftStory._localId);
  if (idx === -1) library.push({ ...draftStory });
  else library[idx] = { ...draftStory };
  setLibrary(library);
  refreshLocalStories();

  downloadStory(draftStory);
}

// ── Upload story ──────────────────────────────────────────────────────────────

document.getElementById('upload-story-btn').addEventListener('click', () => {
  document.getElementById('upload-story-input').click();
});

document.getElementById('upload-story-input').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  try {
    const text  = await file.text();
    const story = normalizeStory(parse(text));
    if (!story.title || !Array.isArray(story.pages) || story.pages.length === 0) {
      alert('Invalid story file — must have a title and at least one page.');
      return;
    }
    const library = getLibrary();
    // Same _localId → silent update (same story re-uploaded)
    const byId = story._localId ? library.findIndex(s => s._localId === story._localId) : -1;
    if (byId !== -1) {
      library[byId] = story;
      setLibrary(library);
      refreshLocalStories();
      return;
    }
    // Same title → ask to replace
    const byTitle = library.findIndex(s => s.title === story.title);
    if (byTitle !== -1) {
      if (!confirm(`A story named "${story.title}" already exists. Replace it?`)) return;
      story._localId = library[byTitle]._localId;
      library[byTitle] = story;
      setLibrary(library);
      refreshLocalStories();
      return;
    }
    // New story
    story._localId = Date.now().toString(36);
    library.push(story);
    setLibrary(library);
    refreshLocalStories();
  } catch (err) {
    alert('Could not read the file: ' + err.message);
  }
});

// Wire writer buttons
document.getElementById('write-story-card')   .addEventListener('click', openWriter);
document.getElementById('writer-back-btn')    .addEventListener('click', () => {
  saveCurrentPage();
  persistDraft();
  refreshLocalStories();
  storyWriter.style.display = 'none';
  storyList.style.display = 'grid';
  setHeaderControls(true);
});
document.getElementById('writer-map-btn')     .addEventListener('click', openMapDirect);
document.getElementById('writer-play-btn')    .addEventListener('click', playDraft);
document.getElementById('writer-download-btn')    .addEventListener('click', downloadDraft);
document.getElementById('writer-save-library-btn').addEventListener('click', saveToLibrary);
document.getElementById('writer-add-page-btn')    .addEventListener('click', addPage);

// Cover image
const writerCoverArea  = document.getElementById('writer-cover-area');
const writerCoverInput = document.getElementById('writer-cover-input');

writerCoverArea.addEventListener('click', () => writerCoverInput.click());
writerCoverInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  const reader = new FileReader();
  reader.onload = ev => {
    draftStory.cover = ev.target.result;
    renderCoverPreview();
  };
  reader.readAsDataURL(file);
});

function renderCoverPreview() {
  writerCoverArea.innerHTML = '';
  writerCoverArea.appendChild(writerCoverInput);
  if (draftStory?.cover) {
    const img = document.createElement('img');
    img.src = draftStory.cover;
    img.className = 'writer-cover-img';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'writer-cover-remove';
    remove.textContent = '✕';
    remove.addEventListener('click', e => { e.stopPropagation(); draftStory.cover = undefined; renderCoverPreview(); });
    writerCoverArea.append(img, remove);
  } else {
    const ph = document.createElement('span');
    ph.className = 'writer-cover-placeholder';
    ph.textContent = '📖';
    writerCoverArea.appendChild(ph);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  try {
    const filenames = await fetchIndex();
    loadingMsg.remove();

    for (const filename of filenames) {
      const story = await fetchStory(filename);
      renderStoryCard(story, filename);
    }

    storyList.style.display = 'grid';
    refreshLocalStories();
  } catch (err) {
    loadingMsg.textContent = `Error loading stories: ${err.message}`;
    console.error(err);
  }
}

init();
