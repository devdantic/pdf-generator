const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/generate-pdf', async (req, res) => {
  try {
    const { html, fileName } = req.body;

    const cleanHTML = html
  .replace(/```html/g, '')
  .replace(/```/g, '')
  .trim();

    if (!cleanHTML) {
      return res.status(400).send('HTML is required');
    }

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

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
    console.error(error);
    res.status(500).send('Error generating PDF');
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});