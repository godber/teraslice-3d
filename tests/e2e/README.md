# End-to-End Tests

Browser-based tests using Playwright.

## Prerequisites

Ensure the Playwright skill is installed and set up:

```bash
cd ~/.claude/skills/playwright-skill
npm run setup
```

## Running Tests

### From the Playwright Skill Directory

```bash
cd ~/.claude/skills/playwright-skill
node run.js /Users/godber/ClaudeWorkspace/teraslice-3d/tests/e2e/homepage.test.js
```

### With Custom URL

```bash
TEST_URL=http://localhost:8000 cd ~/.claude/skills/playwright-skill && node run.js /Users/godber/ClaudeWorkspace/teraslice-3d/tests/e2e/homepage.test.js
```

## Available Tests

- `homepage.test.js` - Tests if the homepage loads correctly

## Adding New Tests

Create new test files in this directory following the pattern:

```javascript
const { chromium } = require('playwright');
const TARGET_URL = process.env.TEST_URL || 'http://localhost:1234';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Your test code here

  await browser.close();
})();
```

Then run via the Playwright skill's `run.js` wrapper.
