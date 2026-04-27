# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Flipper Training System** — an HTML5-based visual accommodation training tool for pediatric myopia prevention. It simulates flipper lens (+D/−D alternating) exercises entirely in the browser, replacing paper-based training cards.

Pure frontend, no backend. Deploys as static files.

## Repo Structure

```
flipper-eyeglasses/
├── index.html          # Single-page entry point
├── css/
│   ├── style.css       # Layout & component styles
│   └── theme.css       # Color tokens, CSS variables
├── js/
│   ├── app.js          # Bootstrap, state management, routing
│   ├── trainer.js      # Training loop engine (core)
│   ├── stimulus.js     # Stimulus generator (E-letter / letter / digit / dot grid)
│   ├── flipper.js      # Flipper lens state machine (+D ↔ −D alternating)
│   ├── timer.js        # Countdown timer, flip interval scheduler
│   ├── scorer.js       # Scoring, accuracy, reaction time tracking
│   ├── storage.js      # LocalStorage CRUD for training history
│   ├── config.js       # Parameter defaults & user overrides
│   ├── keyboard.js     # Keyboard shortcut mapping
│   ├── report.js       # Post-training report generation
│   ── chart.js        # Canvas-based trend chart rendering
├── assets/             # Icons, images
├── docs/
│   └── requirements.md # Product requirements (source of truth for features)
└── demo/               # Reference screenshots of existing systems
```

## Development Workflow

There is no build step. Edit files directly and serve with any static server:

```bash
# Quick local dev
python -m http.server 8080   # or: npx serve .
```

Open `http://localhost:8080` in the browser. No compilation or bundling required.

## Architecture Notes

### State Flow

```
app.js (init) → config.js (load defaults) → trainer.js (start loop)
                                            ↓
                        flipper.js ← timer.js ← keyboard.js
                                            ↓
                        stimulus.js → scorer.js → storage.js
                                            ↓
                        report.js (on finish)
```

### Key Design Decisions

- **No framework** — Vanilla JS for minimal latency during stimulus switching (≤50ms target).
- **State machine** — The training engine cycles through `IDLE → TRAINING → PAUSED → FINISHED`. The flipper lens alternates between +D and −D at a configurable interval.
- **LocalStorage only** — Training records persist across sessions without a backend.
- **Responsive** — Target resolutions: 1920×1080, 1366×768, tablet portrait.

### Reference

The `demo/` directory contains screenshots of an existing web-based training system used as a visual reference for layout and UX.

The `docs/requirements.md` is the authoritative source for feature specifications, scoring rules, keyboard shortcuts, and acceptance criteria.
