# TasteMate AI

> Agentic demo: five-agent pipeline delivering restaurant/dish recommendations, plus an MCP-backed assistant (Nora).

## Overview

TasteMate AI demonstrates an agentic organisation with exactly five AI agents working in a sequential pipeline:

- Researcher: Maya
- Designer: Lina
- Maker: Alex
- Communicator: Sam
- Manager: Daniel

The frontend is a magazine-style demo site that triggers the pipeline (via a chat assistant or CTA) and displays agent briefs and customer-facing recommendations.

## Repo layout

- backend/ — Node ESM server exposing agent endpoints and chatbot endpoint.
- frontend/ — Vite + React app (main UI and orchestrator).

Key frontend files:
- frontend/src/App.jsx — main app and pipeline orchestration
- frontend/src/main.jsx — app entry
- frontend/src/index.css — styling
- frontend/scripts/run-axe.cjs — accessibility runner

## Run locally

1. Backend

```powershell
cd backend
npm install
node server.js
```

Expected: server listens on port 3001 and exposes the routes:

- POST /api/agents/maya/run
- POST /api/agents/lina/run
- POST /api/agents/alex/run
- POST /api/agents/sam/run
- POST /api/agents/daniel/run
- POST /api/chatbot/run

If port 3001 is occupied, either free the port or update agent URLs in `frontend/src/App.jsx`.

2. Frontend

```bash
cd frontend
npm install
npm run dev
# open http://localhost:5175 (or the port Vite picks)
```

3. Accessibility scan

```bash
cd frontend
node scripts/run-axe.cjs http://localhost:5175
# results saved to frontend/axe-results.json
```

## End-to-end test

1. Ensure backend is running on port 3001.
2. Start the frontend dev server and open the site.
3. Use the chat box (Nora) and ask: "Recommend dishes for dinner" — the frontend detects recommendation requests and will run the five-agent pipeline.

## Troubleshooting

- Port conflict (3001): on Windows PowerShell run:

```powershell
$conn = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) { Get-Process -Id $conn.OwningProcess }
```

If the process is safe to stop, run:

```powershell
Stop-Process -Id <pid> -Force
```

- Vite HMR / JSX parse errors: revert `frontend/src/App.jsx` to the last committed state with:

```bash
cd frontend
git checkout -- src/App.jsx
```

## Notes & Next steps

- Accessibility: `frontend/axe-results.json` currently reports no violations for the tested page.
- CI: GH Pages workflow is in `.github/workflows/deploy-gh-pages.yml`.
- I can start the backend and run an end-to-end demo and capture screenshots/logs on request.

---

If you want, I will now start/inspect the backend and run a full end-to-end demo. Reply "Go" to proceed, or tell me to stop the current process instead of killing it.
