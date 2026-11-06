// v1.11.0 legacy-duplicate replacement regression test (no network, no backend needed).
const fs = require('fs');
const assert = require('assert');
const root = __dirname + '/..';
const read = f => JSON.parse(fs.readFileSync(root + '/web/data/' + f, 'utf8'));
const bank = read('exercise-bank-2026-2027.json');
const report = read('coverage-report-2026-2027.json');
const exams = read('term-exams-2026-2027.json');
const integrative = read('integrative-assessments-2026-2027.json');
const ORIGIN = 'platform_authored_dedupe_replacement_v1.11.0';

// Keys ignore diacritics, punctuation, quotes and alef forms (stricter than the v1.10.0 test).
const loose = q => q.replace(/[\u064b-\u0652\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي')
  .replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
const keyOf = r => r.grade + '|' + r.subject + '|' + loose(r.question);

// Bank size is unchanged and ids are unique.
assert.equal(bank.records.length, 1581);
assert.equal(new Set(bank.records.map(r => r.id)).size, bank.records.length);
assert.equal(bank.coverage.exercises, bank.records.length);

// No grade/subject pair repeats a question any more.
const seen = new Map();
for (const r of bank.records) {
  const k = keyOf(r);
  assert(!seen.has(k), `duplicate question: ${seen.get(k)} and ${r.id}`);
  seen.set(k, r.id);
}

// Exactly 20 replaced records, each traceable to the record that kept the original question.
const isReplaced = r => !!r.content_revision && r.content_revision.origin === ORIGIN;
const replaced = bank.records.filter(isReplaced);
assert.equal(replaced.length, 20);
assert.equal(bank.coverage.dedupe_v1_11.records_replaced, 20);
assert.equal(bank.coverage.dedupe_v1_11.official_alignment_verified, false);
const byId = new Map(bank.records.map(r => [r.id, r]));
for (const r of replaced) {
  assert.equal(r.content_revision.version, '1.11.0', r.id);
  const kept = byId.get(r.content_revision.replaces_duplicate_of);
  assert(kept, r.id + ' must point to an existing record');
  assert.equal(kept.grade, r.grade, r.id);
  assert.equal(kept.subject, r.subject, r.id);
  assert.notEqual(kept.id, r.id);
  assert.equal(r.status, 'platform_practice_not_official', r.id);
  assert.equal(r.answer_mode, 'multiple_choice', r.id);
  assert.equal(r.choices.length, 3, r.id);
  assert.equal(new Set(r.choices).size, 3, r.id + ' choices must be distinct');
  assert.equal(r.choices[r.answer_index], r.solution, r.id);
  assert(r.explanation && r.solution_steps.length === 2, r.id);
  assert.equal(r.curriculum_alignment.official_sequence_verified, false, r.id);
  assert.equal(r.content_review.official_alignment, 'not_verified_against_2026_2027_ministry_annual_progression', r.id);
  assert.equal(r.curriculum_alignment.term, r.term, r.id + ' term must stay aligned');
  if (r.level === 'secondary') {
    assert.equal(r.secondary_pathway_alignment.verified, false, r.id);
    assert.deepEqual(r.secondary_pathway_alignment.pathway_ids, [], r.id);
  }
}
const pos = [0, 1, 2].map(i => replaced.filter(r => r.answer_index === i).length);
assert(Math.min(...pos) >= 5, 'replacement answer positions are unbalanced: ' + pos);

// Every pair still has all three terms and at least 12 items.
const counts = {};
for (const r of bank.records) counts[r.grade + '|' + r.subject] = (counts[r.grade + '|' + r.subject] || 0) + 1;
assert.equal(Object.keys(counts).length, 105);
assert(Object.values(counts).every(n => n >= 12));

// Exam papers and integrative situations: ids resolve, no paper repeats a question,
// and the embedded answer key of each replaced record matches the bank.
for (const [label, items] of [['term exam', exams.papers], ['integrative', integrative.situations]]) {
  let usesReplaced = 0;
  for (const it of items) {
    const keys = it.question_ids.map(id => {
      assert(byId.has(id), `${label} ${it.id} references unknown id ${id}`);
      return loose(byId.get(id).question);
    });
    assert.equal(new Set(keys).size, keys.length, `${label} ${it.id} repeats a question`);
    if (it.question_ids.some(id => isReplaced(byId.get(id)))) usesReplaced++;
  }
  assert(usesReplaced > 0, label + ' should still use replaced records');
}
for (const p of exams.papers) {
  for (const e of p.answer_key) {
    const r = byId.get(e.question_id);
    if (!isReplaced(r)) continue;
    assert.equal(e.expected_answer, r.solution, p.id + ' ' + e.question_id);
    assert.equal(e.explanation, r.explanation, p.id + ' ' + e.question_id);
    assert.deepEqual(e.solution_steps, r.solution_steps, p.id + ' ' + e.question_id);
  }
}
for (const s of integrative.situations) {
  for (const e of s.model_solution) {
    const r = byId.get(e.question_id);
    if (!isReplaced(r)) continue;
    assert.equal(e.expected_answer, r.solution, s.id + ' ' + e.question_id);
    assert.equal(e.reasoning, r.explanation, s.id + ' ' + e.question_id);
    assert.deepEqual(e.solution_steps, r.solution_steps, s.id + ' ' + e.question_id);
  }
}
assert.equal(bank.coverage.dedupe_v1_11.exam_answer_keys_synchronized,
  exams.papers.reduce((n, p) => n + p.answer_key.filter(e => isReplaced(byId.get(e.question_id))).length, 0));

// v1.12.0: generic non-subject questions are gone and their exam keys match the bank.
const generic = bank.records.filter(r => r.content_revision && r.content_revision.reason === 'generic_non_subject_question_replaced');
assert.equal(generic.length, 4);
assert.equal(bank.coverage.generic_question_cleanup_v1_11_1.records_replaced, 4);
assert(!bank.records.some(r => r.question.includes('التعلم المنظم في هذا الدرس')), 'generic question is still present');
for (const r of generic) {
  assert.equal(r.choices[r.answer_index], r.solution, r.id);
  assert.equal(new Set(r.choices).size, 3, r.id);
  for (const p of exams.papers) for (const e of p.answer_key) if (e.question_id === r.id) {
    assert.equal(e.expected_answer, r.solution, p.id + ' ' + r.id);
    assert.equal(e.explanation, r.explanation, p.id + ' ' + r.id);
  }
  for (const s of integrative.situations) for (const e of s.model_solution) if (e.question_id === r.id) {
    assert.equal(e.expected_answer, r.solution, s.id + ' ' + r.id);
    assert.equal(e.reasoning, r.explanation, s.id + ' ' + r.id);
  }
}

// Coverage report is synchronized.
assert.equal(report.version, '1.12.0');
assert.equal(report.totals.exercises, bank.records.length);
assert.equal(report.totals.legacy_duplicates_replaced_v1_11, 20);
assert.equal(report.totals.generic_questions_replaced_v1_11_1, 4);
console.log('PASS: v1.11.0 — 20 legacy duplicate questions replaced, ids preserved, no duplicates left, exam answer keys synchronized');
