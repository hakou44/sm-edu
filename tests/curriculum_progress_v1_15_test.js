const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('web/curriculum-progress.js','utf8');
assert(source.includes('smSchoolCurriculumProgressV115'));
assert(source.includes('learnerId'));
assert(source.includes('لا تُرسل البيانات إلى جهة خارجية'));
assert(source.includes('لا تُرسل') || source.includes('لا تُرسل'));
assert(source.includes('data-status') && source.includes('data-delete'));
console.log('curriculum progress v1.15 checks passed');
