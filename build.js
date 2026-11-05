#!/usr/bin/env node
/**
 * Merges and validates data/raw/domain*.json into questions.json.
 * Usage: npm run build
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const RAW_DIR = path.join(ROOT, 'data', 'raw');
const OUT = path.join(ROOT, 'questions.json');

const DIFFS = new Set(['easy', 'medium', 'hard']);
const TYPES = new Set(['single', 'multiple']);

const errors = [];
const warnings = [];
const seenIds = new Set();
const seenText = new Map();
const all = [];

const files = fs.readdirSync(RAW_DIR).filter((f) => /^domain\d+\.json$/.test(f)).sort();
if (!files.length) {
  console.error(`No question files found in ${RAW_DIR}`);
  process.exit(1);
}

for (const file of files) {
  const full = path.join(RAW_DIR, file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    errors.push(`${file}: invalid JSON — ${e.message}`);
    continue;
  }
  if (!Array.isArray(data)) {
    errors.push(`${file}: expected a JSON array`);
    continue;
  }

  data.forEach((q, i) => {
    const where = `${file}[${i}]${q && q.id ? ` (${q.id})` : ''}`;
    const req = ['id', 'domain', 'difficulty', 'type', 'question', 'options', 'correct', 'explanation'];
    for (const key of req) {
      if (q[key] === undefined || q[key] === null || q[key] === '') errors.push(`${where}: missing "${key}"`);
    }
    if (errors.length && !q.options) return;

    if (seenIds.has(q.id)) errors.push(`${where}: duplicate id`);
    seenIds.add(q.id);

    if (!DIFFS.has(q.difficulty)) errors.push(`${where}: bad difficulty "${q.difficulty}"`);
    if (!TYPES.has(q.type)) errors.push(`${where}: bad type "${q.type}"`);

    if (!Array.isArray(q.options) || q.options.length < 3) {
      errors.push(`${where}: needs at least 3 options`);
      return;
    }
    if (new Set(q.options.map((o) => String(o).trim().toLowerCase())).size !== q.options.length) {
      errors.push(`${where}: duplicate option text`);
    }
    if (q.options.some((o) => /^(all|none) of the above/i.test(String(o).trim()))) {
      warnings.push(`${where}: uses "all/none of the above"`);
    }

    if (!Array.isArray(q.correct) || !q.correct.length) {
      errors.push(`${where}: "correct" must be a non-empty array`);
      return;
    }
    if (new Set(q.correct).size !== q.correct.length) errors.push(`${where}: repeated index in "correct"`);
    for (const c of q.correct) {
      if (!Number.isInteger(c) || c < 0 || c >= q.options.length) {
        errors.push(`${where}: correct index ${c} out of range (0..${q.options.length - 1})`);
      }
    }
    if (q.type === 'single' && q.correct.length !== 1) errors.push(`${where}: single-answer question has ${q.correct.length} correct answers`);
    if (q.type === 'multiple' && q.correct.length < 2) errors.push(`${where}: multiple-answer question needs 2+ correct answers`);
    if (q.correct.length >= q.options.length) errors.push(`${where}: every option marked correct`);

    const norm = String(q.question).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    if (seenText.has(norm)) warnings.push(`${where}: duplicate question text, same as ${seenText.get(norm)}`);
    else seenText.set(norm, q.id);

    all.push({
      id: q.id,
      domain: q.domain,
      difficulty: q.difficulty,
      type: q.type,
      question: String(q.question).trim(),
      options: q.options.map((o) => String(o).trim()),
      correct: q.correct.slice().sort((a, b) => a - b),
      explanation: String(q.explanation).trim(),
      reference: q.reference ? String(q.reference).trim() : 'Scrum Guide 2020'
    });
  });
}

if (warnings.length) {
  console.warn(`\n⚠  ${warnings.length} warning(s):`);
  warnings.slice(0, 20).forEach((w) => console.warn('   ' + w));
}
if (errors.length) {
  console.error(`\n✖ ${errors.length} error(s):`);
  errors.slice(0, 40).forEach((e) => console.error('   ' + e));
  process.exit(1);
}

all.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(OUT, JSON.stringify(all, null, 1));

const by = (key) => all.reduce((acc, q) => ((acc[q[key]] = (acc[q[key]] || 0) + 1), acc), {});
console.log(`\n✔ Wrote ${all.length} questions to ${path.relative(ROOT, OUT)}`);
console.table(by('domain'));
console.table(by('difficulty'));
console.table(by('type'));
