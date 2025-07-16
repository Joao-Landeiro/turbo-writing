// ui.js
// Handles all UI rendering and DOM event handling for No Bullshit Writer

import * as State from './stateManager.js';

// --- DOM Elements ---
const get = (id) => document.getElementById(id);
const editor = get('editor');
const sidebar = get('sidebar');
const docsList = get('docs-list');
const newBtn = get('new-doc-btn');
const exportBtn = get('export-json-btn');
const writeBtn = get('write-mode-btn');
const editBtn = get('edit-mode-btn');
const editModal = get('edit-modal');
const editPhraseElem = get('edit-phrase');
const editPhraseInput = get('edit-phrase-input');
const editConfirmBtn = get('edit-confirm-btn');
const timerSpan = get('timer');

// --- Timer State ---
let timerInterval = null;
let currentEditPhrase = '';

// --- Phrases for Edit Modal (as per PRD) ---
const editPhrases = [
  'I will edit with intention',
  'No accidental changes',
  'Edit mode is for revision',
  'I accept the risk',
  'Intentional editing only',
  'I am ready to edit',
  'Edit mode unlock',
  'Proceed to edit'
];

// =============================================================================
// == 1. RENDER & UI UPDATE FUNCTIONS
// =============================================================================

/**
 * Renders the list of documents in the sidebar.
 * Disables "+ New" button if doc limit is reached.
 */
function renderDocsList() {
  docsList.innerHTML = '';
  State.docs.slice(0, 20).forEach(doc => {
    const title = doc.title || 'Untitled';
    const isActive = doc.id === State.appState.docId;

    const li = document.createElement('li');
    li.className = `list-group-item d-flex align-items-center justify-content-between ${isActive ? 'active' : ''}`;
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    li.setAttribute('aria-label', `Select document: ${title}`);
    li.dataset.docId = doc.id;

    // Doc title and stats
    const infoDiv = document.createElement('div');
    infoDiv.className = 'flex-grow-1 overflow-hidden';
    infoDiv.innerHTML = `<span class="fw-bold text-truncate d-block">${title}</span>`;
    
    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-sm btn-outline-secondary ms-2 flex-shrink-0';
    copyBtn.textContent = 'Copy';
    copyBtn.tabIndex = 0;
    copyBtn.setAttribute('aria-label', `Copy content of ${title}`);
    
    li.appendChild(infoDiv);
    li.appendChild(copyBtn);
    docsList.appendChild(li);
  });
  newBtn.disabled = State.docs.length >= 20;
}

/**
 * Renders the content and state of the currently active document.
 */
function renderActiveDoc() {
  const doc = State.docs.find(d => d.id === State.appState.docId);
  if (!doc) {
    editor.value = '';
    editor.disabled = true;
    return;
  }
  editor.value = doc.content;
  editor.disabled = false;
  renderModeUI();
  updateTimerUI();
  startTimer();
}

/**
 * Updates UI elements based on the current mode (Write/Edit).
 * Toggles body class for theming and button states for lock enforcement.
 */
function renderModeUI() {
  const doc = State.docs.find(d => d.id === State.appState.docId);
  if (!doc) return;

  const isWrite = doc.mode === 'write';
  document.body.classList.toggle('write-mode', isWrite);
  document.body.classList.toggle('edit-mode', !isWrite);
  writeBtn.classList.toggle('active', isWrite);
  editBtn.classList.toggle('active', !isWrite);

  // Enforce 5-minute lock on the Edit button
  if (doc.lockActive) {
    editBtn.disabled = true;
    editBtn.title = 'Edit unlocks after 5 minutes';
  } else {
    editBtn.disabled = false;
    editBtn.title = '';
  }
}

// =============================================================================
// == 2. TIMER LOGIC
// =============================================================================

/**
 * Formats milliseconds into a mm:ss string.
 */
