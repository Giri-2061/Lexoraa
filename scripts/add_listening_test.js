#!/usr/bin/env node
/**
 * add_listening_test.js
 *
 * Usage (PowerShell):
 *  node .\scripts\add_listening_test.js --book 17 --test 3 --src "C:\path\to\audio-folder"
 *
 * Expects the source folder to contain files named: sec1.mp3, sec2.mp3, sec3.mp3, sec4.mp3
 * It will copy them to `public/audio` with names like `book17-test3-sec1.mp3` and
 * update (or create) the served + working JSON files:
 *  - public/questions/listening/book17-test3.json
 *  - public/questions/listening_questions/book17/test3.json
 */

const fs = require('fs').promises;
const path = require('path');

function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i+1] && !argv[i+1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    // ignore
  }
}

async function readJsonSafe(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

async function writeJson(filePath, obj) {
  const content = JSON.stringify(obj, null, 2) + '\n';
  await fs.writeFile(filePath, content, 'utf8');
}

async function main() {
  const args = parseArgs();
  const book = args.book;
  const test = args.test;
  const src = args.src;

  if (!book || !test || !src) {
    console.error('Missing required args. Usage: --book <n> --test <m> --src "C:\\path\\to\\audio"');
    process.exit(1);
  }

  const cwd = process.cwd();
  const publicAudioDir = path.join(cwd, 'public', 'audio');
  await ensureDir(publicAudioDir);

  const destFiles = [];
  for (let i = 1; i <= 4; i++) {
    const srcFileName = `sec${i}.mp3`;
    const srcPath = path.join(src, srcFileName);
    const destFileName = `book${book}-test${test}-sec${i}.mp3`;
    const destPath = path.join(publicAudioDir, destFileName);

    try {
      await fs.copyFile(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
      destFiles.push(destFileName);
    } catch (err) {
      console.warn(`Warning: could not copy ${srcPath}. (${err.message})`);
      // still push filename so JSON points to placeholder path
      destFiles.push(destFileName);
    }
  }

  // Prepare JSON paths
  const servedPath = path.join(cwd, 'public', 'questions', 'listening', `book${book}-test${test}.json`);
  const workingDir = path.join(cwd, 'public', 'questions', 'listening_questions', `book${book}`);
  const workingPath = path.join(workingDir, `test${test}.json`);
  await ensureDir(path.dirname(servedPath));
  await ensureDir(workingDir);

  // Helper to create a minimal template if JSON missing
  function makeTemplate(book, test) {
    return {
      testId: `book${book}-test${test}`,
      title: `Book ${book} - Test ${test}`,
      sections: Array.from({ length: 4 }, (_, idx) => ({
        sectionNumber: idx + 1,
        audioUrl: `/audio/book${book}-test${test}-sec${idx + 1}.mp3`,
        questions: []
      }))
    };
  }

  // Read or create served JSON
  let servedJson = await readJsonSafe(servedPath);
  if (!servedJson) {
    servedJson = makeTemplate(book, test);
    console.log(`Created new served JSON template at ${servedPath}`);
  }

  // Read or create working JSON
  let workingJson = await readJsonSafe(workingPath);
  if (!workingJson) {
    workingJson = makeTemplate(book, test);
    console.log(`Created new working JSON template at ${workingPath}`);
  }

  // Update audioUrl for both JSONs
  for (let i = 0; i < 4; i++) {
    const audioUrl = `/audio/${destFiles[i]}`;
    if (!servedJson.sections || servedJson.sections.length < 4) {
      servedJson.sections = Array.from({ length: 4 }, (_, idx) => ({ sectionNumber: idx+1, audioUrl: `/audio/book${book}-test${test}-sec${idx+1}.mp3`, questions: [] }));
    }
    if (!workingJson.sections || workingJson.sections.length < 4) {
      workingJson.sections = Array.from({ length: 4 }, (_, idx) => ({ sectionNumber: idx+1, audioUrl: `/audio/book${book}-test${test}-sec${idx+1}.mp3`, questions: [] }));
    }
    servedJson.sections[i].audioUrl = audioUrl;
    workingJson.sections[i].audioUrl = audioUrl;
  }

  // Write JSON files
  await writeJson(servedPath, servedJson);
  await writeJson(workingPath, workingJson);
  console.log(`Updated JSON: ${servedPath}`);
  console.log(`Updated JSON: ${workingPath}`);

  console.log('\nDone.');
  console.log('Next steps: commit the new files, and run the dev server to verify the audio appears in the test UI.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
