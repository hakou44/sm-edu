// v1.10.0 content depth pack regression test (no network, no backend needed).
const fs = require('fs');
const assert = require('assert');
const root = __dirname + '/..';
const bank = JSON.parse(fs.readFileSync(root + '/web/data/exercise-bank-2026-2027.json', 'utf8'));
const report = JSON.parse(fs.readFileSync(root + '/web/data/coverage-report-2026-2027.json', 'utf8'));
const pack = bank.records.filter(r => r.id.startsWith('V10-'));

assert.equal(pack.length, 192);
assert.equal(bank.coverage.depth_pack_v1_10.exercises, 192);
assert.equal(bank.coverage.depth_pack_v1_10.grade_subject_pairs, 64);
assert.equal(bank.coverage.exercises, bank.records.length);

const pairs = {};
for (const r of pack) (pairs[r.grade + '|' + r.subject] ||= []).push(r);
assert.equal(Object.keys(pairs).length, 64);
for (const [pair, rows] of Object.entries(pairs)) {
  assert.equal(rows.length, 3, pair);
  assert.deepEqual(rows.map(r => r.term).sort(), [1, 2, 3], pair + ' must have one item per term');
}

for (const r of pack) {
  assert.equal(r.status, 'platform_practice_not_official', r.id);
  assert.equal(r.content_origin, 'platform_authored_depth_pack_v1.10.0', r.id);
  assert.equal(r.answer_mode, 'multiple_choice', r.id);
  assert.equal(r.choices.length, 3, r.id);
  assert.equal(new Set(r.choices).size, 3, r.id + ' choices must be distinct');
  assert.equal(r.choices[r.answer_index], r.solution, r.id);
  assert(r.explanation && r.solution_steps.length >= 2, r.id);
  assert(['مبتدئ', 'متوسط', 'متقدم'].includes(r.difficulty), r.id);
  assert.equal(r.curriculum_alignment.official_sequence_verified, false, r.id);
  assert.equal(r.curriculum_alignment.alignment_status, 'platform_topic_mapping_pending_official_annual_progression', r.id);
  assert.equal(r.content_review.official_alignment, 'not_verified_against_2026_2027_ministry_annual_progression', r.id);
  const lang = r.subject === 'اللغة الإنجليزية' ? 'en' : r.subject === 'اللغة الفرنسية' ? 'fr' : 'ar';
  assert.equal(r.language, lang, r.id);
  if (r.level === 'secondary') {
    assert.equal(r.secondary_pathway_alignment.verified, false, r.id);
    assert.deepEqual(r.secondary_pathway_alignment.pathway_ids, [], r.id + ' must not assign a pathway');
  }
}

// New items must not duplicate any other question in their grade/subject pair
// (legacy near-duplicates from earlier releases are reported, not asserted here).
const keyOf = r => r.grade + '|' + r.subject + '|' + r.question.replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
const legacyKeys = new Set(bank.records.filter(r => !r.id.startsWith('V10-')).map(keyOf));
const packKeys = new Set();
for (const r of pack) {
  assert(!legacyKeys.has(keyOf(r)), 'pack duplicates an existing question: ' + r.id);
  assert(!packKeys.has(keyOf(r)), 'duplicate inside pack: ' + r.id);
  packKeys.add(keyOf(r));
}
assert.equal(new Set(bank.records.map(r => r.id)).size, bank.records.length);

// Correct-answer positions must not be concentrated in one slot.
const pos = [0, 1, 2].map(i => pack.filter(r => r.answer_index === i).length);
assert(Math.min(...pos) >= 40, 'answer positions are unbalanced: ' + pos);

// Every one of the 105 pairs now has >= 12 items and all three terms.
const counts = {};
for (const r of bank.records) counts[r.grade + '|' + r.subject] = (counts[r.grade + '|' + r.subject] || 0) + 1;
assert.equal(Object.keys(counts).length, 105);
assert(Object.values(counts).every(n => n >= 12), 'a pair is still below 12 items');

// Coverage report stays consistent with the bank.
assert.equal(report.version, '1.12.0');
assert.equal(report.totals.exercises, bank.records.length);
assert.equal(report.totals.depth_pack_v1_10_exercises, 192);
assert.equal(report.stages.reduce((n, s) => n + s.exercises, 0), bank.records.length);
assert.equal(report.grade_subject_coverage.reduce((n, x) => n + x.exercise_count, 0), bank.records.length);
for (const x of report.grade_subject_coverage) {
  assert.equal(x.exercise_count, counts[x.grade + '|' + x.subject], x.grade + x.subject);
  assert(x.all_terms_covered && x.target_met && x.official_sequence_verified === false);
}
console.log('PASS: v1.10.0 depth pack — 192 exercises over 64 previously thin pairs, term-balanced, integrity-checked, no official-alignment claim, coverage report synchronized');
