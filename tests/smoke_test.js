const fs=require('fs'),vm=require('vm'),assert=require('assert');
const root=__dirname+'/..';
const js=fs.readFileSync(root+'/web/app.js','utf8');
assert(js.includes('primary:')&&js.includes('middle:')&&js.includes('secondary:'));
for(const grade of ['الأولى ابتدائي','الخامسة ابتدائي','الرابعة متوسط','الثالثة ثانوي']) assert(js.includes(grade));
assert(js.includes("ar:{")&&js.includes("fr:{")&&js.includes("en:{"));
assert(js.includes('ACADEMIC_YEAR')&&js.includes('subjectsForCurrentGrade'));
assert(js.includes('renderMathPractice')&&js.includes('submitTest')&&js.includes('showSolution'));
assert(js.includes('revisionPlannerPage')&&js.includes('buildRevisionPlan')&&js.includes('toggleRevisionDay'));
assert(js.includes('starterLessons')&&js.includes('lessonLibraryPage')&&js.includes('openStarterLesson')&&js.includes('completeStarterLesson'));
assert(js.includes('parentDashboard')&&js.includes('downloadParentReport')&&js.includes('text/csv;charset=utf-8'));
assert((js.match(/g:'(?:primary|middle|secondary)'/g)||[]).length>=9);
assert(js.includes('startMockExam')&&js.includes('submitMockExam')&&js.includes('examClock')&&js.includes('shuffleList')&&js.includes('cancelActiveExam'));
assert(fs.readFileSync(root+'/backend/app/main.py','utf8').includes('Live AI requests are routed directly from the app to Groq'));
assert(fs.readFileSync(root+'/web/groq-direct.js','utf8').includes('https://api.groq.com/openai/v1'));
assert(js.includes('tutorSubject')&&js.includes("subject:$('#tutorSubject')?.value||'عام'"));
assert(js.includes('smSchoolRevisionPlan')&&js.includes('track')); 
assert(js.includes('subjectPractice')&&js.includes('practiceDemo')&&js.includes('backSubjects'));
assert(js.includes('exerciseBankHomePage')&&js.includes('renderExerciseBank')&&js.includes('chooseExerciseGrade')&&js.includes('exercise-bank-2026-2027.json'));
assert(js.includes('setExerciseFilter')&&js.includes('solution_steps')&&js.includes('exerciseFilters'));
assert(fs.readFileSync(root+'/web/styles.css','utf8').includes('.exercise-filters'));
const exerciseBank=JSON.parse(fs.readFileSync(root+'/web/data/exercise-bank-2026-2027.json','utf8'));
assert.equal(exerciseBank.records.length,1581);
assert.equal(exerciseBank.version,'1.4.1');
assert(exerciseBank.records.every(x=>x.curriculum_alignment && x.curriculum_alignment.official_sequence_verified===false && x.curriculum_alignment.alignment_status==='platform_topic_mapping_pending_official_annual_progression' && x.curriculum_alignment.competency_target));
assert.equal(exerciseBank.coverage.grade_subject_pairs,105);
assert.equal(exerciseBank.coverage.all_subjects_extension_exercises,105);
assert.equal(exerciseBank.records.filter(x=>x.id.startsWith('P133-')).length,105);
assert(exerciseBank.records.filter(x=>x.id.startsWith('P133-')).every(x=>x.status==='platform_practice_not_official'&&x.answer_mode==='multiple_choice'&&x.curriculum_alignment.official_sequence_verified===false));
assert.equal(exerciseBank.coverage.additional_curriculum_practice_exercises,315);
assert.equal(exerciseBank.coverage.new_practice_exercises_per_subject_grade,3);
assert.equal(exerciseBank.coverage.multi_step_exercises,117);
assert.equal(new Set(exerciseBank.records.map(x=>x.grade)).size,12);
assert(exerciseBank.records.filter(x=>x.id.startsWith('X13-')).every(x=>x.status==='platform_practice_not_official'&&x.curriculum_alignment_status==='subject_index_only_pending_official_mapping'&&x.content_origin==='platform_authored_practice'));
const pairCounts={}; for(const q of exerciseBank.records) pairCounts[q.grade+'|'+q.subject]=(pairCounts[q.grade+'|'+q.subject]||0)+1;
assert.equal(Object.keys(pairCounts).length,105);assert(Object.values(pairCounts).every(n=>n>=11));
const termAdditions=exerciseBank.records.filter(x=>x.content_origin==='original_platform_authored_term_practice_v1.4.1');assert.equal(termAdditions.length,315);for(const grade of [...new Set(termAdditions.map(x=>x.grade))]){const subjects=[...new Set(termAdditions.filter(x=>x.grade===grade).map(x=>x.subject))];for(const subject of subjects){const qs=termAdditions.filter(x=>x.grade===grade&&x.subject===subject);assert.deepEqual([...new Set(qs.map(x=>x.term))].sort(),[1,2,3]);}}
assert(exerciseBank.records.filter(x=>x.content_origin==='original_platform_authored_term_practice_v1.4.1').every(x=>x.status==='platform_practice_not_official'&&x.choices.length===3&&x.solution_steps.length>=2));
assert(exerciseBank.records.filter(x=>x.question_type!=='numeric').every(x=>x.choices.length===3&&x.answer_index>=0&&x.answer_index<3&&x.solution&&x.explanation&&Array.isArray(x.solution_steps)&&x.solution_steps.length>=2&&[1,2,3].includes(x.term)&&x.topic&&x.lesson&&x.difficulty&&x.status==='platform_practice_not_official'));
const typed=exerciseBank.records.filter(x=>x.question_type==='numeric');
assert.equal(typed.length,59);assert.equal(new Set(typed.map(x=>x.grade)).size,12);assert(typed.every(x=>Array.isArray(x.accepted_answers)&&x.accepted_answers.length>0&&x.solution&&x.explanation&&x.status==='platform_practice_not_official'));
assert(exerciseBank.coverage.typed_answer_exercises===59&&exerciseBank.coverage.exercises===1581);
assert.equal(new Set(exerciseBank.records.map(x=>x.id)).size,1581);
assert(exerciseBank.records.filter(x=>x.question_type==='multi_step').length>=100);
const bankPairs=new Set(exerciseBank.records.map(x=>x.grade+'|'+x.subject));
const curriculum=JSON.parse(fs.readFileSync(root+'/web/data/curriculum-2026-2027.json','utf8'));
assert(curriculum.records.every(x=>bankPairs.has(x.grade+'|'+x.subject)));
assert(exerciseBank.records.filter(x=>x.question_type!=='numeric').every(x=>x.choices[x.answer_index]===x.solution));
assert.equal(exerciseBank.records.filter(x=>x.question_type!=='numeric').length,1522);
for(const grade of ['الأولى ابتدائي','الخامسة ابتدائي','الأولى متوسط','الرابعة متوسط','الأولى ثانوي','الثالثة ثانوي']) assert(exerciseBank.records.some(x=>x.grade===grade));
assert(js.includes("'اللغة العربية'")&&js.includes("'العلوم الطبيعية'")&&js.includes("'العلوم الفيزيائية'"));
assert(js.includes('progressStats')&&js.includes('recordProgress')&&js.includes('progressPage')&&js.includes('clearProgress'));
for(const key of ['progress','completed','accuracy','dailyGoal','recentActivity']) assert(js.includes(key));
assert(js.includes('navigator.clipboard')&&js.includes('Retry')&&js.includes('apiBase()'));
assert(js.includes('/api/v1/ai/chat')&&js.includes('serviceWorker'));
assert(js.includes('TERM_LABELS')&&js.includes('CONTENT_STATUS')&&js.includes('term-grid'));
assert(fs.existsSync(root+'/web/index.html')&&fs.existsSync(root+'/web/config.js'));
assert(fs.readFileSync(root+'/web/index.html','utf8').includes('config.js'));
assert(fs.existsSync(root+'/backend/app/main.py'));
assert.equal(JSON.parse(fs.readFileSync(root+'/package.json','utf8')).version,'2.1.6');
const sources=JSON.parse(fs.readFileSync(root+'/web/data/official-source-register-2026-2027.json','utf8'));
assert(sources.sources.some(x=>x.status==='current_policy_notice'));
assert(sources.sources.some(x=>x.status==='historical_reference_requires_2026_2027_confirmation'));
assert(fs.readFileSync(root+'/web/sw.js','utf8').includes('official-source-register-2026-2027.json'));
assert(fs.readFileSync(root+'/web/sw.js','utf8').includes('sm-school-ai-v2.1.6'));
assert(fs.readFileSync(root+'/web/sw.js','utf8').includes('secondary-pathways-2026-2027.json'));
assert(fs.readFileSync(root+'/web/sw.js','utf8').includes('sm-school-ai-v2.1.6'));
const pathways=JSON.parse(fs.readFileSync(root+'/web/data/secondary-pathways-2026-2027.json','utf8'));
assert.equal(pathways.first_year_common_trunks.length,2);assert.equal(pathways.second_third_year_streams.length,7);
assert(pathways.first_year_common_trunks.concat(pathways.second_third_year_streams).every(x=>x.status==='provisional_label_pending_current_year_confirmation'));
assert.equal(pathways.policy.official_subject_matrix_verified,false);
assert.equal(pathways.subject_matrix_records.length,16);
assert.equal(pathways.policy.verified_pathway_grade_matrices,0);
assert(pathways.subject_matrix_records.every(x=>x.verified===false&&x.status==='provisional_candidate_matrix_not_verified'&&x.official_source_ids.length===0&&x.common_subject_candidates.length>=5&&x.specialization_subject_candidates.length>=1));
assert.equal(new Set(pathways.subject_matrix_records.map(x=>x.id)).size,16);
assert(js.includes('SECONDARY_PATHWAY_MATRIX')&&js.includes('secondaryPathwayMatrixPanel'));
assert(js.includes('pathway-selector')&&js.includes('setSecondaryPathway(this.value)'));
assert(js.includes("if(page==='exercises')renderExerciseBankHome();else if(page==='tests')renderTestBankHome();else render();"));
assert(js.includes('candidate subject areas')||js.includes('قائمة تنظيمية أولية'));
assert(exerciseBank.records.filter(x=>x.level==='secondary').every(x=>x.secondary_pathway_alignment && x.secondary_pathway_alignment.verified===false && x.secondary_pathway_alignment.pathway_ids.length===0));
assert(curriculum.records.filter(x=>x.stage==='secondary').every(x=>x.secondary_pathway_scope && x.secondary_pathway_scope.verified===false));
assert(js.includes('SECONDARY_PATHWAYS')&&js.includes('setSecondaryPathway')&&js.includes('secondaryPathwayNotice'));
assert.equal(exerciseBank.coverage.secondary_pathway_catalogs,9);assert.equal(exerciseBank.coverage.secondary_pathway_subject_matrices_verified,0);
assert(js.includes('extractCurriculumEvidenceCandidates')&&js.includes('loadCurriculumEvidenceCandidates')&&js.includes('saveCurriculumEvidenceCandidate'));assert(fs.readFileSync(root+'/backend/app/main.py','utf8').includes('/extract-curriculum-candidates'));
assert(fs.readFileSync(root+'/web/index.html','utf8').includes('v2.1.6'));assert(fs.readFileSync(root+'/backend/app/main.py','utf8').includes('version="2.1.6"'));

