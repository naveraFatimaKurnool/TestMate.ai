const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const url = process.argv[2] || 'http://localhost:5175/';

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (err) {
    console.error('Could not open page:', url);
    console.error(err.message || err);
    await browser.close();
    process.exit(2);
  }

  // Inject axe-core
  const axe = require('axe-core');
  await page.addScriptTag({ content: axe.source });

  // Run axe
  const results = await page.evaluate(async () => {
    return await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
  });

  const outPath = 'axe-results.json';
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

  console.log(`Axe results saved to ${outPath}`);
  console.log(`Violations: ${results.violations.length}`);
  results.violations.forEach((v) => {
    console.log('----');
    console.log(v.id, '-', v.description);
    console.log('Impact:', v.impact);
    v.nodes.forEach((n, i) => {
      console.log(`  [${i + 1}]`, n.target.join(', '));
      if (n.failureSummary) console.log('    ', n.failureSummary.replace(/\n/g, ' '));
    });
  });

  await browser.close();

  if (results.violations.length > 0) process.exit(1);
  process.exit(0);
})();
