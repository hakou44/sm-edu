const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/../web/app.js','utf8');
const start=source.indexOf('function replaceLocalBackupData('),end=source.indexOf('function validateLocalBackup(',start);
assert(start>=0&&end>start,'transactional restore helper must exist');
const helper=source.slice(start,end);
function makeStore(initial={},failOn=null){
 const data=new Map(Object.entries(initial));let writes=0;
 return {data,getItem:k=>data.has(k)?data.get(k):null,key:i=>[...data.keys()][i]??null,get length(){return data.size},removeItem:k=>data.delete(k),setItem(k,v){writes++;if(failOn&&writes===failOn)throw new Error('quota exceeded');data.set(k,String(v));}};
}
function run(store,payload){const ctx={localStorage:store,LOCAL_BACKUP_KEYS:['smSchoolLearners','smSchoolProgress'],validateLocalBackup:p=>p===payload,payload};vm.createContext(ctx);vm.runInContext(helper+';replaceLocalBackupData(payload)',ctx);}
const payload={data:{smSchoolLearners:'[]',smSchoolProgress:'[]','smSchoolTutorHistory:abc':'[]'}};
let store=makeStore({smSchoolLearners:'[1]',smSchoolProgress:'[2]','smSchoolTutorHistory:old':'[3]',unrelated:'keep'});
run(store,payload);assert.equal(store.getItem('smSchoolLearners'),'[]');assert.equal(store.getItem('smSchoolTutorHistory:old'),null);assert.equal(store.getItem('smSchoolTutorHistory:abc'),'[]');assert.equal(store.getItem('unrelated'),'keep');
store=makeStore({smSchoolLearners:'[1]',smSchoolProgress:'[2]','smSchoolTutorHistory:old':'[3]'},2);
assert.throws(()=>run(store,payload),/quota exceeded/);assert.equal(store.getItem('smSchoolLearners'),'[1]');assert.equal(store.getItem('smSchoolProgress'),'[2]');assert.equal(store.getItem('smSchoolTutorHistory:old'),'[3]');
console.log('PASS: restore replaces only managed keys and rolls back completely after a storage write failure');