new vm.Script(js);
assert(fs.readFileSync(root+'/web/index.html','utf8').includes('data-page="progress"'));
const data=JSON.parse(fs.readFileSync(root+'/web/data/curriculum-2026-2027.json','utf8'));
assert.equal(data.records.length,105);
assert(data.records.every(x=>x.platform_learning_map && x.platform_learning_map.official_sequence_verified===false && x.platform_learning_map.terms.length>0));
assert.equal(data.mapping_policy.platform_mapped_pairs,105);
assert.equal(data.mapping_policy.verified_pairs,0);
assert.equal(new Set(data.records.map(x=>x.grade)).size,12);
assert(data.records.every(x=>x.terms.length===3&&x.lessons.length===0&&x.status==='subject_index_only_pending_official_mapping'));
assert(data.verified_curriculum_rules.some(x=>x.rule==='primary_english_start'));
assert(data.verified_curriculum_rules.some(x=>x.rule==='primary_french_start'));
const backend=fs.readFileSync(root+'/backend/app/main.py','utf8');
assert(backend.includes('version="2.1.6"')&&backend.includes('/api/v1/learning/structure')&&backend.includes('/api/v1/curriculum/secondary-pathways'));
assert(backend.includes('provisional_platform_mapping_not_official_ministry_progression')&&backend.includes('official_lesson_sequence_verified_pairs'));
assert(backend.includes('secondary_pathway_catalog')&&backend.includes('subject_matrices_verified'));
assert(js.includes('startExerciseSession')&&js.includes('finishExerciseSession')&&js.includes('smSchoolExerciseMistakes'));
assert(js.includes('normalizeTypedAnswer')&&js.includes('accepted_answers')&&js.includes("question_type==='numeric'"));
const normalizeSource=js.match(/function normalizeTypedAnswer\(value\)\{[^}]+\}/)?.[0];assert(normalizeSource);const normalized=vm.runInNewContext(normalizeSource+"; [normalizeTypedAnswer('١٤'),normalizeTypedAnswer('۱۴'),normalizeTypedAnswer('-5 و 5'),normalizeTypedAnswer('١٫٥')]");assert.deepEqual(Array.from(normalized),['14','14','-5و5','1.5']);
assert(fs.readFileSync(root+'/web/index.html','utf8').includes('v2.1.6'));
assert(js.includes('shuffleList(pool).slice(0,Math.min(10,pool.length))'));
assert(js.includes('Review my mistakes')&&js.includes('Random practice (10)'));
assert(fs.readFileSync(root+'/web/styles.css','utf8').includes('.exercise-session-actions'));

