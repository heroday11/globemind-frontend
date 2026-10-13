from pathlib import Path
import json,time,urllib.request,urllib.error,uuid
base=Path('/home/globemind/globemind-api-recovery-20261009')
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
targets=[('upstream-live','http://127.0.0.1:18088/api/health/live'),('origin-ready','http://127.0.0.1:4173/api/health/ready'),('public-live','https://globemind.top/api/health/live'),('public-ready','https://globemind.top/api/health/ready'),('public-auth','https://globemind.top/api/auth/me'),('public-data-status','https://globemind.top/api/status'),('homepage','https://globemind.top/'),('protected-harness-entry','https://globemind.gdufsdm.cn/api/health')]
results=[]
for name,url in targets:
 row={'name':name,'url':url,'time':time.strftime('%Y-%m-%dT%H:%M:%S%z')}
 marker=str(uuid.uuid4())
 req=urllib.request.Request(url,headers={'X-Request-ID':marker,'User-Agent':'GlobeMind-Recovery-ReadOnly/1.0','Host':'globemind.top'} if name=='origin-ready' else {'X-Request-ID':marker,'User-Agent':'GlobeMind-Recovery-ReadOnly/1.0'})
 try:
  try: r=opener.open(req,timeout=20)
  except urllib.error.HTTPError as e: r=e
  with r:
   body=r.read(128000); row.update(status=r.status,content_type=r.headers.get('Content-Type'),request_id=r.headers.get('X-Request-ID'))
  try:
   data=json.loads(body)
   row['payload']={k:data[k] for k in ('service','status','ready','release','detail','checks') if k in data}
   if name=='public-data-status': row['payload']=data
  except (ValueError,TypeError): row['html_received']=b'<html' in body.lower() or b'<!doctype html' in body.lower()
 except Exception as e: row['transport_error']=type(e).__name__
 results.append(row); print(json.dumps(row,ensure_ascii=False),flush=True)
output=base/('verification-'+time.strftime('%Y%m%dT%H%M%S')+'.json')
output.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print('saved',output,flush=True)
