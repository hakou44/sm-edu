const fs=require('fs'),vm=require('vm'),assert=require('assert'),{webcrypto}=require('crypto');
const source=fs.readFileSync(__dirname+'/../web/parent-account.js','utf8');
assert(source.includes('AES-256-GCM')&&source.includes('PBKDF2-SHA256-310000'));
assert(source.includes('/api/v1/parents/sync/create')&&source.includes('/api/v1/parents/sync/redeem'));
assert(source.includes('validateLocalBackup(payload)')&&source.includes('confirm('));
assert(source.includes('parentSyncPanel()')&&source.includes('20 minutes'));
const ctx={crypto:webcrypto,btoa,atob,TextEncoder,TextDecoder,lang:'en',parentAuthText:(a,f,e)=>e};vm.createContext(ctx);vm.runInContext(source,ctx);
(async()=>{const code=ctx.parentSyncCodeGenerate();assert(/^[A-HJ-NP-Z2-9]{5}(?:-[A-HJ-NP-Z2-9]{5}){3}-[A-HJ-NP-Z2-9]{6}$/.test(code),code);const payload={app:'SM SCHOOL AI',backup_version:1,data:{smSchoolLearners:'[]'}};const encrypted=await ctx.parentSyncEncrypt(payload,code);assert(!encrypted.includes('smSchoolLearners'));assert.deepStrictEqual(JSON.parse(JSON.stringify(await ctx.parentSyncDecrypt(encrypted,code))),payload);await assert.rejects(()=>ctx.parentSyncDecrypt(encrypted,ctx.parentSyncCodeGenerate()));console.log('PASS: parent encrypted transfer UI, 128-bit code format, AES-GCM round trip, wrong-code rejection and explicit restore consent')})().catch(e=>{console.error(e);process.exitCode=1});
