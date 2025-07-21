// ui.js
// Handles all UI rendering and DOM event handling for No Bullshit Writer

import * as State from './stateManager.js';

// --- DOM Elements ---
const get = (id) => document.getElementById(id);
const editor = get('editor');
const sidebar = get('sidebar');
const docsList = get('docs-list');
const newBtn = get('new-doc-btn');
const exportBtn = get('export-txt-btn');
const writeBtn = get('write-mode-btn');
const editBtn = get('edit-mode-btn');
const editModal = get('edit-modal');
const editPhraseElem = get('edit-phrase');
const editPhraseInput = get('edit-phrase-input');
const editConfirmBtn = get('edit-confirm-btn');
const timerSpan = get('timer');
const timerLabel = get('timer-label');
const deleteBtn = get('delete-doc-btn');

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
 * Master render function. Updates the entire UI based on the current state.
 * This is the single entry point for all UI updates.
 */
function render() {
  renderDocsList();
  renderActiveDoc();
}

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
  // Hide the "+ New" button if the document limit is reached
  newBtn.classList.toggle('d-none', State.docs.length >= 3);
}

/**
 * Renders the content and state of the currently active document.
 * This includes updating the editor, mode buttons, timer, and starting the timer logic.
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
  timerLabel.style.display = doc.lockActive ? 'inline' : 'none';

  // Update the progress bar on the Edit button
  if (doc.lockActive) {
    const progress = (300000 - doc.remainingMs) / 300000 * 100;
    editBtn.style.setProperty('--progress', `${progress}%`);
  } else {
    // When unlocked, ensure it's fully green
    editBtn.style.setProperty('--progress', `100%`);
  }
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
    
    const message = document.createElement('span');
    message.textContent = 'Not in Edit Mode';
    flash.appendChild(message);
    
    document.body.appendChild(flash);
  }
  flash.style.display = 'flex'; // Use flex to enable centering
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
      render(); // Use the master render function
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
      // CRITICAL FIX: Save the updated state immediately after adjusting the start time.
      // This prevents a race condition on page reload after tab visibility changes.
      State.saveDocs();
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
  const TUTORIAL_TEXT = `How to use this

This is a simple space to help you write without distraction. It works in two modes: Writing and Editing.
Right now, you are in **Writing Mode**.
Your only job is to get your ideas down. 
You cannot delete, backspace, or cut text. 
Go ahead, try to delete this sentence. (See the red flash? That means it's working.)
Notice the timer below? It's counting down for 5 minutes. After it runs out, the "Edit" button will become available. This is your dedicated time to just write.
Once you can edit, you can fix typos, move paragraphs, and shape your text.
But for now... just write.
Create your own document by clicking "+ New" in the sidebar, or simply delete this text (once you're in Edit mode) and start fresh.`;

  // --- 1. Setup State ---
  State.loadState();
  
  if (State.docs.length === 0) {
    // On first ever load, create the 3 initial documents in memory
    const tutorialDoc = State.createDoc(TUTORIAL_TEXT);
    const blankDoc1 = State.createDoc();
    const blankDoc2 = State.createDoc();
    
    // Manually construct the state and save it exactly once
    // Use unshift to place the tutorial doc at the top of the list.
    State.docs.unshift(blankDoc2);
    State.docs.unshift(blankDoc1);
    State.docs.unshift(tutorialDoc);

    State.appState.docId = tutorialDoc.id; // Make the tutorial document active
    State.saveState();
  } else {
    // If docs already exist, ensure one is active (for robustness)
    if (!State.appState.docId || !State.docs.find(d => d.id === State.appState.docId)) {
      State.selectDoc(State.docs[0].id);
    }
  }
  
  // --- 2. Setup UI and Event Listeners ---
  editor.addEventListener('keydown', handleEditorKeydown);
  editor.addEventListener('cut', handleEditorCut);
  editor.addEventListener('input', handleEditorInput);
  
  docsList.addEventListener('click', handleSidebarClick);
  
  newBtn.addEventListener('click', () => {
    // A guard to prevent creating more docs than the limit, in case the button is not hidden
    if (State.docs.length >= 3) return;
    State.addNewDocument();
    render(); // Use the master render function
  });
  
  deleteBtn.addEventListener('click', () => {
    const doc = State.docs.find(d => d.id === State.appState.docId);
    if (!doc) return;

    // Use a confirmation prompt before deleting
    if (window.confirm(`Are you sure you want to delete the document "${doc.title || 'Untitled'}"? This cannot be undone.`)) {
      State.deleteDoc(doc.id);
      render(); // Use the master render function
    }
  });

  exportBtn.addEventListener('click', () => {
    let exportContent = `Turbo Writer Export\nDate: ${new Date().toLocaleString()}\n\n`;

    State.docs.forEach(doc => {
      const createdDate = new Date(doc.created).toLocaleString();
      exportContent += `==================================================\n`;
      exportContent += `Title: ${doc.title || 'Untitled'}\n`;
      exportContent += `Created: ${createdDate}\n`;
      exportContent += `==================================================\n\n`;
      exportContent += `${doc.content}\n\n\n`;
    });

    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `turbo-writer-export-${new Date().toISOString().slice(0,10)}.txt`;
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

  // --- 3. Initial Render ---
  render();
}

// Start the app once the DOM is ready
document.addEventListener('DOMContentLoaded', init); 