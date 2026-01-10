const fs = require('fs');
const path = require('path');

const rawPath = path.join(__dirname, '..', 'public', 'questions', 'listening', 'cambridge08_raw.txt');
const outDir = path.join(__dirname, '..', 'public', 'questions', 'listening');

function backupIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    const bak = filePath + '.bak';
    fs.copyFileSync(filePath, bak);
    console.log('Backed up', filePath, '->', bak);
  }
}

function findTestRanges(text) {
  const tests = [];
  const re = /Test\s+(\d+)/g;
  let match;
  const positions = [];
  while ((match = re.exec(text)) !== null) {
    positions.push({ test: Number(match[1]), idx: match.index });
  }
  // For each unique test number (2..4) find the occurrence that has 'SECTION 1' soon after
  for (const p of positions) {
    const look = text.slice(p.idx, p.idx + 2000);
    if (/SECTION\s+1/i.test(look)) {
      // find end as next 'Test <num>' occurrence with SECTION 1 after it, else end of text
      tests.push({ test: p.test, start: p.idx });
    }
  }
  // sort by start
  tests.sort((a,b) => a.start - b.start);
  // compute ends
  for (let i = 0; i < tests.length; i++) {
    const start = tests[i].start;
    const end = i + 1 < tests.length ? tests[i+1].start : text.length;
    tests[i].end = end;
  }
  return tests;
}

function splitSections(testText) {
  const re = /SECTION\s+(\d+)/gi;
  const sections = [];
  let match;
  const positions = [];
  while ((match = re.exec(testText)) !== null) {
    positions.push({ sec: Number(match[1]), idx: match.index });
  }
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].idx;
    const end = i + 1 < positions.length ? positions[i + 1].idx : testText.length;
    const secText = testText.slice(start, end).trim();
    sections.push({ sectionNumber: positions[i].sec, text: secText });
  }
  return sections;
}

function parseQuestionsFromSection(secText, startQNum) {
  // Find numbered questions and multiple-choice options
  const lines = secText.split(/\n/).map(l => l.trim()).filter(Boolean);
  const questions = [];
  let qnum = startQNum;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\d{1,3})\s+(.+)/);
    if (m) {
      const id = String(qnum);
      let questionText = m[2].trim();
      // collect following option lines A/B/C or lines until next numbered question
      const options = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        const l = lines[j];
        if (/^[A-D]\s*[\).]?\s*/.test(l) || /^[A-D]\s+-\s+/.test(l)) {
          // option like A  some text
          const opt = l.replace(/^[A-D]\s*[\).]?\s*/,'').trim();
          options.push(opt);
          continue;
        }
        if (/^\d{1,3}\s+/.test(l)) break;
        if (/^[A-D]\./.test(l)) {
          const opt = l.replace(/^[A-D]\./,'').trim();
          options.push(opt);
          continue;
        }
        if (/^Questions?\b/i.test(l) || /^Complete\b/i.test(l) || /^Choose\b/i.test(l)) {
          continue;
        }
        if (options.length === 0) {
          questionText += ' ' + l;
        }
      }
      i = j - 1;
      if (options.length > 0) {
        questions.push({ id, type: 'multiple-choice', question: questionText, options });
      } else {
        questions.push({ id, type: 'form-completion', question: questionText, answerLength: 'short' });
      }
      qnum++;
    }
  }
  return { questions, lastQ: qnum };
}

function buildTestJson(testNum, sectionsParsed) {
  const testObj = { testId: `cambridge-08-test-${testNum}`, title: `Cambridge IELTS 08 - Test ${testNum}`, sections: [] };
  let currentId = 1 + (testNum - 1) * 10; // start each test at 1,11,21,31? but tests are 1..40 overall; however existing Test1 uses 1..40 per test
  // To match Test1 numbering (1-40 per test), we'll restart numbering at 1 for each test
  currentId = 1;
  for (const sec of sectionsParsed) {
    const parsed = parseQuestionsFromSection(sec.text, currentId);
    currentId = parsed.lastQ;
    const audioIndex = (testNum - 1) * 4 + (sec.sectionNumber - 1);
    const sectionObj = { sectionNumber: sec.sectionNumber, audioUrl: `/Cambridge IELTS 08/audio/Cambridge IELTS 1 (${audioIndex}).wma`, questions: parsed.questions };
    testObj.sections.push(sectionObj);
  }
  return testObj;
}

function main() {
  const raw = fs.readFileSync(rawPath, 'utf8');
  const tests = findTestRanges(raw);
  for (let t = 2; t <= 4; t++) {
    const entry = tests.find(x => x.test === t);
    if (!entry) {
      console.warn('Test', t, 'not found in raw');
      continue;
    }
    const testText = raw.slice(entry.start, entry.end);
    const sections = splitSections(testText);
    const testJson = buildTestJson(t, sections);
    const outFile = path.join(outDir, `cambridge-08-test-${t}.json`);
    backupIfExists(outFile);
    fs.writeFileSync(outFile, JSON.stringify(testJson, null, 2), 'utf8');
    console.log('Wrote', outFile);
  }
}

main();
