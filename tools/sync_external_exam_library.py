#!/usr/bin/env python3
"""Discover dated assessment links from configured public pages. No PDF download/republication."""
import argparse,json,re,time,hashlib
from datetime import datetime,timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin,urlparse
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/'web/data/external-exam-library.json'
ALLOWED={'www.dzexams.com','dzexams.com','eddirasa.com','www.eddirasa.com','www.t-onec.com','t-onec.com'}
YR=re.compile(r'(?<!\d)(202[2-6])(?!\d)')
WORDS={'homework':['فرض','فروض','devoir','homework'],'test':['اختبار','اختبارات','test'],'exam':['امتحان','امتحانات','bac','bem','examen','exam'],'solution':['حل','حلول','تصحيح','corrigé','solution']}
class Parser(HTMLParser):
 def __init__(self):super().__init__();self.href=None;self.buf=[];self.items=[]
 def handle_starttag(self,t,a):
  if t=='a':self.href=dict(a).get('href');self.buf=[]
 def handle_data(self,d):
  if self.href is not None:self.buf.append(d)
 def handle_endtag(self,t):
  if t=='a' and self.href is not None:self.items.append((self.href,' '.join(self.buf).strip()));self.href=None;self.buf=[]
def scan(s,timeout):
 req=Request(s['url'],headers={'User-Agent':'SM-SCHOOL-AI-resource-indexer/1.0'})
 with urlopen(req,timeout=timeout) as r:
  if 'html' not in r.headers.get('Content-Type','').lower():return []
  html=r.read(3000000).decode(r.headers.get_content_charset() or 'utf8','replace')
 p=Parser();p.feed(html);out=[];seen=set()
 for href,title in p.items:
  u=urljoin(s['url'],href);q=urlparse(u)
  if q.scheme!='https' or q.hostname not in ALLOWED or u in seen:continue
  seen.add(u);joined=title+' '+u;ys=sorted(set(map(int,YR.findall(joined))))
  if not ys:continue
  types=[k for k,ws in WORDS.items() if any(w in joined.lower() for w in ws)]
  if not types:continue
  out.append({'id':hashlib.sha256(u.encode()).hexdigest()[:16],'title':title or u,'url':u,'source_id':s['id'],'source_name':s['name'],'stage':s['stage'],'grade':s['grade'],'years':ys,'document_types':types,'format':'pdf' if '.pdf' in q.path.lower() else 'web_page','solution_status':'title_indicated_not_verified' if 'solution' in types else 'not_indicated','rights_status':'unknown_permission_required','local_file':None})
 return out
def main():
 a=argparse.ArgumentParser();a.add_argument('--timeout',type=int,default=20);a.add_argument('--delay',type=float,default=1.5);a.add_argument('--source',action='append');a.add_argument('--output',type=Path,default=DATA);x=a.parse_args();d=json.loads(DATA.read_text(encoding='utf8'));all={r['url']:r for r in d.get('records',[])};errs=[];n=0
 for s in d['sources']:
  if x.source and s['id'] not in x.source:continue
  try:
   for r in scan(s,x.timeout):
    if any(y in d['scope']['years'] for y in r['years']):all[r['url']]=r
   n+=1
  except Exception as e:errs.append({'source_id':s['id'],'error':str(e)})
  time.sleep(max(0,x.delay))
 d['records']=sorted(all.values(),key=lambda r:(r['stage'],r['grade'],r['years'][0],r['title']));d['sync']={'status':'completed_with_errors' if errs else 'completed','last_sync_at':datetime.now(timezone.utc).isoformat(),'pages_scanned':n,'candidate_documents_found':len(d['records']),'pdf_files_downloaded':0,'rights_cleared_files':0,'errors':errs,'note':'Discovery only; source-hosted files are not downloaded or republished.'};d['totals']={'source_pages':len(d['sources']),'candidate_documents':len(d['records']),'pdf_downloaded':0,'rights_cleared':0};x.output.parent.mkdir(parents=True,exist_ok=True);x.output.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({'pages_scanned':n,'records':len(d['records']),'errors':errs,'pdf_downloaded':0},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
