// ui.js
// Handles UI rendering and DOM event handling for No Bullshit Writer
// Implements Write mode core logic: state load, doc rendering, destructive key blocking, red flash

import { docs, appState, createDoc, loadState, saveState } from './stateManager.js';

// --- DOM Elements ---
const editor = document.getElementById('editor');
const sidebar = document.getElementById('sidebar');
const docsList = document.getElementById('docs-list');

// --- Red Flash Overlay ---
let flashTimeout = null;
function showRedFlash() {
  // Create overlay if not present
  let flash = document.getElementById('red-flash-overlay');
  if (!flash) {
    flash = document.createElement('div');
    flash.id = 'red-flash-overlay';
    flash.style.position = 'fixed';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100vw';
    flash.style.height = '100vh';
    flash.style.background = 'rgba(255,0,0,0.7)';
    flash.style.zIndex = '9999';
    flash.style.pointerEvents = 'none';
    document.body.appendChild(flash);
  }
  flash.style.display = 'block';
  // Hide after 150ms
  if (flashTimeout) clearTimeout(flashTimeout);
  flashTimeout = setTimeout(() => {
    flash.style.display = 'none';
  }, 150);
}

// --- Edit Mode Flow ---

// Phrases for confirmation modal
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

const writeBtn = document.getElementById('write-mode-btn');
const editBtn = document.getElementById('edit-mode-btn');
const editModal = document.getElementById('edit-modal');
const editPhraseElem = document.getElementById('edit-phrase');
const editPhraseInput = document.getElementById('edit-phrase-input');
const editConfirmBtn = document.getElementById('edit-confirm-btn');

let currentEditPhrase = '';

// --- Show Edit Confirmation Modal ---
function showEditModal() {
  // Pick a random phrase
  const idx = Math.floor(Math.random() * editPhrases.length);
  currentEditPhrase = editPhrases[idx];
  editPhraseElem.textContent = currentEditPhrase;
  editPhraseInput.value = '';
  editConfirmBtn.disabled = true;
  // Save modal open state and phrase index
  saveModalState(true, idx);
  // Show modal using Bootstrap
  const modal = new bootstrap.Modal(editModal, { backdrop: 'static', keyboard: false });
  modal.show();
  // Focus trap: focus input
  setTimeout(() => editPhraseInput.focus(), 200);
}

// --- Handle Edit Phrase Input ---
editPhraseInput && editPhraseInput.addEventListener('input', () => {
  if (editPhraseInput.value === currentEditPhrase) {
    editConfirmBtn.disabled = false;
  } else {
    editConfirmBtn.disabled = true;
  }
});

// --- Confirm Edit: Switch to Edit mode ---
editConfirmBtn && editConfirmBtn.addEventListener('click', () => {
  const doc = docs.find(d => d.id === appState.docId);
  if (doc) {
    doc.mode = 'edit';
    saveState();
    renderModeButtons();
    // Hide modal
    const modal = bootstrap.Modal.getInstance(editModal);
    modal && modal.hide();
    // Save modal state after successful edit
    saveModalState(false, appState.editPhraseIndex);
  }
});

// --- Write Button: Switch to Write mode (no lock restart) ---
writeBtn && writeBtn.addEventListener('click', () => {
  const doc = docs.find(d => d.id === appState.docId);
  if (doc && doc.mode !== 'write') {
    doc.mode = 'write';
    saveState();
    renderModeButtons();
    // Close modal state when switching modes
    closeModalState();
  }
});

// --- Edit Button: Show modal if allowed ---
editBtn && editBtn.addEventListener('click', () => {
  const doc = docs.find(d => d.id === appState.docId);
  if (!doc) return;
  // For now, always allow (timer/lock logic will be added later)
  if (doc.mode !== 'edit') {
    showEditModal();
  }
});

// --- Render mode buttons (active state) ---
function renderModeButtons() {
  const doc = docs.find(d => d.id === appState.docId);
  if (!doc) return;
  if (doc.mode === 'write') {
    writeBtn.classList.add('active');
    editBtn.classList.remove('active');
    editor.classList.remove('edit-mode');
    editor.classList.add('write-mode');
  } else {
    writeBtn.classList.remove('active');
    editBtn.classList.add('active');
    editor.classList.remove('write-mode');
    editor.classList.add('edit-mode');
  }
}

