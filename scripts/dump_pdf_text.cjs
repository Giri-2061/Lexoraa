const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfPath = path.join(__dirname, '..', 'public', 'Cambridge IELTS 08', 'Cambridge_IELTS_08.pdf');
const outPath = path.join(__dirname, '..', 'public', 'questions', 'listening', 'cambridge08_raw.txt');

async function main() {
  const dataBuffer = fs.readFileSync(pdfPath);
  const pdfLib = pdf;
  const PDFParse = pdfLib.PDFParse;
  let text = '';
  if (PDFParse) {
    const parser = new PDFParse({ data: dataBuffer, verbosity: (pdfLib.VerbosityLevel && pdfLib.VerbosityLevel.ERRORS) || 0 });
    await parser.load();
    const maybe = parser.getText();
    const raw = (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
    if (typeof raw === 'string') text = raw;
    else if (Array.isArray(raw)) text = raw.join('\n');
    else if (raw && raw.text) text = raw.text;
    else text = String(raw || '');
  } else if (typeof pdf === 'function') {
    const data = await pdf(dataBuffer);
    text = data.text;
  } else {
    throw new Error('Unsupported pdf-parse export');
  }

  fs.writeFileSync(outPath, text, 'utf8');
  console.log('Wrote raw text to', outPath);
}

main().catch(err => { console.error(err); process.exit(1); });