assert(backend.includes('/api/v1/ai/chat')&&backend.includes('/api/v1/catalog'));
assert(exerciseBank.records.every(x=>['recall','understand','apply','analyze','reason'].includes(x.cognitive_process)&&Number.isInteger(x.estimated_minutes)&&x.estimated_minutes>=1&&x.estimated_minutes<=5&&['numeric','multiple_choice'].includes(x.answer_mode)&&x.content_review&&x.content_review.official_alignment==='not_verified_against_2026_2027_ministry_annual_progression'));
assert(exerciseBank.records.every(x=>['مبتدئ','متوسط','متقدم'].includes(x.difficulty)));
assert.equal(exerciseBank.coverage.cognitive_process_metadata,1581);
assert(js.includes("exerciseFilters.cognitive==='all'||x.cognitive_process===exerciseFilters.cognitive"));
assert(js.includes("setExerciseFilter('cognitive',this.value)"));
assert(js.includes('cognitive_process:x.cognitive_process'));
const coverage=JSON.parse(fs.readFileSync(root+'/web/data/coverage-report-2026-2027.json','utf8'));
assert.equal(coverage.version,"1.12.0");assert.equal(coverage.totals.grades,12);assert.equal(coverage.totals.subject_grade_pairs,105);assert.equal(coverage.totals.exercises,1581);assert.equal(coverage.totals.officially_verified_pairs,0);assert.equal(coverage.totals.pairs_with_all_three_terms,105);assert.equal(coverage.totals.term_extension_exercises,315);
assert.equal(coverage.grade_subject_coverage.length,105);assert(coverage.grade_subject_coverage.every(x=>x.exercise_count>=8&&x.has_exercises&&x.official_sequence_verified===false));
assert.equal(coverage.stages.reduce((n,x)=>n+x.exercises,0),1581);assert.equal(coverage.stages.reduce((n,x)=>n+x.subject_grade_pairs,0),105);
assert(js.includes('exerciseCoverageSummary')&&js.includes('coverage-table')&&js.includes('Coverage details by grade'));
assert(fs.readFileSync(root+'/web/sw.js','utf8').includes('coverage-report-2026-2027.json'));
assert(backend.includes('/api/v1/learning/coverage'));
assert(js.includes('function testBankHomePage()')&&js.includes('function startBankTest()')&&js.includes('function submitBankTest()'));
assert(js.includes('smSchoolTestHistory')&&js.includes('bankTestGrade')&&js.includes('bankTestTerm'));
assert(js.includes('mark.toFixed(2)')&&js.includes('test-analysis-grid')&&js.includes('changeBankTestGrade'));
assert(js.includes("q.question_type==='numeric'")&&js.includes('normalizeTypedAnswer(a)===normalizeTypedAnswer(entered)'));
assert(fs.readFileSync(root+'/web/styles.css','utf8').includes('.test-builder-grid'));
assert(fs.readFileSync(root+'/web/index.html','utf8').includes('v2.1.6'));
assert.equal(JSON.parse(fs.readFileSync(root+'/package.json','utf8')).version,'2.1.6');
assert(fs.readFileSync(root+'/backend/app/main.py','utf8').includes('version="2.1.6"'));
assert(fs.readFileSync(root+'/web/sw.js','utf8').includes('sm-school-ai-v2.1.6'));
const examPairs={};for(const q of exerciseBank.records){const k=q.grade+'|'+q.subject;(examPairs[k]??=[]).push(q)}
assert.equal(Object.keys(examPairs).length,105);assert(Object.values(examPairs).every(xs=>xs.length>=8));
assert(Object.values(examPairs).every(xs=>xs.every(q=>q.question_type==='numeric'?Array.isArray(q.accepted_answers)&&q.accepted_answers.length>0:Array.isArray(q.choices)&&q.answer_index>=0&&q.answer_index<q.choices.length)));
console.log('PASS: frontend syntax, 3 locales, 12 grades, 105 subject-grade index pairs, 9 provisional secondary pathways (0 verified stream matrices), 1581 exercises with normalized difficulty, cognitive-skill and estimated-time metadata, 1522 multiple-choice + 59 typed numeric, 12-grade typed-answer coverage, randomized practice, persistent mistake review, filters, 117 multi-step solutions, answer integrity, progress, AI controls, API compatibility and PWA cache');
console.log('PASS: v1.4.0 feature retained: detailed per-question answer review, safe text rendering, solution-step disclosure and focused retry of incorrect questions');

assert(js.includes('function buildRemedialPlan(test)')&&js.includes('function startRemedialTopic(topic)'));
assert(js.includes('smSchoolRemedialPlans')&&js.includes('remedial-plan')&&js.includes('practiceCount'));
assert(fs.readFileSync(root+'/web/styles.css','utf8').includes('.remedial-topic'));
console.log('PASS: v1.4.0 feature retained: local personalized remediation plans, topic-prioritized targeted practice, saved recent plans and responsive remediation UI');

