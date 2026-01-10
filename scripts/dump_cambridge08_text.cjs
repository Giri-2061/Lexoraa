/*
  Dump raw extracted text from the Cambridge IELTS 08 PDF to a temporary file
  Usage:
    node scripts/dump_cambridge08_text.cjs

  Output:
    tmp/cambridge08_raw.txt
*/

const fs = require('fs');
const path = require('path');
const pdfLib = require('pdf-parse');
const pdf = pdfLib && (pdfLib.default || pdfLib);

const pdfPath = path.join(__dirname, '..', 'public', 'Cambridge IELTS 08', 'Cambridge_IELTS_08.pdf');
const outDir = path.join(__dirname, '..', 'tmp');
fs.mkdirSync(outDir, { recursive: true });

async function extractText() {
  const dataBuffer = fs.readFileSync(pdfPath);
  let data;
  if (pdf && pdf.PDFParse) {
    const parser = new pdf.PDFParse({ data: dataBuffer, verbosity: (pdf.VerbosityLevel && pdf.VerbosityLevel.ERRORS) || 0 });
    await parser.load();
    const rawText = await parser.getText();
    let textVal;
    if (typeof rawText === 'string') textVal = rawText;
    else if (Array.isArray(rawText)) textVal = rawText.join('\n');
    else if (rawText && typeof rawText.text === 'string') textVal = rawText.text;
    else textVal = String(rawText || '');
    data = { text: textVal };
  } else if (typeof pdf === 'function') {
    data = await pdf(dataBuffer);
  } else if (pdf && pdf.default && typeof pdf.default === 'function') {
    data = await pdf.default(dataBuffer);
  } else {
    throw new Error('Unsupported pdf-parse export shape');
  }

  const outPath = path.join(outDir, 'cambridge08_raw.txt');
  fs.writeFileSync(outPath, data.text || '', 'utf8');
  console.log('Wrote raw text to', outPath);
}

extractText().catch((e) => { console.error(e); process.exit(1); });
