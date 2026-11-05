# PSM I Reviewer

A self-contained practice app for the **Professional Scrum Master I (PSM I)** assessment, with an
original 500-question bank aligned to the **Scrum Guide 2020**.

> Independent study material. Not affiliated with, endorsed by, or containing content from Scrum.org.
> All questions and explanations were written originally for this project, based on the publicly
> available [Scrum Guide 2020](https://scrumguides.org/).

Two apps share the same question bank:

| App | Location | Runs on |
| --- | --- | --- |
| **Web app** | this folder | Any browser, served locally over HTTP |
| **Mobile app** | [`mobile/`](./mobile) | iOS and Android, via Expo — see [mobile/README.md](./mobile/README.md) |

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later (only used for the local static server and the
  build/validation script — no packages are installed, there is no `node_modules`)
- Any modern browser (Chrome, Firefox, Safari, Edge)

Check your Node version:

```bash
node --version
```

## Quick start

```bash
cd psm-reviewer
npm run dev        # validate + merge the question bank, then serve
# or, step by step:
npm run build      # data/raw/domain*.json  ->  questions.json
npm start           # http://localhost:4173
```

Then open **http://localhost:4173** in your browser.

No dependencies, no build toolchain — plain HTML/CSS/JS and Node's standard library.
You must serve it over HTTP (`npm start`); opening `index.html` directly will fail because the
browser blocks `fetch` on `file://` URLs.

To stop the server, press `Ctrl+C` in the terminal running it. To use a different port:

```bash
PORT=5000 npm start
```

## Study modes

| Mode | What it does |
| --- | --- |
| **Practice** | Immediate grading plus explanation per question. Filter by domain, difficulty, count; optionally prioritize unseen questions or drill only the ones you got wrong/flagged. |
| **Exam simulation** | 80 random questions, 60-minute countdown, question palette with flags, no feedback until submit. Scored against the real **85% pass mark**. Auto-saves, so you can resume an interrupted attempt. |
| **Flashcards** | Question front, answer + explanation back. Space/click to flip, arrow keys to move. |
| **Browse** | Full-text search across questions, answers, and explanations, with per-question stats and flagging. |
| **Stats** | Lifetime accuracy, coverage and accuracy per domain, and your session history. |

Answer options are shuffled on every attempt, so you learn the concept rather than the letter.
All progress lives in `localStorage` in your browser — nothing is uploaded.

### Keyboard shortcuts

- `A`–`E` — select an option
- `Enter` — submit / next
- `←` `→` — previous / next question
- `F` — flag the current question
- `Space` — flip a flashcard

## Usage walkthrough

1. **Home** — pick a mode. Practice and Flashcards let you filter by domain and difficulty before
   starting; Exam simulation always draws 80 random questions across all domains.
2. **During a quiz** — select an answer (single or multiple choice, as indicated under the
   question id), then **Submit answer** in Practice mode to see the explanation, or move freely
   between questions in Exam mode using **Previous / Next** or the numbered palette at the bottom.
   Click 🔖 to flag a question you want to revisit later, in any mode.
3. **Exam timer** — counts down from 60:00. If it reaches zero the exam auto-submits. Closing the
   tab or clicking **← Exit** saves your progress; **Resume saved exam** appears on the Home screen
   next time you load the app.
4. **Results** — see your overall score against the 85% pass mark and a per-domain breakdown.
   Use **Review incorrect answers** to read explanations for everything you missed, or
   **Retry incorrect only** to immediately re-attempt just those questions.
5. **Browse** — search the full bank by keyword, domain, or difficulty; flag questions directly
   from the list.
6. **Stats** — see lifetime accuracy, per-domain coverage, and your history of completed sessions.
   **Reset all progress** clears everything stored in the browser.

## Data & privacy

All progress (answers, flags, session history) is stored only in your browser's `localStorage`
under the current origin — nothing is sent to a server, logged, or shared. Clearing your browser
data for `localhost` (or using a different browser/profile) resets progress. Use **Stats → Reset
all progress** to clear it intentionally from within the app.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Blank page / "Could not load questions.json" | Run `npm run build` first (it generates `questions.json`), then make sure you're using `npm start`, not opening `index.html` directly. |
| `Error: listen EADDRINUSE` on start | Port 4173 is in use — run `PORT=5000 npm start` (or any free port) instead. |
| `npm run build` fails with validation errors | The error lists the exact file/question id and problem (e.g. duplicate id, out-of-range answer index); fix the entry under `data/raw/` and re-run. |
| Progress/exam resume missing after reopening | Confirm you're using the same browser/profile and that site data for `localhost` wasn't cleared. |

## Question bank

500 questions across five domains:

| Domain | Count |
| --- | --- |
| Scrum Theory & Empiricism | 100 |
| Scrum Team & Accountabilities | 100 |
| Scrum Events | 100 |
| Scrum Artifacts & Commitments | 100 |
| Applying Scrum in Practice | 100 |

Each question mixes single-answer and multiple-answer formats across easy/medium/hard difficulty,
and carries an explanation and a Scrum Guide reference.

## Project layout

```
index.html          app shell and views
styles.css          styling, light + dark themes
app.js              quiz engine, flashcards, browse, stats, persistence
build.js            merges and validates data/raw/domain*.json -> questions.json
server.js           dependency-free static server
data/raw/*.json     source question files, one per domain
questions.json      generated bank consumed by the app (do not edit by hand)
mobile/             Expo (React Native) app for iOS and Android
```

## Mobile app

A native iOS and Android version lives in [`mobile/`](./mobile) and reuses the same 500 questions:

```bash
cd mobile
npm install
npx expo start      # scan the QR code with Expo Go on your phone
```

Full setup and build instructions (Expo Go, and building a local APK) are in [mobile/README.md](./mobile/README.md).

After changing any question, re-sync the bank so both apps stay in step:

```bash
npm run build:all   # validate + merge, then copy questions.json into mobile/src/data/
```

## Editing or adding questions

Edit the files under `data/raw/`, then re-run `npm run build` (or `npm run build:all` to also
update the mobile app's copy). Each entry looks like:

```json
{
  "id": "D3-042",
  "domain": "Scrum Events",
  "difficulty": "medium",
  "type": "single",
  "question": "Who is accountable for the Daily Scrum?",
  "options": ["The Scrum Master", "The Developers", "The Product Owner", "The project manager"],
  "correct": [1],
  "explanation": "The Daily Scrum is the Developers' event...",
  "reference": "Scrum Guide 2020 - Daily Scrum"
}
```

`build.js` rejects the bank if it finds duplicate ids, out-of-range `correct` indices, a `single`
question with more than one answer, a `multiple` question with fewer than two, duplicate option
text, or malformed JSON — so a broken edit can never reach the app silently.

## Exam facts (PSM I)

- 80 multiple-choice / multiple-answer / true-false questions
- 60 minutes
- **85%** to pass
- Based on the Scrum Guide 2020; read it end to end at least twice before sitting the exam