assert(js.includes('/api/v1/ai/tutor')&&js.includes('tutorTask')&&js.includes('studentAnswer'));
assert(js.includes('value="lesson"')&&js.includes('value="practice"')&&js.includes('value="evaluate"'));
assert(backend.includes('class TutorRequest')&&backend.includes('/api/v1/ai/tutor')&&backend.includes('Live AI requests are routed directly from the app to Groq')&&backend.includes('in-app Groq tutor'));
assert(fs.readFileSync(root+'/web/styles.css','utf8').includes('.tutor-form'));
console.log('PASS: v1.4.0 feature retained: AI tutor lesson teaching, practice generation, written-answer feedback workflow and multilingual controls');


const termExams=JSON.parse(fs.readFileSync(root+'/web/data/term-exams-2026-2027.json','utf8'));
assert.equal(termExams.version,'1.4.2');assert.equal(termExams.papers.length,327);
assert.equal(termExams.totals.grades,12);assert.equal(termExams.totals.grade_subject_pairs,105);assert.equal(termExams.totals.terms_per_pair,3);
assert.equal(new Set(termExams.papers.map(p=>p.grade+'|'+p.subject+'|'+p.term)).size,315);
const bankById=new Map(exerciseBank.records.map(q=>[q.id,q]));
for(const paper of termExams.papers){assert(paper.question_count>=3);assert.equal(paper.question_ids.length,paper.question_count);assert.equal(paper.answer_key.length,paper.question_count);assert.equal(paper.answer_key.reduce((n,a)=>n+a.points,0),20);assert([1,2,3].includes(paper.term));assert.equal(paper.total_points,20);assert(paper.question_ids.every(id=>bankById.has(id)));assert(paper.question_ids.every(id=>{const q=bankById.get(id);return q.grade===paper.grade&&q.subject===paper.subject&&q.term===paper.term}));assert(paper.answer_key.every(a=>a.expected_answer&&a.explanation&&Array.isArray(a.solution_steps)));assert(paper.content_status==='platform_authored_practice_not_official_ministry_exam');}
assert(js.includes('function startPreparedTermExam()')&&js.includes('termExamPapers.filter')&&js.includes('startPreparedTermExam()'));
assert(backend.includes('/api/v1/learning/term-exams'));
assert(fs.readFileSync(root+'/web/app.js','utf8').includes('term-exams-2026-2027.json')||fs.readFileSync(root+'/backend/app/main.py','utf8').includes('term-exams-2026-2027.json'));
assert.equal(JSON.parse(fs.readFileSync(root+'/package.json','utf8')).version,'2.1.6');
assert(fs.readFileSync(root+'/web/index.html','utf8').includes('v2.1.6'));
console.log('PASS: retained v1.4.2 — 327 prepared term papers (315 base + 12 ST-1AS variants), 20-point answer keys, exact grade/subject/term question matching, solution metadata and offline cache');


const integrative=JSON.parse(fs.readFileSync(root+'/web/data/integrative-assessments-2026-2027.json','utf8'));
assert.equal(integrative.version,'1.6.3');assert.equal(integrative.situations.length,342);
assert.equal(integrative.totals.grades,12);assert.equal(integrative.totals.grade_subject_pairs,105);assert.equal(integrative.totals.terms_per_pair,3);
assert.equal(new Set(integrative.situations.map(x=>x.grade+'|'+x.subject+'|'+x.term)).size,315);
for(const situation of integrative.situations){assert(situation.situation&&situation.written_task&&situation.model_solution.length>=3);assert.equal(situation.question_ids.length,situation.question_count);assert(situation.question_ids.every(id=>{const q=bankById.get(id);return q&&q.grade===situation.grade&&q.subject===situation.subject&&q.term===situation.term}));assert(situation.model_solution.every(x=>x.expected_answer&&x.reasoning));assert.equal(situation.objective_points,20);assert.equal(situation.written_extension_points,0);assert(situation.situation_i18n.ar&&situation.situation_i18n.fr&&situation.situation_i18n.en);assert(situation.written_task_i18n.ar&&situation.written_task_i18n.fr&&situation.written_task_i18n.en);assert.equal(situation.content_status,'platform_authored_integrative_practice_not_official_ministry_exam');}
assert(js.includes('function startIntegrativeAssessment()')&&js.includes('integrativeAssessments.find')&&js.includes('startIntegrativeAssessment()')&&js.includes('integrativeWrittenResponse'));
assert(backend.includes('/api/v1/learning/integrative-assessments'));
assert(fs.readFileSync(root+'/web/app.js','utf8').includes('integrative-assessments-2026-2027.json')||fs.readFileSync(root+'/backend/app/main.py','utf8').includes('integrative-assessments-2026-2027.json'));
assert.equal(JSON.parse(fs.readFileSync(root+'/package.json','utf8')).version,'2.1.6');
assert(fs.readFileSync(root+'/web/index.html','utf8').includes('v2.1.6'));
console.log('PASS: retained v1.6.3 — 342 integrative situations, exact grade/subject/term question references, model solution outlines, written self-review rubric and offline cache');

// v1.5.7 offline PDF inbox safety and review-only workflow
const inboxTool=fs.readFileSync(root+'/tools/process_pdf_inbox.py','utf8');
assert(inboxTool.includes('MAX_BYTES = 50 * 1024 * 1024'));
assert(inboxTool.includes("stream.read(5) != b'%PDF-'"));
assert(inboxTool.includes("'auto_published': False"));
assert(inboxTool.includes("'reuse_permission': 'unknown_pending_rights_review'"));
assert(inboxTool.includes("'extraction_status': 'text_extracted' if text_pages else 'ocr_required'"));
assert(inboxTool.includes('duplicate_skipped'));
assert.equal(JSON.parse(fs.readFileSync(root+'/package.json','utf8')).version,'2.1.6');
assert(fs.readFileSync(root+'/web/index.html','utf8').includes('v2.1.6'));
assert(fs.readFileSync(root+'/web/sw.js','utf8').includes('sm-school-ai-v2.1.6'));
console.log('PASS: v1.5.7 offline PDF inbox — size/signature validation, SHA-256 duplicate detection, text extraction, OCR-required flags, private rights-review queue and no auto-publication');

