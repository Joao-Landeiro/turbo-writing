// stateManager.js
// Handles all app state, persistence, and localStorage logic for No Bullshit Writer
// Follows the schema and requirements from PRD.Md

/**
 * Document schema (per PRD):
 * {
 *   id: string (uuid-v4),
 *   title: string (auto from first line),
 *   content: string,
 *   mode: 'write' | 'edit',
 *   lockActive: boolean,
 *   writeLockStarted: number (ms epoch),
 *   remainingMs: number,
 *   msWrite: number,
 *   msEdit: number,
 *   created: number,
 *   updated: number
 * }
 *
 * Global app state:
 * {
 *   docId: string, // active doc
 *   editModalOpen: boolean,
 *   editPhraseIndex: number
 * }
 */

// Namespaced localStorage keys
const DOCS_KEY = 'nbw_docs';
const APP_STATE_KEY = 'nbw_app_state';

// --- State ---
export let docs = [];
export let appState = {
  docId: null,
  editModalOpen: false,
  editPhraseIndex: 0
};

// --- Utility: UUID v4 generator (RFC4122, no external deps) ---
function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// --- Title extraction: first non-empty line, trimmed, max 24 chars + ellipsis ---
export function extractTitle(content) {
  if (!content) return 'Untitled';
  const firstLine = content.split('\n').find(line => line.trim().length > 0);
  if (!firstLine) return 'Untitled';
  const trimmed = firstLine.trim();
  return trimmed.length > 24 ? trimmed.slice(0, 24) + '…' : trimmed;
}

/**
 * Creates a new document object without any side effects (pure function).
 * @param {string} content The initial content of the document.
 * @returns {object} A new document object.
 */
export function createDoc(content = '') {
  const now = Date.now();
  return {
    id: uuidv4(),
    title: extractTitle(content) || 'Untitled',
    content: content,
    mode: 'write',
    lockActive: true,
    writeLockStarted: now,
    remainingMs: 300000, // 5 min in ms
    msWrite: 0,
    msEdit: 0,
    created: now,
    updated: now
  };
}

/**
 * Creates a new document, adds it to the state, and saves.
 * This is the impure version used by UI actions.
 * @param {string} content The initial content of the document.
 */
export function addNewDocument(content = '') {
  const newDoc = createDoc(content);
  docs.unshift(newDoc);
  appState.docId = newDoc.id;
  saveState();
}

// --- Select a document by ID ---
export function selectDoc(docId) {
  if (docs.find(doc => doc.id === docId)) {
    appState.docId = docId;
    saveState();
    return true;
  }
  return false;
}

/**
 * Deletes a document by its ID.
 * After deletion, it activates the next available document or creates a new one if none are left.
 * @param {string} docId The ID of the document to delete.
 */
export function deleteDoc(docId) {
  const docIndex = docs.findIndex(d => d.id === docId);
  if (docIndex === -1) return;

  docs.splice(docIndex, 1);

  // If the deleted doc was the active one, select a new one
  if (appState.docId === docId) {
    if (docs.length > 0) {
      // Activate the next doc in the list, or the previous one if it was the last
      const newIndex = Math.max(0, docIndex - 1);
      selectDoc(docs[newIndex].id);
    } else {
      // If no docs are left, create a new one
      addNewDocument();
    }
  }

  saveState();
}

/**
 * Saves ONLY the docs array to localStorage.
 * Used for frequent updates like typing or timer ticks, to avoid overwriting global app state.
 */
export function saveDocs() {
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
}

// --- Save all docs and app state to localStorage ---
export function saveState() {
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  localStorage.setItem(APP_STATE_KEY, JSON.stringify(appState));
}

// --- Load all docs and app state from localStorage ---
export function loadState() {
  const docsRaw = localStorage.getItem(DOCS_KEY);
  const appRaw = localStorage.getItem(APP_STATE_KEY);
  docs = docsRaw ? JSON.parse(docsRaw) : [];
  appState = appRaw ? JSON.parse(appRaw) : { docId: null, editModalOpen: false, editPhraseIndex: 0 };
}

// --- Simple test functions for manual validation ---
// Run these in the browser console for incremental testing
export function testSaveLoad() {
  console.log('Before save:', docs, appState);
  saveState();
  docs = [];
  appState = {};
  loadState();
  console.log('After load:', docs, appState);
}

export function testExtractTitle() {
  const samples = [
    '',
    '\n\n',
    '   ',
    'First line\nSecond line',
    'A very very very very very long first line that should be truncated',
    '   Title with spaces   ',
    'One\n\nTwo\nThree'
  ];
  samples.forEach(s => {
    console.log(`Input: "${s}" => Title: "${extractTitle(s)}"`);
  });
} 