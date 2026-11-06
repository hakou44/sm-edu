// v1.12.0 quality pass regression test (no network, no backend needed).
const assert = require('assert');
const fs = require('fs');
const root = __dirname + '/..';
const bank = JSON.parse(fs.readFileSync(root + '/web/data/exercise-bank-2026-2027.json', 'utf8'));
const mc = bank.records.filter(r => r.choices && r.answer_index !== null && r.answer_index !== undefined);
const pos = [0, 1, 2].map(i => mc.filter(r => r.answer_index === i).length);
assert(Math.min(...pos) >= mc.length * 0.30, 'answer positions are unbalanced: ' + pos);
for (const r of mc) assert.equal(r.choices[r.answer_index], r.solution, r.id);

// Term-exam and situation answer keys store the answer text and must still match the bank.
const byId = Object.fromEntries(bank.records.map(r => [r.id, r]));
const exams = JSON.parse(fs.readFileSync(root + '/web/data/term-exams-2026-2027.json', 'utf8'));
let checked = 0;
for (const p of exams.papers) for (const k of p.answer_key) {
  const r = byId[k.question_id];
  assert(r, k.question_id);
  if (r.choices) { assert.equal(k.expected_answer, r.solution, p.id + ' ' + k.question_id); checked++; }
}
assert(checked > 1000);

// Cross-grade repeats are flagged consistently.
const groups = {};
for (const r of bank.records) (groups[r.subject + '|' + r.question.trim()] ||= []).push(r);
for (const items of Object.values(groups)) {
  const grades = new Set(items.map(r => r.grade));
  for (const r of items) {
    const flagged = (r.quality_flags || []).includes('cross_grade_repeat');
    assert.equal(flagged, grades.size > 1, r.id);
    if (flagged) assert.deepEqual(r.repeat_grades, [...grades].sort(), r.id);
  }
}
assert(fs.existsSync(root + '/CROSS_GRADE_REPEAT_WORKLIST.csv'));

// Four Algerian-style criteria on every integrative situation.
const sit = JSON.parse(fs.readFileSync(root + '/web/data/integrative-assessments-2026-2027.json', 'utf8')).situations;
for (const s of sit) {
  assert.equal(s.written_rubric.length, 4, s.id);
  assert(s.written_rubric[0].startsWith('الوجاهة') && s.written_rubric[3].startsWith('الإتقان'), s.id);
  assert(/pending_official_verification/.test(s.rubric_basis), s.id);
}

// Backend hardening and frontend loader.
const be = fs.readFileSync(root + '/backend/app/main.py', 'utf8');
assert(be.includes('def require_admin(') && !be.includes(':generateContent?key='));
assert((be.match(/dependencies=\[Depends\(require_admin\)\]/g) || []).length >= 16);
assert(!be.includes('x-goog-api-key') && !be.includes('api.groq.com') && !be.includes('generateContent'), 'AI provider credentials and calls must stay out of the backend');
const sw = fs.readFileSync(root + '/web/sw.js', 'utf8');
assert(sw.includes('exercise-bank-2026-2027.json') && sw.includes('Promise.allSettled'));
assert(fs.readFileSync(root + '/web/config.js', 'utf8').includes('smFetchJSON'));
assert(!/fetch\('\.\/data\/exercise-bank/.test(fs.readFileSync(root + '/web/app.js', 'utf8') + fs.readFileSync(root + '/web/offline-tutor.js', 'utf8')));
console.log('PASS: v1.12.0 — answer positions balanced ' + pos + ', cross-grade repeats flagged, 4-criteria rubric, admin guard, shared loader');
