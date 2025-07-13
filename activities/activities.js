import { storeCookie, readCookie } from '../js/cookie.js';

let items = [
  { label: "Go for a run", striked: false },
  { label: "Read a book", striked: false },
  { label: "Cook a new recipe", striked: false },
  { label: "Watch a movie", striked: false },
  { label: "Practice coding", striked: false }
];
const PASSWORD = "letmein";

const sideList = document.getElementById('sideList');
const tilesContainer = document.getElementById('tilesContainer');
const editListBtn = document.getElementById('editListBtn');
const modalBg = document.getElementById('modalBg');
const closeModalBtn = document.getElementById('closeModalBtn');
const passwordSection = document.getElementById('passwordSection');
const listSection = document.getElementById('listSection');
const passwordForm = document.getElementById('passwordForm');
const passwordInput = document.getElementById('passwordInput');
const passwordError = document.getElementById('passwordError');
const editList = document.getElementById('editList');
const addItemForm = document.getElementById('addItemForm');
const newItemInput = document.getElementById('newItemInput');

function restoreActivities() {
  const config = readCookie("activities-options");
  if (config) {
    items = config["values"];
  }
}

// Show unstriked first, then striked
function getDisplayOrder(array) {
  const unstriked = array.filter(item => !item.striked);
  const striked = array.filter(item => item.striked);
  return [...unstriked, ...striked];
}

// Render side list (all items)
function renderSideList() {
  sideList.innerHTML = '';
  getDisplayOrder(items).forEach(item => {
    const li = document.createElement('li');
    li.textContent = item.label;
    if (item.striked) li.classList.add('striked');
    li.onclick = () => {
      const idx = items.indexOf(item);
      items[idx].striked = !items[idx].striked;
      storeCookie("activities-options", { "values" : items });
      renderSideList();
      renderTiles();
    };
    sideList.appendChild(li);
  });
}

// Render tiles (only unstriked items)
function renderTiles() {
  tilesContainer.innerHTML = '';
  items.filter(item => !item.striked).forEach(item => {
    const h2 = document.createElement('h2');
    h2.textContent = item.label;
    h2.classList.add('tile-title')

    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.classList.add("tile");
    tile.tabIndex = 0;
    tile.appendChild(h2)
    tile.onclick = () => {
      const idx = items.indexOf(item);
      if (idx !== -1) {
        items[idx].striked = true; // Strike through in list
        storeCookie("activities-options", { "values" : items });
        renderSideList();
        renderTiles(); // tile removed because striked=true
      }
    };
    tilesContainer.appendChild(tile);
  });
}

// Modal open/close
function openModal() {
  modalBg.classList.add('active');
  passwordSection.style.display = '';
  listSection.style.display = 'none';
  passwordInput.value = '';
  passwordError.textContent = '';
  passwordInput.focus();
}
function closeModal() {
  modalBg.classList.remove('active');
  passwordSection.style.display = '';
  listSection.style.display = 'none';
  passwordInput.value = '';
  passwordError.textContent = '';
}

editListBtn.onclick = openModal;
closeModalBtn.onclick = closeModal;
modalBg.onclick = e => {
  if (e.target === modalBg) closeModal();
};

// Password form submit
passwordForm.onsubmit = e => {
  e.preventDefault();
  if (passwordInput.value === PASSWORD) {
    passwordSection.style.display = 'none';
    listSection.style.display = '';
    renderEditList();
    newItemInput.value = '';
    setTimeout(() => newItemInput.focus(), 100);
  } else {
    passwordError.textContent = 'Incorrect password!';
    passwordInput.value = '';
    passwordInput.focus();
  }
};

// Render edit list with reorder & delete
function renderEditList() {
  editList.innerHTML = '';
  items.forEach((item, idx) => {
    const li = document.createElement('li');
    li.textContent = item.label;

    const upBtn = document.createElement('button');
    upBtn.className = 'move-btn';
    upBtn.title = 'Move up';
    upBtn.innerHTML = '↑';
    upBtn.disabled = idx === 0;
    upBtn.onclick = e => {
      e.preventDefault();
      if (idx > 0) {
        [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
        renderEditList();
        renderSideList();
        renderTiles();
      }
    };
    li.appendChild(upBtn);

    const downBtn = document.createElement('button');
    downBtn.className = 'move-btn';
    downBtn.title = 'Move down';
    downBtn.innerHTML = '↓';
    downBtn.disabled = idx === items.length - 1;
    downBtn.onclick = e => {
      e.preventDefault();
      if (idx < items.length - 1) {
        [items[idx + 1], items[idx]] = [items[idx], items[idx + 1]];
        renderEditList();
        renderSideList();
        renderTiles();
      }
    };
    li.appendChild(downBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn';
    delBtn.title = 'Delete';
    delBtn.innerHTML = '&times;';
    delBtn.onclick = e => {
      e.preventDefault();
      items.splice(idx, 1);
      renderEditList();
      renderSideList();
      renderTiles();
    };
    li.appendChild(delBtn);

    editList.appendChild(li);
  });
}

// Add new item form
addItemForm.onsubmit = e => {
  e.preventDefault();
  const val = newItemInput.value.trim();
  if (val && !items.some(item => item.label === val)) {
    items.push({ label: val, striked: false });
    storeCookie("activities-options", { "values" : items });
    renderEditList();
    renderSideList();
    renderTiles();
    newItemInput.value = '';
    newItemInput.focus();
  }
};

// Initial render
restoreActivities();
renderSideList();
renderTiles();