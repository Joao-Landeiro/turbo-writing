# Turbo Writer

A distraction-free browser-based writing pad with enforced Write/Edit modes. 100% client-side, modular, and built with vanilla JS/HTML/CSS. See PRD.Md for requirements.

## Main Changes, Logic, and Process

- **Modular structure:**
  - `index.html`: Main HTML, Bootstrap 5.3 via CDN, modal, sidebar, and main area.
  - `app.js`: Entrypoint, imports all modules.
  - `stateManager.js`: Handles all app state, persistence, and localStorage logic.
  - `ui.js`: UI rendering, DOM events, Write/Edit logic, CRUD, export, and accessibility.
  - `style.css`: Responsive layout, mode themes, focus outlines, and accessibility styles.
- **Key features:**
  - Write/Edit toggle with enforced Write mode (blocks destructive keys, red flash overlay)
  - Edit mode requires confirmation modal with random phrase
  - Multiple documents (up to 20), live-updating sidebar titles, Copy to clipboard
  - All state persisted in localStorage (docs, active doc, mode, modal state)
  - Export all docs as JSON for backup/sharing
  - Fully responsive and accessible (keyboard, ARIA, focus outlines)

## Local Development

1. **Serve over HTTP** (required for ES modules):
   - `npx serve .` or use VS Code Live Server
2. Open `http://localhost:PORT/` in your browser

## Deployment (GitHub Pages)

- Push all files to the root of your `main` branch
- Enable GitHub Pages in repo settings (root directory)
- App will be live at your GitHub Pages URL

## Accessibility & Responsive Design

- Keyboard navigation and visible focus outlines for all controls
- ARIA labels and visually hidden classes for assistive tech
- Sidebar collapses and stacks on mobile (≤720px)
- Write/Edit mode themes for clarity and contrast

## PRD Milestone Checklist

- [x] Skeleton UI (sidebar, main area, modal)
- [x] State management (docs, app state, localStorage)
- [x] Write mode core logic (block destructive keys, red flash)
- [x] Edit mode flow (confirmation modal, mode switching)
- [x] Docs CRUD (sidebar, new, select, copy)
- [x] Persistence & restore (all state, modal, active doc)
- [x] Export JSON (all docs)
- [x] Responsive & accessibility QA
- [x] GitHub Pages ready

---

*For full requirements and rationale, see PRD.Md.* 