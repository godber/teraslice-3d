const { chromium } = require('playwright');

// Target URL - change this if your dev server runs on a different port
const TARGET_URL = process.env.TEST_URL || 'http://localhost:1234';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  try {
    console.log(`Testing homepage at ${TARGET_URL}...`);

    // Navigate to homepage
    const response = await page.goto(TARGET_URL, {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    // Check response status
    if (response && response.ok()) {
      console.log(`✅ Homepage loaded successfully (Status: ${response.status()})`);
    } else {
      console.log(`❌ Homepage failed to load (Status: ${response?.status() || 'unknown'})`);
      await browser.close();
      process.exit(1);
    }

    // Get page title
    const title = await page.title();
    console.log(`📄 Page title: "${title}"`);

    // Take a screenshot
    await page.screenshot({
      path: '/tmp/homepage-screenshot.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved to /tmp/homepage-screenshot.png');

    // Check if the page has the main container
    // (Adjust selector based on your actual homepage structure)
    const hasContent = await page.locator('body').count() > 0;
    if (hasContent) {
      console.log('✅ Page content loaded');
    } else {
      console.log('⚠️  Page content not found');
    }

    console.log('\n✅ All homepage tests passed!');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    await browser.close();
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
