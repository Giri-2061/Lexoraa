Add listening test audio and update JSON helper

Usage (PowerShell):

1. Put your 4 section mp3 files in a local folder and name them: `sec1.mp3`, `sec2.mp3`, `sec3.mp3`, `sec4.mp3`.

2. Run the script from the project root (PowerShell):

```powershell
node .\scripts\add_listening_test.js --book 17 --test 3 --src "C:\path\to\your\audio-folder"
```

What it does:
- Copies `sec1.mp3`..`sec4.mp3` into `public/audio` with names `book17-test3-sec1.mp3` etc.
- Updates (or creates) the served JSON `public/questions/listening/book17-test3.json` and the working copy `public/questions/listening_questions/book17/test3.json` so each section's `audioUrl` points to the copied files.

Notes:
- The script will warn if any source mp3 is missing but will still update JSONs pointing to the expected destination filenames.
- You can adapt the script if you prefer different naming conventions.