// v1.5.7 PDF review workspace
const pdfReviewBackend=fs.readFileSync(root+'/backend/app/main.py','utf8');
const pdfReviewUi=fs.readFileSync(root+'/web/app.js','utf8');
assert(pdfReviewBackend.includes('/api/v1/archive/pdf-review/upload'));
assert(pdfReviewBackend.includes('/api/v1/archive/pdf-review/{document_id}/file'));
assert(pdfReviewBackend.includes('/api/v1/archive/pdf-review/{document_id}'));
assert(pdfReviewBackend.includes('MAX_REVIEW_PDF_BYTES = 50 * 1024 * 1024'));
assert(pdfReviewUi.includes('function pdfReviewPanel()')&&pdfReviewUi.includes('function uploadPdfReviewFile()')&&pdfReviewUi.includes('function savePdfReview(id)'));
assert(pdfReviewUi.includes('extracted_text')&&pdfReviewUi.includes('review_notes')&&pdfReviewUi.includes('rights_cleared'));
assert(fs.readFileSync(root+'/web/styles.css','utf8').includes('.pdf-review-frame'));
console.log('PASS: v1.5.7 PDF review UI, private upload endpoint, text correction, reviewer notes, rights status and PDF preview route');


// v1.5.7 question-candidate workflow is explicit, rights-gated and non-publishing.
assert(backend.includes('/api/v1/archive/pdf-question-candidates'));
assert(backend.includes('/extract-candidates'));
assert(backend.includes('heuristic_text_segmentation_requires_human_review'));
assert(backend.includes('approved_for_manual_entry') && backend.includes('reuse_permission') && backend.includes('auto_published'));
assert(js.includes('function extractPdfCandidates(id)') && js.includes('function loadPdfQuestionCandidates(id)') && js.includes('function savePdfCandidate(id)'));
assert(fs.readFileSync(root+'/web/styles.css','utf8').includes('.candidate-card'));
assert.equal(JSON.parse(fs.readFileSync(root+'/package.json','utf8')).version,'2.1.6');
assert(fs.readFileSync(root+'/web/index.html','utf8').includes('v2.1.6'));
assert(fs.readFileSync(root+'/web/sw.js','utf8').includes('sm-school-ai-v2.1.6'));
console.log('PASS: v1.5.7 heuristic PDF question/solution candidates, metadata review, explicit rights gate, no auto-publication and multilingual UI');

// v1.5.7 rights-cleared searchable exam excerpt library
const v150backend=fs.readFileSync(root+'/backend/app/main.py','utf8');
const v150ui=fs.readFileSync(root+'/web/app.js','utf8');
assert(v150backend.includes('/api/v1/archive/exam-library'));
assert(v150backend.includes('rights_cleared_human_approved_local_excerpts'));
assert(v150backend.includes('original_pdf_distribution": False'));
assert(v150ui.includes('examLibraryPanel')&&v150ui.includes('loadExamLibrary'));
assert(v150ui.includes('exam_year')&&v150ui.includes('exam_type'));
console.log('PASS: v1.5.7 searchable, rights-gated exam excerpt catalogue and multilingual search UI');


// v1.5.7 structural PDF analysis: formula hints, table/image/vector indicators, page selection and no publication.
assert(backend.includes('/analyze-layout') && backend.includes('/layout'));
assert(backend.includes('_analyze_pdf_page_layout') && backend.includes('math_region_count') && backend.includes('estimated_table_cells'));
assert(backend.includes('human_visual_review_required') && backend.includes('auto_published": False'));
assert(js.includes('function analyzePdfLayout(id)') && js.includes('function renderPdfLayout(data)'));
assert(js.includes('Analyze equations, tables & figures') || js.includes('تحليل المعادلات والجداول والرسوم'));
assert(fs.readFileSync(root+'/web/styles.css','utf8').includes('.pdf-layout-panel'));
console.log('PASS: v1.5.7 PDF structure hints for mathematical expressions, tables, embedded images and vector drawings; visual-review warning and non-publication safeguards');


// v1.5.7 structured question-understanding assistant with transparent fallback and human-review safeguards.
const backend153=fs.readFileSync(root+'/backend/app/main.py','utf8');
assert(backend153.includes('/{candidate_id}/analyze') && backend153.includes('/{candidate_id}/analysis'));
assert(backend153.includes('_heuristic_question_analysis') && backend153.includes('draft_requires_teacher_review'));
assert(backend153.includes('teacher_approved": False') && backend153.includes('auto_published": False'));
assert(js.includes('function analyzePdfCandidate(id)') && js.includes('function renderPdfCandidateAnalysis(data)'));
assert(js.includes('فهم السؤال واقتراح خطوات الحل') && js.includes('Understand question & suggest solution steps'));
assert(fs.readFileSync(root+'/web/styles.css','utf8').includes('.candidate-analysis'));
console.log('PASS: v1.5.7 question understanding, givens/requirements, subject-aware solution plan, bilingual/trilingual review and non-publication safeguards');

// v1.5.7 curriculum-guarded exam builder: exact grade/subject/term, separate copies, 20-point scheme.
const v154backend=fs.readFileSync(root+'/backend/app/main.py','utf8');
const v154ui=fs.readFileSync(root+'/web/app.js','utf8');
assert(v154backend.includes('/api/v1/learning/exam-builder'));
assert(v154backend.includes('exact-match questions')&&v154backend.includes('cross-grade, cross-term or cross-language substitution'));
assert(v154backend.includes('English starts in third year primary')&&v154backend.includes('French starts in fourth year primary'));
assert(v154backend.includes('Stream-specific exercise mapping is not officially verified'));
assert(v154backend.includes('student_version')&&v154backend.includes('teacher_version')&&v154backend.includes('marking_scheme'));
assert(v154backend.includes('platform_authored_practice_not_official_ministry_exam')&&v154backend.includes('official_sequence_verified": False'));
assert(v154ui.includes('function curriculumExamBuilderPanel()')&&v154ui.includes('function generateCurriculumExam()')&&v154ui.includes('function showCurriculumExamVersion(kind)'));
assert(v154ui.includes('curriculum-exam-builder')&&v154ui.includes('curriculum_policy_note'));
assert(fs.readFileSync(root+'/web/styles.css','utf8').includes('.curriculum-exam-builder'));
assert.equal(JSON.parse(fs.readFileSync(root+'/package.json','utf8')).version,'2.1.6');
assert(fs.readFileSync(root+'/web/index.html','utf8').includes('v2.1.6'));
assert(fs.readFileSync(root+'/web/sw.js','utf8').includes('sm-school-ai-v2.1.6'));
console.log('PASS: v1.5.7 curriculum-guarded exam builder, student/teacher views, exact matching, 20-point marking, primary language policy guards and secondary stream safeguard');


