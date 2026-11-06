#!/usr/bin/env python3
"""Private PDF download and text-extraction queue. Run with --fetch on a networked host."""
import argparse, hashlib, json, re
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
ROOT=Path(__file__).resolve().parents[1]
def digest(path):
 h=hashlib.sha256()
 with open(path,'rb') as f:
  for block in iter(lambda:f.read(1024*1024),b''): h.update(block)
 return h.hexdigest()
def extract(pdf,out):
 try: import fitz
 except ImportError as e: raise RuntimeError('Install PyMuPDF: pip install pymupdf') from e
 doc=fitz.open(pdf); pages=[]
 for i,page in enumerate(doc): pages.append(f'--- PAGE {i+1} ---\n'+page.get_text('text').strip())
 out.write_text('\n\n'.join(pages)+'\n',encoding='utf-8')
 return ('text_extracted' if any(x.strip() for x in pages) else 'image_pdf_ocr_required',len(doc))
def main():
 p=argparse.ArgumentParser();p.add_argument('--manifest',default='web/data/pdf-acquisition-2026-2027.json');p.add_argument('--fetch',action='store_true');p.add_argument('--timeout',type=int,default=35);a=p.parse_args()
 mp=Path(a.manifest);mp=mp if mp.is_absolute() else ROOT/mp;data=json.loads(mp.read_text(encoding='utf-8'))
 pending=ROOT/'imports/pending-rights';texts=ROOT/'imports/extracted-text';pending.mkdir(parents=True,exist_ok=True);texts.mkdir(parents=True,exist_ok=True);results=[]
 for item in data['documents']:
  row={'id':item['id'],'pdf_url':item['pdf_url']}
  if not a.fetch: row['status']='queued_only';results.append(row);continue
  stem=re.sub(r'[^A-Za-z0-9._-]+','_',item['id']);pdf=pending/(stem+'.pdf');txt=texts/(stem+'.txt')
  try:
   req=Request(item['pdf_url'],headers={'User-Agent':'SM-SCHOOL-AI-Archive-Importer/1.0','Accept':'application/pdf,*/*'})
   with urlopen(req,timeout=a.timeout) as resp: blob=resp.read();ctype=resp.headers.get('Content-Type','')
   if not blob.startswith(b'%PDF-'): raise ValueError(f'Not a PDF response: {ctype}, {len(blob)} bytes')
   pdf.write_bytes(blob);status,pages=extract(pdf,txt);sha=digest(pdf)
   item.update({'download_status':'downloaded_private_review_queue','extraction_status':status,'sha256':sha,'local_file':str(pdf.relative_to(ROOT)),'text_file':str(txt.relative_to(ROOT)),'page_count':pages})
   row.update({'status':item['download_status'],'extraction':status,'pages':pages,'sha256':sha})
  except (HTTPError,URLError,TimeoutError,OSError,ValueError,RuntimeError) as e:
   item.update({'download_status':'failed_or_blocked','extraction_status':'not_started'});row.update({'status':'failed_or_blocked','error':str(e)})
  results.append(row)
 data['totals']['downloaded_pdf_files']=sum(x.get('download_status')=='downloaded_private_review_queue' for x in data['documents'])
 data['totals']['extracted_text_documents']=sum(x.get('extraction_status')=='text_extracted' for x in data['documents'])
 data['totals']['verified_solutions']=0;data['totals']['rights_cleared']=sum(x.get('reuse_permission')=='authorized_for_republication' for x in data['documents'])
 mp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'fetch_enabled':a.fetch,'results':results,'totals':data['totals']},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
