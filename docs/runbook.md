# TasteMate AI Runbook

## Local development

1. Start the backend

```powershell
cd backend
npm install
node server.js
```

- Backend listens on port `3001` by default.
- Ensure `GOOGLE_SHEET_ID` is set in your environment to enable `/api/data`.

2. Start the frontend

```bash
cd frontend
npm install
npm run dev
# open the URL printed by Vite (e.g. http://localhost:5178/)
```

3. Run accessibility scan

```bash
cd frontend
node scripts/run-axe.cjs http://localhost:5178
# results saved to frontend/axe-results.json
```

4. Generate submission PDF

```bash
cd frontend
node scripts/generate-submission.mjs
# output: frontend/submission.pdf
```

## Testing the chatbot (Nora)

Use the chat box in the UI or send a POST to the backend API:

```powershell
Invoke-RestMethod -Uri 'http://localhost:3001/api/chatbot/run' -Method POST -Body '{"message":"Recommend Italian dishes"}' -ContentType 'application/json'
```

Nora replies only with information found in the Google Sheets / MCP snapshot. If Nora cannot find data, she replies:

> "I couldn't find that information in the available TasteMate data."

## Notes

- If `npm ci` fails on Windows due to file locks, ensure no running `node` processes are holding node_modules files and retry.
- CI: GitHub Actions workflow is at `.github/workflows/deploy-gh-pages.yml` and builds `frontend` then publishes `frontend/dist` to GitHub Pages.