function formatMs(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Updates the timer display in the UI.
 * Colors timer green if lock has expired.
 */
function updateTimerUI() {
  const doc = State.docs.find(d => d.id === State.appState.docId);
  if (!doc || !timerSpan) return;

  timerSpan.textContent = formatMs(doc.remainingMs);
  timerSpan.style.color = doc.lockActive ? '' : 'green';
}

/**
 * Starts the master timer interval if the active doc is locked.
 */
function startTimer() {
  clearInterval(timerInterval);
  const doc = State.docs.find(d => d.id === State.appState.docId);
  if (!doc || !doc.lockActive) {
    updateTimerUI();
    return;
  }

  timerInterval = setInterval(() => {
    const currentDoc = State.docs.find(d => d.id === State.appState.docId);
    if (!currentDoc || !currentDoc.lockActive) {
      clearInterval(timerInterval);
      return;
    }

    const elapsed = Date.now() - currentDoc.writeLockStarted;
    currentDoc.remainingMs = Math.max(0, 300000 - elapsed);
    
    if (currentDoc.remainingMs === 0) {
      currentDoc.lockActive = false;
      clearInterval(timerInterval);
      renderModeUI();
    }
    
    State.saveDocs();
    updateTimerUI();
  }, 500);
}

// =============================================================================
// == 3. EVENT HANDLERS
// =============================================================================

/**
 * Handles all keydown events on the editor.
 * Blocks destructive keys in Write mode and shows a red flash.
 */
function handleEditorKeydown(e) {
  const doc = State.docs.find(d => d.id === State.appState.docId);
  if (doc && doc.mode === 'write' && ['Backspace', 'Delete'].includes(e.key)) {
    e.preventDefault();
    showRedFlash();
  }
}

/**
 * Handles the 'cut' event on the editor.
 */
function handleEditorCut(e) {
  const doc = State.docs.find(d => d.id === State.appState.docId);
  if (doc && doc.mode === 'write') {
    e.preventDefault();
    showRedFlash();
  }
}

/**
 * Handles the 'input' event, which fires on any content change.
 * Updates the doc content and title in the state.
 */
function handleEditorInput() {
  const doc = State.docs.find(d => d.id === State.appState.docId);
  if (!doc) return;

  doc.content = editor.value;
  const newTitle = State.extractTitle(doc.content);
  
  if (newTitle !== doc.title) {
    doc.title = newTitle;
    renderDocsList(); // Re-render sidebar if title changed
  }
  
  doc.updated = Date.now();
  State.saveDocs();
}

/**
 * Shows a full-viewport red flash for 150ms.
 */
function showRedFlash() {
  let flash = document.getElementById('red-flash-overlay');
  if (!flash) {
    flash = document.createElement('div');
    flash.id = 'red-flash-overlay';
    flash.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(255,0,0,0.7);z-index:9999;pointer-events:none;display:none;';
    document.body.appendChild(flash);
  }
  flash.style.display = 'block';
  setTimeout(() => { flash.style.display = 'none'; }, 150);
}

/**
 * Handles clicks within the sidebar, delegating to doc selection or copy.
 */
function handleSidebarClick(e) {
  const docItem = e.target.closest('li[data-doc-id]');
  const copyBtn = e.target.closest('button');

  if (copyBtn && docItem) {
    e.stopPropagation();
    const docId = docItem.dataset.docId;
    const doc = State.docs.find(d => d.id === docId);
    if (doc) {
      navigator.clipboard.writeText(doc.content).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1000);
      });
    }
    return;
  }

  if (docItem) {
    const docId = docItem.dataset.docId;
    if (docId !== State.appState.docId) {
      State.selectDoc(docId);
      renderActiveDoc();
      renderDocsList();
    }
  }
}

/**
 * Handles showing the edit confirmation modal.
 */
function handleShowEditModal() {
  const doc = State.docs.find(d => d.id === State.appState.docId);
  if (!doc || doc.lockActive || doc.mode === 'edit') return;

  const idx = Math.floor(Math.random() * editPhrases.length);
  currentEditPhrase = editPhrases[idx];
  editPhraseElem.textContent = currentEditPhrase;
  editPhraseInput.value = '';
  editConfirmBtn.disabled = true;

  const modal = new bootstrap.Modal(editModal);
  modal.show();
}

/**
 * Handles confirming the edit modal and switching to Edit mode.
 */
function handleConfirmEdit() {
  const doc = State.docs.find(d => d.id === State.appState.docId);
  if (doc) {
    doc.mode = 'edit';
    State.saveState();
    renderModeUI();
    const modal = bootstrap.Modal.getInstance(editModal);
    modal.hide();
  }
}

/**
 * Handles browser tab visibility changes to pause/resume the timer.
 * This ensures the 5-minute lock only counts down when the user can see the page.
 */
function handleVisibilityChange() {
  const doc = State.docs.find(d => d.id === State.appState.docId);
  if (!doc) return;

  // Tab is hidden: pause the timer
  if (document.hidden) {
    // We already save remainingMs continuously, so we just need to stop the interval
    clearInterval(timerInterval);
  } 
  // Tab is visible: resume the timer
  else {
    // Recalculate writeLockStarted to correctly resume from where it left off
    if (doc.lockActive) {
      const remaining = doc.remainingMs || 0;
      doc.writeLockStarted = Date.now() - (300000 - remaining);
      startTimer();
    }
  }
}

// =============================================================================
// == 4. APP INITIALIZATION
// =============================================================================

/**
 * Main app initializer.
 */
function init() {
  // Load state from localStorage
  State.loadState();
  
  // Auto-create first doc if none exist
  if (State.docs.length === 0) {
    State.createDoc();
  }
  
  // Attach all event listeners
  editor.addEventListener('keydown', handleEditorKeydown);
  editor.addEventListener('cut', handleEditorCut);
  editor.addEventListener('input', handleEditorInput);
  
  docsList.addEventListener('click', handleSidebarClick);
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  newBtn.addEventListener('click', () => {
    State.createDoc();
    renderDocsList();
    renderActiveDoc();
  });
  
  exportBtn.addEventListener('click', () => {
    const json = JSON.stringify(State.docs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `no-bullshit-writer-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
  
  writeBtn.addEventListener('click', () => {
    const doc = State.docs.find(d => d.id === State.appState.docId);
    if (doc && doc.mode !== 'write') {
      doc.mode = 'write';
      State.saveState();
      renderModeUI();
    }
  });

  editBtn.addEventListener('click', handleShowEditModal);
  editConfirmBtn.addEventListener('click', handleConfirmEdit);
  
  editPhraseInput.addEventListener('input', () => {
    editConfirmBtn.disabled = editPhraseInput.value !== currentEditPhrase;
  });

  // Initial render
  renderDocsList();
  renderActiveDoc();
}

// Start the app once the DOM is ready
document.addEventListener('DOMContentLoaded', init); 