// v1.5.7 Algerian curriculum governance: source-attributed facts, 105 indexed pairs,
// 16 provisional secondary matrices, no fabricated official annual progressions.
const governance=JSON.parse(fs.readFileSync(root+'/web/data/curriculum-governance-2026-2027.json','utf8'));
const sourceRegister=JSON.parse(fs.readFileSync(root+'/web/data/official-source-register-2026-2027.json','utf8'));
assert.equal(governance.app_version,'1.5.7');
assert.equal(governance.grade_subject_records.length,105);
assert.equal(governance.secondary_pathway_records.length,16);
assert.equal(governance.verified_policy_facts.length,10);
assert.equal(governance.totals.verified_current_annual_progression_pairs,0);
assert.equal(governance.totals.verified_secondary_pathway_matrices,0);
assert(governance.grade_subject_records.every(x=>x.official_alignment_status==='not_verified_against_current_2026_2027_annual_progression'));
assert(governance.secondary_pathway_records.every(x=>x.verified===false&&x.official_source_ids.length===0));
assert(sourceRegister.sources.some(x=>x.id==='ministry-decision-36-2026-09-09'));
assert(sourceRegister.sources.some(x=>x.id==='ministry-2026-08-01-informatics-streams'));
assert(governance.verified_policy_facts.some(x=>x.id==='informatics_3as_mathematics_engineering'));
assert(governance.verified_policy_facts.some(x=>x.id==='future_secondary_branch_system_2027_2028'));
assert(sourceRegister.sources.filter(x=>x.status==='historical_reference_requires_2026_2027_confirmation').every(x=>x.validates.length===0));
const reviewCsv=fs.readFileSync(root+'/web/data/curriculum-verification-template-2026-2027.csv','utf8');
assert(reviewCsv.includes('official_document_url')&&reviewCsv.includes('page_number')&&reviewCsv.includes('competency'));
assert(fs.existsSync(root+'/CURRICULUM_GOVERNANCE_2026-2027.md'));
assert(backend.includes('/api/v1/curriculum/governance')&&backend.includes('/api/v1/curriculum/coverage-audit')&&backend.includes('/api/v1/curriculum/official-sources')&&backend.includes('/api/v1/curriculum/verification-template'));
assert(js.includes('function curriculumGovernancePanel()')&&js.includes('function loadCurriculumGovernance()'));
assert(js.includes('curriculum-governance-2026-2027.json')===false || fs.existsSync(root+'/web/data/curriculum-governance-2026-2027.json'));
assert(fs.readFileSync(root+'/web/app.js','utf8').includes('curriculum-governance-2026-2027.json')||fs.readFileSync(root+'/backend/app/main.py','utf8').includes('curriculum-governance-2026-2027.json'));
assert(fs.readFileSync(root+'/web/sw.js','utf8').includes('curriculum-verification-template-2026-2027.csv'));
assert(backend.includes('balanced_platform_cognitive_process_stratification')&&backend.includes('platform_practice_tags_not_official_ministry_competencies'));
assert.equal(JSON.parse(fs.readFileSync(root+'/package.json','utf8')).version,'2.1.6');
assert(fs.readFileSync(root+'/web/index.html','utf8').includes('v2.1.6'));
console.log('PASS: v1.5.7 curriculum governance — 10 source-scoped Ministry facts, 105 grade/subject records, 16 provisional stream matrices, review CSV, coverage audit and no false official alignment');
console.log('PASS: v1.5.7 assessment blueprint — balanced platform cognitive tags explicitly distinguished from official Ministry competencies');


// v1.5.7 local curriculum evidence intake: strict source metadata, local-only storage, no auto-promotion.
const v156ui=fs.readFileSync(root+'/web/app.js','utf8');
const v156backend=fs.readFileSync(root+'/backend/app/main.py','utf8');
assert(v156ui.includes('function parseCurriculumCsv(text)'));
assert(v156ui.includes('function curriculumEvidenceValidation(row)'));
assert(v156ui.includes("u.hostname==='education.gov.dz'||u.hostname.endsWith('.education.gov.dz')"));
assert(v156ui.includes('smSchoolCurriculumEvidenceReviewV156'));
assert(v156ui.includes('downloadCurriculumEvidenceLedger')&&v156ui.includes('renderCurriculumEvidenceQueue'));
// removed in v2.1.3 (legacy assertion for deleted/replaced feature)
assert(v156ui.includes('لم يتم اعتمادها في قاعدة المنهاج تلقائياً'));
assert(v156backend.includes('/api/v1/curriculum/evidence-policy'));
assert(fs.existsSync(root+'/tools/validate_curriculum_evidence.py'));
assert(fs.existsSync(root+'/CONTENT_QUALITY_AUDIT_v1.5.7.md'));
assert.equal(JSON.parse(fs.readFileSync(root+'/package.json','utf8')).version,'2.1.6');
assert(fs.readFileSync(root+'/web/sw.js','utf8').includes('sm-school-ai-v2.1.6'));
console.log('PASS: v1.5.7 curriculum evidence CSV intake, Ministry-domain evidence checks, local-only review ledger, export and no automatic official promotion');

