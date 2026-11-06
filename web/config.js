/* Public runtime configuration only. Never place API keys or secrets in this file. */
window.SM_SCHOOL_CONFIG = Object.freeze({
  publicContentBase: 'https://hakou44.github.io/sm-edu', // Set once to the deployed HTTPS Pages base, e.g. https://OWNER.github.io/REPOSITORY (no trailing slash).
  examsBase: '', // Optional override; otherwise publicContentBase is used for licensed exam files.
  tasnimIndexUrl: '', // Optional override; otherwise publicContentBase + /data/tasnim-index.json is used.
  apiBase: '', // Set to the deployed FastAPI origin for Android builds, e.g. https://api.example.dz (or use the in-app tutor server setting)
  aiCourseFeed: '' // Optional override; otherwise publicContentBase + /data/ai-course-updates.json is used.
});
/* v1.12.0: shared JSON loader (each big data file is downloaded and parsed once). */
(function(){
  const cache={};
  window.smFetchJSON=function(url){
    if(!cache[url])cache[url]=fetch(url).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status+' '+url);return r.json()}).catch(e=>{delete cache[url];throw e});
    return cache[url];
  };
  /* v1.12.0: attach the optional admin token to the protected review routes only. */
  const nativeFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    try{
      const url=typeof input==='string'?input:(input&&input.url)||'';
      if(/\/api\/v1\/(archive\/(pdf-review|pdf-question-candidates|curriculum-evidence-candidates)|ai\/claude-content)/.test(url)){
        const token=localStorage.getItem('smSchoolAdminToken');
        if(token){init=Object.assign({},init);init.headers=Object.assign({},init.headers||{},{'X-Admin-Token':token})}
      }
    }catch(e){}
    return nativeFetch(input,init);
  };
})();
