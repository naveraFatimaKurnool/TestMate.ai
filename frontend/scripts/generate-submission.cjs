const fs = require('fs')
const path = require('path')

(async () => {
  const puppeteerPkg = await import('puppeteer')
  const puppeteer = puppeteerPkg.default || puppeteerPkg
  const OUT_HTML = path.join(__dirname, '..', 'submission.html')
  const OUT_PDF = path.join(__dirname, '..', 'submission.pdf')
  const APP_URL = process.env.APP_URL || 'http://localhost:5175/'

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1200, height: 900 })

    // Capture a screenshot of the running app
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 120000 })
    const screenshot = await page.screenshot({ fullPage: true })
    const screenshotBase64 = screenshot.toString('base64')

    // Simple architecture diagram (inline SVG)
    const architectureSVG = `
    <svg width="420" height="160" viewBox="0 0 420 160" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style> .box{fill:#fff;stroke:#d1d5db;stroke-width:1.5;rx:8;}</style>
      </defs>
      <rect x="8" y="16" width="120" height="48" rx="8" class="box"/>
      <text x="68" y="46" font-size="12" text-anchor="middle" fill="#111">Maya</text>
      <rect x="148" y="16" width="120" height="48" rx="8" class="box"/>
      <text x="208" y="46" font-size="12" text-anchor="middle" fill="#111">Lina</text>
      <rect x="288" y="16" width="120" height="48" rx="8" class="box"/>
      <text x="348" y="46" font-size="12" text-anchor="middle" fill="#111">Alex</text>

      <rect x="78" y="96" width="120" height="48" rx="8" class="box"/>
      <text x="138" y="126" font-size="12" text-anchor="middle" fill="#111">Sam</text>
      <rect x="218" y="96" width="120" height="48" rx="8" class="box"/>
      <text x="278" y="126" font-size="12" text-anchor="middle" fill="#111">Daniel</text>

      <path d="M128 40 L148 40" stroke="#6b7280" stroke-width="2" marker-end="url(#arrow)" />
      <path d="M268 40 L288 40" stroke="#6b7280" stroke-width="2" marker-end="url(#arrow)" />
      <path d="M208 64 L208 96" stroke="#6b7280" stroke-width="2" marker-end="url(#arrow)" />
      <path d="M158 120 L218 120" stroke="#6b7280" stroke-width="2" marker-end="url(#arrow)" />
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill="#6b7280" />
        </marker>
      </defs>
    </svg>`

    // Report content (concise)
    const reportHTML = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>TasteMate AI — Submission</title>
        <style>
          body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:18mm}
          h1{font-family:'Playfair Display', serif;font-size:22px;margin:0 0 8px}
          p{margin:6px 0;font-size:12px}
          .row{display:flex;gap:18px}
          .col{flex:1}
          .right{width:340px}
          .screenshot{border:1px solid #ddd;width:100%;height:auto}
          .diagram{margin-top:8px}
          .meta{font-size:11px;color:#555}
        </style>
      </head>
      <body>
        <h1>TasteMate AI — Submission Summary</h1>
        <p class="meta">One-page submission: report, live UI screenshot and architecture diagram.</p>

        <div class="row">
          <div class="col">
            <h2 style="font-size:14px;margin-top:8px">Project Summary</h2>
            <p>TasteMate AI is a five-agent pipeline (Maya → Lina → Alex → Sam → Daniel) producing personalised restaurant/dish recommendations. Frontend is a Vite+React demo with an MCP-backed chat assistant 'Nora' that triggers the pipeline.</p>

            <h3 style="font-size:13px;margin-top:6px">How it works</h3>
            <p>The frontend POSTs sequentially to backend agent endpoints; each agent processes the previous handoff and returns structured briefs. Final outputs are validated by Daniel and presented to customers.</p>

            <h3 style="font-size:13px;margin-top:6px">Run & verification</h3>
            <p>Start backend (Node) on port 3001 and frontend dev (Vite). Ask Nora: "Recommend dishes for dinner" to run the full pipeline. Accessibility scan using axe-core reported no violations for the tested page.</p>

            <p style="margin-top:12px;font-size:12px;color:#333"><strong>Notes</strong>: Backend endpoints — <span class="meta">/api/agents/*/run</span> and <span class="meta">/api/chatbot/run</span>.</p>
          </div>

          <div class="right">
            <div><img class="screenshot" src="data:image/png;base64,${screenshotBase64}" alt="TasteMate UI screenshot" /></div>
            <div class="diagram">${architectureSVG}</div>
          </div>
        </div>
      </body>
    </html>`

    // Save HTML and render to PDF
    fs.writeFileSync(OUT_HTML, reportHTML, 'utf8')

    const pdfPage = await browser.newPage()
    await pdfPage.setContent(reportHTML, { waitUntil: 'networkidle0' })
    await pdfPage.emulateMediaType('screen')
    await pdfPage.pdf({ path: OUT_PDF, format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } })

    console.log('Generated', OUT_PDF)
  } finally {
    await browser.close()
  }
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