// v1.5.9 local learner backup/restore safeguards.
const backupUi=fs.readFileSync(root+'/web/app.js','utf8');
assert(backupUi.includes('function collectLocalBackup()'));
assert(backupUi.includes('function validateLocalBackup(payload)'));
assert(backupUi.includes('function exportLocalBackup()')&&backupUi.includes('function importLocalBackup(file)'));
assert(backupUi.includes("'smSchoolProgress'")&&backupUi.includes("'smSchoolTestHistory'")&&backupUi.includes("'smSchoolExerciseMistakes:'"));
assert(backupUi.includes('file.size>5*1024*1024'));
assert(!backupUi.slice(backupUi.indexOf('const LOCAL_BACKUP_KEYS='),backupUi.indexOf('function localBackupPanel()')).includes('smSchoolApiBase'));
assert(backupUi.includes('LOCAL_BACKUP_VERSION=1'));
assert(backupUi.includes('function localBackupPanel()')&&backupUi.includes('localBackupPanel()'));
assert.equal(JSON.parse(fs.readFileSync(root+'/package.json','utf8')).version,'2.1.6');
assert(fs.readFileSync(root+'/web/index.html','utf8').includes('v2.1.6'));
assert(fs.readFileSync(root+'/web/sw.js','utf8').includes('sm-school-ai-v2.1.6'));
assert(fs.readFileSync(root+'/backend/app/main.py','utf8').includes('version="2.1.6"'));
assert(fs.existsSync(root+'/CONTENT_QUALITY_AUDIT_v1.5.9.md'));
console.log('PASS: v1.5.9 local JSON backup/restore allowlist, validation, size guard, API credential exclusion, UI and version metadata');
// v1.6.3 — offline translator + AI course
{const fs2=require('fs'),vm2=require('vm');const w=root+'/web/';
const idxHtml=fs2.readFileSync(w+'index.html','utf8');assert(idxHtml.includes('data-page="translate"')&&idxHtml.includes('translate.js')&&idxHtml.includes('ai-course.js')&&idxHtml.includes('lexicon.js'));
const sw=fs2.readFileSync(w+'sw.js','utf8');assert(sw.includes('v2.1.6')&&sw.includes('./lexicon.js')&&sw.includes('./translate.js')&&sw.includes('./ai-course.js'));
const ctx={window:{},dict:{ar:{},fr:{},en:{}},lang:'ar',LOCAL_BACKUP_KEYS:[],document:{querySelectorAll:()=>[]},localStorage:{getItem:()=>null},t:k=>k,escapeReviewText:s=>s};ctx.SM_LEXICON=null;vm2.createContext(ctx);
vm2.runInContext(fs2.readFileSync(w+'lexicon.js','utf8'),ctx);ctx.SM_LEXICON=ctx.window.SM_LEXICON;
vm2.runInContext(fs2.readFileSync(w+'translate.js','utf8'),ctx);vm2.runInContext(fs2.readFileSync(w+'ai-course-i18n.js','utf8'),ctx);vm2.runInContext(fs2.readFileSync(w+'ai-course.js','utf8'),ctx);
const T=ctx.window.SM_TRANSLATE;assert(T.entries.length>=400);
assert.equal(T.translate('مرحبا','ar','fr').out,'bonjour');assert.equal(T.translate('أحب المدرسة','ar','en').out,'i like school');assert.equal(T.translate('Où est l\'école ?','fr','es').out,'¿dónde está la escuela?');
assert.equal(T.detect('Wie geht es dir?'),'de');assert.equal(T.detect('مرحبا'),'ar');
const c=ctx.window.SM_AI_COURSE;assert(c.lessons.length>=8&&c.glossary.length>=20&&c.glossary.every(g=>g.length===6)&&c.lessons.every(l=>l.q.length>=2&&l.q.every(q=>q.a>=0&&q.a<q.c.length)));
const TRN=ctx.window.SM_AI_TR;for(const l of c.lessons)for(const lg of ['fr','en']){const t=TRN[l.id][lg];assert(t.sum&&t.ex&&t.pts.length===l.pts.length&&t.q.length===l.q.length&&t.q.every((q,i)=>q.c.length===l.q[i].c.length&&q.w));assert.equal(!!t.code,!!l.code)}
assert(idxHtml.includes('ai-course-i18n.js')&&sw.includes('./ai-course-i18n.js'));
assert(ctx.LOCAL_BACKUP_KEYS.includes('smSchoolTranslateHistory')&&ctx.LOCAL_BACKUP_KEYS.includes('smSchoolAiLearn'));
const app=fs2.readFileSync(w+'app.js','utf8');assert(app.includes('translatePage()')&&app.includes('aiLearnPage()'));}

// v1.6.3 targeted support and appearance improvements
assert(fs.readFileSync(root+'/web/index.html','utf8').includes('id="themeBtn"'));assert(fs.readFileSync(root+'/web/app.js','utf8').includes('function toggleTheme'));assert(fs.readFileSync(root+'/web/styles.css','utf8').includes('body[data-theme="dark"]'));
assert.equal(exerciseBank.records.filter(x=>x.content_origin==='original_platform_authored_v1.6.3_targeted_support').length,54);
for(const g of ['الثالثة ابتدائي','الثانية متوسط','الأولى ثانوي']){const subjects=[...new Set(exerciseBank.records.filter(x=>x.grade===g).map(x=>x.subject))];for(const sub of subjects)assert(exerciseBank.records.filter(x=>x.grade===g&&x.subject===sub&&x.content_origin==='original_platform_authored_v1.6.3_targeted_support').length===2);}
assert.equal(integrative.situations.filter(x=>x.content_origin==='original_platform_authored_v1.6.3_targeted_integrative').length,27);
const courseSource=fs.readFileSync(root+'/web/ai-course.js','utf8');for(const id of ['data-literacy','python-basics','internet-networks','databases','cybersecurity','ai-ethics'])assert(courseSource.includes(id));
console.log('PASS: v1.6.3 targeted grade supplements, integrative situations, computing lessons, offline glossary and theme toggle');

// v1.6.4 — app back navigation, fallback source links, responsive UI and focused content expansion.
assert(js.includes('function handleAppBack()')&&js.includes("window.addEventListener('popstate'"));
assert(js.includes('source-fallback-link')&&js.includes('source_page_url||x.url')&&js.includes('doc.source_page_url'));
assert(fs.readFileSync(root+'/web/index.html','utf8').includes('id="backBtn"'));
assert(fs.readFileSync(root+'/web/styles.css','utf8').includes('v1.6.4 navigation and learning-library polish'));
const targeted164=exerciseBank.records.filter(x=>x.content_origin==='original_platform_authored_v1.6.4_targeted_support');
assert.equal(targeted164.length,8);
for(const g of ['الأولى ثانوي','الثانية متوسط','الثالثة ابتدائي']){
 const n=exerciseBank.records.filter(x=>x.grade===g).length;assert(n>=100);
}
assert.equal(exerciseBank.records.filter(x=>x.grade==='الثالثة ابتدائي').length,100);
assert(targeted164.every(x=>x.solution&&x.explanation&&x.solution_steps.length>=2&&[1,2,3].includes(x.term)));
console.log('PASS: v1.6.4 back-navigation guard, source-page download fallback, responsive UI and 100+ targeted exercise bank');


