# Product Requirements Document (PRD) – *No Bullshit Writer* (v1.2)

> **This version (v1.2) reflects your post‑implementation decisions (July 16, 2025):**
>
> 1. Accept all v1.1 new items (per‑doc state, auto‑first‑doc, dynamic titles, global flash, etc.).
> 2. **When 5‑min lock expires, doc stays in Write; Edit merely unlocks.**
> 3. **Switching from Edit back to Write does *****not***** restart the 5‑min lock.**
> 4. Totals per doc (msWrite/msEdit) are sufficient; no session history.
> 5. Add **minimal JSON export** (all docs) to support backup/sharing.
>
> Implementation learnings from the Cursor session remain cited inline. Opening via `file://` produced ES‑module CORS errors → serving over HTTP is mandatory. fileciteturn1file0 Per‑doc timing, auto‑new doc, and title‑from‑first‑line arose directly from that session. fileciteturn1file1 Intense global red flash + continuous title sync captured from your feedback. fileciteturn1file15

---

## 0. Meta

| Item               | Value                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Document Owner** | \<your name / GitHub handle>                                                                               |
| **Last Updated**   | 2025‑07‑16                                                                                                 |
| **Version**        | 1.2                                                                                                        |
| **Repository**     | [https://github.com/Joao-Landeiro/no-bullshit-writer](https://github.com/Joao-Landeiro/no-bullshit-writer) |
| **Live URL**       | [https://joao-landeiro.github.io/no-bullshit-writer/](https://joao-landeiro.github.io/no-bullshit-writer/) |

> **Progress notation:** GitHub‑style checkboxes (`- [ ]` / `- [x]`). Update inline or via PR descriptions that reference the PRD ref IDs.

---

## 1. Product Overview

### 1.1 Vision

A distraction‑free browser‑based writing pad with two enforced modes—**Write** (no destructive editing) and **Edit** (full control)—to encourage uninterrupted drafting and intentional revision. 100% client‑side; all data resides in the browser using `localStorage` (no backend).

### 1.2 Goals / Success Metrics

| Metric                                               | Target           |
| ---------------------------------------------------- | ---------------- |
| User can draft for 5 min without accidental deletion | 100% of sessions |
| Avg time to unlock Edit (after 5‑min lock)           | ≤ 10 s           |
| Docs persist across tab closures & refresh           | 100%             |
| Lighthouse performance score (mobile)                | ≥ 90             |

### 1.3 Personas & Use‑cases

* **Focused Writer** – wants to commit to words fast; no self‑editing impulses.
* **Student / Exam Practice** – timed writing drills; structured revision after lock.

---

## 2. Functional Requirements

**Legend:** *New/Changed in v1.1* marked **(NEW)** or **(CHG)**; *New/Changed in v1.2* marked **(v1.2)**.

| Ref                  | Requirement                     | Acceptance Criteria                                                                                                                                                                                                                                                                                                |
| -------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **FR‑01**            | Write/Edit toggle               | Toggle visible above/below editor (responsive rules); default = Write mode when a new doc is created.                                                                                                                                                                                                              |
| **FR‑02**            | Write mode constraints          | Backspace/Delete/Cut blocked; app flashes global red overlay for \~150ms; no text removed. Intensity rgba(255,0,0,0.7). fileciteturn1file15                                                                                                                                                                     |
| **FR‑03 (CHG v1.2)** | **Initial 5‑minute Write lock** | On **first creation** of a document the app enters Write & starts a single 5:00 lock. During lock, Edit disabled; timer visible mm\:ss. After lock expires, Edit becomes available but doc remains in Write until user switches. Subsequent Edit→Write toggles **do not restart** the lock. (Decision 2025‑07‑16.) |
| **FR‑04**            | Edit confirmation               | Clicking Edit (when available) opens modal w/ randomly rotated phrase (8 options); user must type phrase exactly (case‑sensitive) to proceed; modal cannot be dismissed ESC/outside. fileciteturn1file14                                                                                                        |
| **FR‑05 (CHG)**      | Persistence                     | Docs array, per‑doc mode, lock status (remainingMs), msWrite, msEdit persist in `localStorage`; refresh resumes exactly. Per‑doc update from implementation. fileciteturn1file1                                                                                                                                 |
| **FR‑06 (CHG v1.2)** | Multiple documents + copy       | Sidebar lists up to 20 docs; disabled "+ New" at limit; selecting doc loads it; each doc row has a **Copy** control that copies full content to clipboard. (Original copy/paste requirement.)                                                                                                                      |
| **FR‑07**            | Timer pause on hidden tab       | When `document.hidden === true` pause countdown; resume when visible.                                                                                                                                                                                                                                              |
| **FR‑08**            | Responsive layout               | Works on phones ≥ 360 px width; sidebar collapses stacked; Bootstrap grid.                                                                                                                                                                                                                                         |
| **FR‑09 (NEW)**      | Auto‑create first doc           | On first load (no stored docs) create & open a new blank doc automatically. fileciteturn1file1                                                                                                                                                                                                                  |
| **FR‑10 (NEW)**      | Dynamic doc title               | Sidebar title = first non‑empty line of doc (trimmed); >24 chars truncated w/ ellipsis; updates live as user types. fileciteturn1file1                                                                                                                                                                          |
| **FR‑11 (NEW)**      | Continuous title sync           | All sidebar doc titles refresh whenever any doc’s first line changes (not only active doc). fileciteturn1file15                                                                                                                                                                                                 |
| **FR‑12 (NEW)**      | Global red flash                | Red flash covers full viewport incl. sidebar & modal chrome; triggers on blocked destructive action in Write mode. fileciteturn1file15                                                                                                                                                                          |
| **FR‑13 (v1.2)**     | **Export JSON**                 | Provide UI action (sidebar footer) to download a JSON file containing all stored docs (array of per‑doc objects as stored). No import required in v1.2; copy suffices for backup/share.                                                                                                                            |

---

## 3. Non‑Functional Requirements

| Category            | Requirement                                                                                                                                                            | Notes |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **Performance**     | FCP ≤ 2s on low‑end mobile; bundle <250KB gz total (CDN libs excluded).                                                                                                |       |
| **Accessibility**   | WCAG 2.1 AA; keyboard navigable; visible focus outlines; ARIA labels sidebar docs; modal focus trap.                                                                   |       |
| **Security**        | No eval of user content; no external network I/O beyond CDNs.                                                                                                          |       |
| **Maintainability** | Clear module boundaries; single entrypoint `app.js`; total custom JS ≤ 600LoC; JSDoc comments.                                                                         |       |
| **Environment**     | **Must be served over **`** / **`** (local dev server)**; opening via `file://` breaks ES‑module imports (CORS error observed in build session). fileciteturn1file0 |       |

---

## 4. UX Specifications

### 4.1 Layout (Desktop ≥ 720px)

```
┌─ Sidebar (20%) ─┐┌─ Main Area (80%) ──────────────────────────────┐
│ + New           ││ ╔════════════════════════════════════════════╗ │
│ Doc A 12 m      ││ ║               <textarea>                   ║ │
│ Doc B  5 m      ││ ╚════════════════════════════════════════════╝ │
└─────────────────┘│  [Write|Edit toggle]  [Timer 04:12]          │
                  └────────────────────────────────────────────────┘
```

### 4.2 Themes

* **Write mode:** light (Bootstrap default body bg #fff; text #212529).
* **Edit mode:** modified dark (body #222; text #e0e0e0; inputs #333; active Edit btn = Bootstrap `btn-success`).
* Body class `write-mode` / `edit-mode` toggled to apply theme; required for consistency (implementation gap noted). fileciteturn1file14

### 4.3 Timer UI

* Numeric mm\:ss + optional circular progress ring (CSS conic‑gradient).
* Green when Edit available (>=5:00 elapsed) but *not auto‑switched* (per v1.2 decision).

### 4.4 Edit Confirmation Modal

* Uses Bootstrap modal; static backdrop & keyboard=false; phrase displayed bold; input field; disabled Confirm until match. fileciteturn1file14
* Keyboard trap between input & Confirm. fileciteturn1file14

### 4.5 Global Red Flash Interaction

* On blocked destructive action (Backspace/Delete/Cut) in Write mode, show full‑viewport overlay `rgba(255,0,0,0.7)` for \~150ms. fileciteturn1file15

### 4.6 JSON Export UX (v1.2)

* Sidebar footer button: `Export JSON`.
* Clicking triggers creation of downloadable Blob (`no-bullshit-writer-export-YYYYMMDD.json`).
* Includes full docs array; safe user backup.

---

## 5. Technical Architecture

| Layer            | Tech                                                                                                                                                              | Notes           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **UI**           | HTML5 + Bootstrap 5.3 (CSS CDN)                                                                                                                                   | Minimal markup. |
| **Bootstrap JS** | Include Bootstrap **bundle** (w/ Popper) for modal support; required for FR‑04. Missing bundle caused modal fragility risk in early build. fileciteturn1file14 |                 |
| **Logic**        | Vanilla JS ES modules (`app.js`, `stateManager.js`, `ui.js`).                                                                                                     |                 |
| **State**        | `localStorage` w/ namespaced keys.                                                                                                                                |                 |
| **Serving**      | Any static HTTP server (Python `http.server`, `npx serve`, VS Code Live Server, etc.) to avoid `file://` CORS & module import failures. fileciteturn1file0     |                 |
| **Deploy**       | GitHub Pages (main branch / root).                                                                                                                                |                 |

### 5.1 Data Schema (v1.2)

**Per Document**

```jsonc
{
  "id": "uuid-v4",
  "title": "Doc 1",              // auto from first line
  "content": "...",               // full text
  "mode": "write",                // current mode for this doc
  "lockActive": true,              // true only during initial 5-min window
  "writeLockStarted": 1721150000000, // ms epoch when initial Write lock began
  "remainingMs": 123456,           // remaining in 5-min lock (if lockActive)
  "msWrite": 345000,               // cumulative write time
  "msEdit": 12000,                 // cumulative edit time
  "created": 1721150000000,
  "updated": 1721150100000
}
```

**Global App State**

```jsonc
{
  "docId": "uuid-v4",           // active doc
  "editModalOpen": false,        // if true restore modal
  "editPhraseIndex": 3           // which phrase was shown
}
```

(Per‑doc timing & modal persistence from implementation learnings. fileciteturn1file1)

### 5.2 Timer Algorithm (Per‑Doc) (v1.2)

1. On **doc creation** (or explicit reset function ‑ future), enter Write, set `lockActive=true`, `writeLockStarted=now`, `remainingMs=300000`.
2. Interval (500ms) updates `remainingMs = max(0, end - now)` while tab visible.
3. Pause interval if `document.hidden`; save remaining. Resume on visible. |
4. When `remainingMs===0`, set `lockActive=false`; UI indicates Edit available (timer green); doc stays in Write until user confirms Edit.
5. If user later returns from Edit→Write, **do not restart** lock; `lockActive=false` remains (per v1.2 decision).

### 5.3 Key‑press Blocking

```js
if (activeDoc.mode === 'write') {
  if (['Backspace','Delete'].includes(e.key)) block();
}
```

Because Write mode remains non‑destructive even after lock expiry. Also intercept `cut` & `beforeinput`. Global flash. fileciteturn1file15

---

## 6. Local Development Setup (Updated)

> Serving over HTTP is **required** due to ES‑module restrictions under `file://`; attempting to open the file directly produced a CORS failure during build. fileciteturn1file0

Choose one:

**A. Python**

```bash
python3 -m http.server 8000
```

**B. Node**

```bash
npx serve .
# or
npx http-server .
```

**C. VS Code Live Server** GUI start. fileciteturn1file0

Clone & run:

```bash
git clone https://github.com/Joao-Landeiro/no-bullshit-writer.git
cd no-bullshit-writer
python3 -m http.server 8000
```

---

## 7. Implementation Roadmap & Progress Tracker

> Tick boxes as you complete tasks. Sub‑tasks nest under each milestone.

### M0 – Repo & Tooling

*

### M1 – Skeleton UI

*

### M2 – State Management

*

### M3 – Write Mode Core Logic

*

### M4 – Edit Mode Flow

*

### M5 – Docs CRUD

*

### M6 – Persistence & Restore

*

### M7 – Export

*

### M8 – Responsive & Accessibility QA

*

### M9 – GitHub Pages Release

*

---

## 8. Testing & QA

| Layer       | Test                                | Method                                                                                           |
| ----------- | ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| Unit        | StateManager save/load              | Manual console or Jest headless DOM.                                                             |
| Unit        | Title extraction util               | Input multiline strings → expected titles.                                                       |
| Unit        | Export JSON                         | Download & parse file; ensure all docs present.                                                  |
| Integration | Initial 5‑min lock one‑time only    | Create doc → wait unlock → Edit → back to Write → confirm no new lock (timer shows unlocked).    |
| Integration | Per‑doc timer pause/resume & unlock | Simulated visibilitychange; manual fast‑forward by editing duration const. fileciteturn1file1 |
| Integration | Edit modal restore after reload     | Force `editModalOpen=true` state & reload. fileciteturn1file4                                 |
| Manual      | Global red flash on blocked key     | Try Backspace in Write; expect full‑page flash. fileciteturn1file15                           |

---

## 9. Deployment Pipeline

Minimal GitHub Pages (no build): enable in repo settings. Optional CI to re‑publish on push (peaceiris action). (See prior YAML; unchanged.)

---

## 10. Future / Stretch

* **Import JSON** (restore saved export; merge vs replace?).
* Adjustable write‑lock duration (user pref?).
* Stats dashboard across docs (total write vs edit time).
* Offline backup (.txt per doc zip download).

---

## 11. Glossary

| Term               | Definition                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| *Write Mode*       | Drafting phase where destructive keys are blocked; initial doc creation starts a one‑time 5‑min lock before Edit allowed. |
| *Edit Available*   | State when initial 5‑min lock expires; user may switch to Edit.                                                           |
| *Edit Mode*        | Full editing abilities.                                                                                                   |
| *msWrite / msEdit* | Cumulative milliseconds spent actively in each mode for a doc.                                                            |
| *lockActive*       | Boolean; true only while initial 5‑min lock is counting down.                                                             |

---

*End PRD v1.2*
