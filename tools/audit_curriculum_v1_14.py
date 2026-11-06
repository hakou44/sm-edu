#!/usr/bin/env python3
"""Deterministic curriculum-data audit. It never upgrades platform mappings to official status."""
import json, re, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'web/data'
GOV=json.loads((DATA/'curriculum-governance-2026-2027.json').read_text(encoding='utf-8'))
BANK=json.loads((DATA/'exercise-bank-2026-2027.json').read_text(encoding='utf-8'))
COVER=json.loads((DATA/'coverage-report-2026-2027.json').read_text(encoding='utf-8'))
errors=[]; warnings=[]
records=GOV.get('grade_subject_records',[])
ids=[r.get('id') for r in records]
if len(ids)!=len(set(ids)): errors.append('Duplicate grade_subject_records IDs')
for r in records:
    rid=r.get('id','?'); p=r.get('platform_topic_map') or {}
    if r.get('academic_year')!='2026-2027': errors.append(f'{rid}: academic year mismatch')
    if p.get('official_sequence_verified') is True and not r.get('official_source_ids'):
        errors.append(f'{rid}: official verification has no source IDs')
    terms=p.get('terms',[])
    if sorted(t.get('term') for t in terms if isinstance(t,dict)) != [1,2,3]:
        warnings.append(f'{rid}: platform topic map does not contain exactly three terms')
    for t in terms:
        if not t.get('platform_topics') and not t.get('platform_lessons'):
            warnings.append(f"{rid}: term {t.get('term')} has no mapped topic or lesson")
    if r.get('official_alignment_status') not in ('verified','verified_with_scope_limit'):
        if p.get('official_sequence_verified') is True: errors.append(f'{rid}: conflicting official status')
# Validate exercise-bank identities and answer integrity.
ex= BANK.get('records',[]); exids=[x.get('id') for x in ex]
if len(exids)!=len(set(exids)): errors.append('Duplicate exercise IDs')
for x in ex:
    if x.get('status')=='official' or x.get('content_origin','').startswith('ministry'):
        if not x.get('official_source_id') or not x.get('official_page'):
            errors.append(f"{x.get('id')}: official exercise lacks source/page")
    if x.get('answer_mode')=='multiple_choice':
        choices=x.get('choices') or []; idx=x.get('answer_index')
        if not isinstance(idx,int) or idx<0 or idx>=len(choices): errors.append(f"{x.get('id')}: invalid answer_index")
        elif x.get('solution')!=choices[idx]: errors.append(f"{x.get('id')}: solution differs from selected choice")
# Conservative near-duplicate detector scoped to exact grade/subject.
def norm(s): return re.sub(r'[^\w\u0600-\u06FF]+','',str(s or '').lower())
seen={}; dup=[]
for x in ex:
    k=(x.get('grade'),x.get('subject'),norm(x.get('question')))
    if k[2] and k in seen: dup.append({'first':seen[k],'duplicate':x.get('id'),'grade':k[0],'subject':k[1]})
    else: seen[k]=x.get('id')
if dup: warnings.append(f'{len(dup)} exact normalized duplicate questions within the same grade/subject')
# Governance counters must remain honest.
tot=GOV.get('totals',{})
if tot.get('verified_current_annual_progression_pairs',0)>0 and not any(r.get('official_source_ids') for r in records):
    errors.append('Governance claims verified progressions without record-level sources')
report={
 'version':'1.14.0','academic_year':'2026-2027','purpose':'Automated integrity audit only; not Ministry curriculum approval.',
 'summary':{'grade_subject_records':len(records),'exercise_records':len(ex),'officially_verified_progression_pairs':tot.get('verified_current_annual_progression_pairs',0),'exact_duplicate_questions':len(dup),'errors':len(errors),'warnings':len(warnings)},
 'policy':'The audit never promotes a platform-authored topic, lesson, exercise or exam to official status.',
 'errors':errors,'warnings':warnings,'duplicate_examples':dup[:100],
 'inputs_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [DATA/'curriculum-governance-2026-2027.json',DATA/'exercise-bank-2026-2027.json',DATA/'coverage-report-2026-2027.json']}
}
(DATA/'curriculum-integrity-audit-2026-2027.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report['summary'],ensure_ascii=False))
if errors: raise SystemExit(1)