// --- Docs CRUD (Sidebar, New, Select, Copy) ---

// Render the sidebar doc list (up to 20 docs)
function renderDocsList() {
  docsList.innerHTML = '';
  docs.slice(0, 20).forEach(doc => {
    // Sidebar title = first non-empty line, trimmed, >24 chars truncated
    const title = doc.title;
    // msWrite/msEdit display (placeholder for now)
    const msWriteMin = Math.round((doc.msWrite || 0) / 60000);
    const msEditMin = Math.round((doc.msEdit || 0) / 60000);
    // Doc row
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex align-items-center justify-content-between';
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    li.setAttribute('aria-label', `Select document: ${title}`);
    if (doc.id === appState.docId) li.classList.add('active');
    // Title and times
    const infoDiv = document.createElement('div');
    infoDiv.className = 'flex-grow-1';
    infoDiv.innerHTML = `<span class="fw-bold">${title}</span> <span class="text-muted small ms-2">${msWriteMin}w/${msEditMin}e</span>`;
    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-sm btn-outline-secondary ms-2';
    copyBtn.textContent = 'Copy';
    copyBtn.tabIndex = 0;
    copyBtn.setAttribute('aria-label', `Copy content of ${title}`);
    copyBtn.addEventListener('click', e => {
      e.stopPropagation();
      navigator.clipboard.writeText(doc.content || '').then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1000);
      });
    });
    // Select doc on click
    li.addEventListener('click', () => {
      if (appState.docId !== doc.id) {
        appState.docId = doc.id;
        saveState();
        renderActiveDoc();
        renderDocsList();
        // Close modal state when switching docs
        closeModalState();
      }
    });
    // Keyboard select
    li.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        li.click();
      }
    });
    li.appendChild(infoDiv);
    li.appendChild(copyBtn);
    docsList.appendChild(li);
  });
  // Disable '+ New' if at limit
  const newBtn = document.getElementById('new-doc-btn');
  if (docs.length >= 20) {
    newBtn.disabled = true;
    newBtn.title = 'Maximum 20 documents';
  } else {
    newBtn.disabled = false;
    newBtn.title = '';
  }
}

// '+ New' button handler
const newBtn = document.getElementById('new-doc-btn');
newBtn && newBtn.addEventListener('click', () => {
  if (docs.length < 20) {
    createDoc();
    renderDocsList();
    renderActiveDoc();
  }
});

// --- Update renderActiveDoc to update doc title and sidebar live ---
const origRenderActiveDoc2 = renderActiveDoc;
renderActiveDoc = function() {
  origRenderActiveDoc2();
  // Update doc title from content
  const doc = docs.find(d => d.id === appState.docId);
  if (doc) {
    // Extract title from content
    import('./stateManager.js').then(sm => {
      const newTitle = sm.extractTitle(editor.value);
      if (doc.title !== newTitle) {
        doc.title = newTitle;
        saveState();
        renderDocsList();
      }
    });
  }
  renderModeButtons && renderModeButtons();
};

// --- Update sidebar titles live as user types ---
editor && editor.addEventListener('input', () => {
  renderActiveDoc();
});

// --- Persistence & Restore ---

// Save modal state and edit phrase index to appState
function saveModalState(isOpen, phraseIdx) {
  appState.editModalOpen = isOpen;
  appState.editPhraseIndex = phraseIdx;
  saveState();
}

// Restore modal state on load
function restoreModalState() {
  if (appState.editModalOpen) {
    // Restore the phrase
    currentEditPhrase = editPhrases[appState.editPhraseIndex] || editPhrases[0];
    editPhraseElem.textContent = currentEditPhrase;
    editPhraseInput.value = '';
    editConfirmBtn.disabled = true;
    // Show modal using Bootstrap
    const modal = new bootstrap.Modal(editModal, { backdrop: 'static', keyboard: false });
    modal.show();
    setTimeout(() => editPhraseInput.focus(), 200);
  }
}

