const express = require('express');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Ping endpoint to check if server is alive
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/generate-pdf', async (req, res) => {
  let browser;

  try {
    const { html, fileName } = req.body || {};

    if (typeof html !== 'string' || html.trim() === '') {
      return res.status(400).send('HTML is required');
    }

    const cleanHTML = html
      .replace(/```html/g, '')
      .replace(/```/g, '')
      .trim();

    const useRenderChromium = process.env.RENDER === 'true' && process.platform === 'linux';

    if (!useRenderChromium) {
      // Local (Windows/Mac): use full puppeteer package.
      const puppeteer = require('puppeteer');

      browser = await puppeteer.launch({
        headless: true,
      });
    } else {
      // Render (Linux): use puppeteer-core with sparticuz chromium.
      const puppeteerCore = require('puppeteer-core');
      const chromium = require('@sparticuz/chromium');
      const executablePath = await chromium.executablePath();

      browser = await puppeteerCore.launch({
        args: chromium.args,
        executablePath,
        headless: true,
      });
    }

    const page = await browser.newPage();

    await page.setContent(cleanHTML, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '40px',
        bottom: '40px',
        left: '40px',
        right: '40px'
      }
    });

    await browser.close();

    const safeFileName = (fileName || 'resume')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${safeFileName}.pdf`
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('FULL ERROR:', error);
    res.status(500).send(error.toString());
  } finally {
    if (browser) {
      await browser.close().catch((closeError) => {
        console.error('Error while closing browser:', closeError);
      });
    }
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});