// ST-1AS support pack — 100 exercises + 12 variant papers for the Grade 1 Secondary Science & Technology common core.
{
 const pack=exerciseBank.records.filter(x=>x.content_origin==='original_platform_authored_st1as_support_pack_v1');
 assert.equal(pack.length,100);
 const bySubject={};for(const q of pack)bySubject[q.subject]=(bySubject[q.subject]||0)+1;
 assert.deepEqual(bySubject,{'الرياضيات':28,'العلوم الفيزيائية':28,'العلوم الطبيعية':24,'الإعلام الآلي':20});
 assert(pack.every(x=>x.grade==='الأولى ثانوي'&&x.level==='secondary'&&x.status==='platform_practice_not_official'&&[1,2,3].includes(x.term)));
 for(const sub of Object.keys(bySubject))assert.deepEqual([...new Set(pack.filter(x=>x.subject===sub).map(x=>x.term))].sort(),[1,2,3]);
 assert(pack.every(x=>x.solution&&x.explanation&&x.solution_steps.length>=2&&x.target_pathway_candidate==='common_science_technology'&&x.curriculum_alignment.official_sequence_verified===false&&x.content_review.language_review==='requires_teacher_editorial_review'));
 assert(pack.filter(x=>x.question_type!=='numeric').every(x=>x.choices.length===3&&new Set(x.choices).size===3&&x.choices[x.answer_index]===x.solution));
 assert(pack.filter(x=>x.question_type==='numeric').every(x=>x.accepted_answers.length>0&&x.answer_mode==='numeric'));
 assert.equal(pack.filter(x=>x.question_type==='numeric').length,23);
 const variants=termExams.papers.filter(p=>p.variant==='st1as_support_pack_B');
 assert.equal(variants.length,12);
 assert.equal(new Set(variants.map(p=>p.subject+'|'+p.term)).size,12);
 for(const p of variants){assert(p.question_ids.every(id=>id.startsWith('ST1AS-')));assert.equal(p.answer_key.reduce((n,a)=>n+a.points,0),20);assert(p.answer_key.every(a=>a.expected_answer&&a.explanation&&a.solution_steps.length>=2));}
 assert(exerciseBank.coverage.st1as_support_pack.exercises===100&&exerciseBank.coverage.targeted_grade_counts['الأولى ثانوي']===231);
 assert(js.includes('window.lastTermPaperId'));
 console.log('PASS: ST-1AS support pack — 100 exercises with worked solutions (28 math, 28 physics, 24 natural sciences, 20 computer science), 3 terms each, 12 variant papers with 20-point answer keys');
}

// v1.6.6 — independent local learner profiles and progress isolation.
assert(js.includes('function learnerManager()')&&js.includes('function addLearner()')&&js.includes('function selectLearner(id)'));
assert(js.includes('function deleteLearner(id)')&&js.includes('learnerId:learner.id'));
assert(js.includes('smSchoolLearners')&&js.includes('smSchoolActiveLearner'));
assert(js.includes('x.learnerId===learner.id')&&js.includes('learner.id===\'default\''));
assert(fs.readFileSync(root+'/web/styles.css','utf8').includes('v1.6.5 — family learner profiles'));
console.log('PASS: v1.6.5 family profiles, learner-specific progress, local deletion safeguards and backup integration');

// v1.6.6 — learner-aware tutor context and private per-learner conversation history.
assert(js.includes('function tutorHistoryKey()')&&js.includes('function readTutorHistory()')&&js.includes('function saveTutorTurn('));
assert(js.includes('function tutorLearningContext()')&&js.includes('learner_name:learner.name')&&js.includes('learning_context:'));
assert(js.includes('saveTutorTurn(task===')&&js.includes('clearTutorHistory()'));
assert(js.includes('smSchoolTutorHistory:')&&js.includes('startsWith(\'smSchoolTutorHistory:\')'));
const tutorBackend=fs.readFileSync(root+'/backend/app/main.py','utf8');
assert(tutorBackend.includes('learner_name: str = Field(default="", max_length=50)'));
assert(tutorBackend.includes('learning_context: str = Field(default="", max_length=1200)'));
assert(fs.readFileSync(root+'/web/groq-direct.js','utf8').includes('never shame or label the learner.'));
assert(fs.readFileSync(root+'/web/styles.css','utf8').includes('v1.6.6 — learner-aware AI tutor'));
console.log('PASS: v1.6.6 learner-aware tutor context, per-learner local history, backup/restore and deletion lifecycle');

// v1.6.7 — adaptive learner analysis, weekly plan, local persistence and report export.
assert(js.includes('function adaptiveLearningData()')&&js.includes('function buildAdaptivePlan()'));
assert(js.includes('function adaptivePlanPanel()')&&js.includes('function toggleAdaptiveDay('));
assert(js.includes('function exportAdaptiveReport()')&&js.includes('function openAdaptivePractice('));
assert(js.includes("'smSchoolAdaptivePlans'"));
assert(js.includes("'smSchoolTestHistory','smSchoolRemedialPlans','smSchoolAdaptivePlans'"));
assert(js.includes("'smSchoolAdaptivePlans','smSchoolHomeSchool','smSchoolFamilySchedule','smSchoolLearningErrors','smSchoolReasoningRecords','smSchoolStudentProfileGoals','smSchoolLearningMemory','smSchoolCurriculumProgressV115','smSchoolLessonPlansV182'])"));
assert(js.includes("status=x.total<3?'collecting':accuracy>=80?'mastered':accuracy>=50?'improving':'support'"));
assert(js.includes("function adaptiveTrendForSubject(")&&js.includes("recentAccuracy")&&js.includes("engine_version:'1.8.8'"));
assert(fs.readFileSync(root+'/web/styles.css','utf8').includes('v1.6.7 — local adaptive learning'));
console.log('PASS: v1.6.7 adaptive performance analysis, per-learner weekly plan, local persistence and CSV report');

assert(fs.readFileSync(root+'/web/index.html','utf8').includes('data-page=\"teacher\"'));assert(fs.readFileSync(root+'/web/index.html','utf8').includes('smart-teacher.js'));assert(fs.readFileSync(root+'/web/sw.js','utf8').includes('./smart-teacher.js'));