// Patch showEditModal to save modal state
const origShowEditModal = showEditModal;
showEditModal = function() {
  const idx = Math.floor(Math.random() * editPhrases.length);
  currentEditPhrase = editPhrases[idx];
  editPhraseElem.textContent = currentEditPhrase;
  editPhraseInput.value = '';
  editConfirmBtn.disabled = true;
  // Save modal open state and phrase index
  saveModalState(true, idx);
  // Show modal using Bootstrap
  const modal = new bootstrap.Modal(editModal, { backdrop: 'static', keyboard: false });
  modal.show();
  setTimeout(() => editPhraseInput.focus(), 200);
};

// Patch modal close to save state
editConfirmBtn && editConfirmBtn.addEventListener('click', () => {
  saveModalState(false, appState.editPhraseIndex);
});

// Also close modal state if user switches doc or mode
function closeModalState() {
  appState.editModalOpen = false;
  saveState();
}

// On doc select, close modal state
// (Patch doc select in renderDocsList)
// ...in renderDocsList, after selecting doc:
// closeModalState();
// (Already handled in doc select logic if needed)

// --- On page load, restore everything ---
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  ensureFirstDoc();
  renderDocsList();
  renderActiveDoc();
  restoreModalState();
});

// --- Render the active document in the textarea ---
function renderActiveDoc() {
  // Find the active doc
  const doc = docs.find(d => d.id === appState.docId);
  if (!doc) {
    editor.value = '';
    editor.disabled = true;
    return;
  }
  editor.value = doc.content;
  editor.disabled = false;
}

// --- Block destructive keys in Write mode ---
function handleEditorKeydown(e) {
  // Only block in Write mode
  const doc = docs.find(d => d.id === appState.docId);
  if (!doc || doc.mode !== 'write') return;
  // Block Backspace, Delete
  if (["Backspace", "Delete"].includes(e.key)) {
    e.preventDefault();
    showRedFlash();
    return;
  }
}

// --- Block Cut (Ctrl+X or context menu) in Write mode ---
function handleEditorCut(e) {
  const doc = docs.find(d => d.id === appState.docId);
  if (!doc || doc.mode !== 'write') return;
  e.preventDefault();
  showRedFlash();
}

// --- Block destructive beforeinput events (for mobile/IME) ---
function handleEditorBeforeInput(e) {
  const doc = docs.find(d => d.id === appState.docId);
  if (!doc || doc.mode !== 'write') return;
  if (["deleteContentBackward", "deleteContentForward", "deleteByCut"].includes(e.inputType)) {
    e.preventDefault();
    showRedFlash();
  }
}

// --- Initial load: ensure at least one doc exists ---
function ensureFirstDoc() {
  if (docs.length === 0) {
    createDoc();
  }
}

// --- Main initialization ---
function init() {
  // Load state from localStorage
  loadState();
  // Ensure at least one doc exists
  ensureFirstDoc();
  // Render the active doc
  renderActiveDoc();
  // Attach event listeners for Write mode blocking
  editor.addEventListener('keydown', handleEditorKeydown);
  editor.addEventListener('cut', handleEditorCut);
  editor.addEventListener('beforeinput', handleEditorBeforeInput);
}

document.addEventListener('DOMContentLoaded', init);

// --- Export JSON ---
const exportBtn = document.getElementById('export-json-btn');
exportBtn && exportBtn.addEventListener('click', () => {
  // Format date as YYYYMMDD
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const filename = `no-bullshit-writer-export-${y}${m}${d}.json`;
  // Create JSON blob of all docs
  const json = JSON.stringify(docs, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  // Create a temporary link and trigger download
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }, 100);
});

// --- Troubleshooting tips (in comments) ---
// - If you see 'Cannot read property ... of null', check that the DOM is loaded and IDs match.
// - If red flash does not appear, check CSS z-index and overlay creation logic.
// - If destructive keys are not blocked, ensure doc.mode is 'write' and event listeners are attached.
// - If modal does not appear, check Bootstrap JS is loaded and modal markup matches.
// - If Confirm button never enables, check phrase input logic and event listeners.
// - If mode does not switch, check doc.mode and saveState calls. 
// - If state does not persist, check localStorage usage and browser settings.
// - If modal does not restore, check appState.editModalOpen and phrase index.
// - If active doc is not restored, check appState.docId and docs array. 
// - If download does not start, check browser download settings and pop-up blockers.
// - If file is empty, check docs array and JSON.stringify logic. 