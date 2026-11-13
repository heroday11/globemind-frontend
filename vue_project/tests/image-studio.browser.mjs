import assert from 'node:assert/strict'
import sharp from 'sharp'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.IMAGE_TEST_ORIGIN || 'http://127.0.0.1:4318'
const fixture = await sharp({ create: { width:1024,height:1024,channels:4,background:'#df3333' } }).png().toBuffer()
const requests = [], errors = [], uploads = []
let job
const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] })
try {
  const page = await browser.newPage({ viewport:{ width:1280,height:1000 } })
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => {
    localStorage.setItem('access_token','browser-test')
    localStorage.setItem('current_user',JSON.stringify({id:7,username:'image-test',role:'user'}))
  })
  await page.route('**/api/**', async route => {
    const req=route.request(), url=new URL(req.url()), path=url.pathname
    if (path==='/api/assistant/dsh-launch') return route.fulfill({json:{url:'/dsh/'}})
    if (path==='/api/assistant/images/assets') {
      uploads.push({mask:url.searchParams.has('mask'),data:req.postDataBuffer()})
      return route.fulfill({json:{id:'asset-'+uploads.length,width:1024,height:1024}})
    }
    if (path==='/api/assistant/images/jobs' && req.method()==='POST') {
      const body=req.postDataJSON(); requests.push(body)
      job={id:'a'.repeat(32),state:'done',created_at:Date.now()/1000,request:body,outputs:Array.from({length:body.count},(_,index)=>({index,name:'image-'+index+'.png',url:'/api/assistant/images/jobs/'+ 'a'.repeat(32)+'/files/'+index,model:'gpt-image-2.5-sunburst',provider:'65535'})),attempts:[{index:0,model:'gpt-image-2.5-sunburst',provider:'65535',state:'done',cost_usd:.038}],quota_cny:'0.8',provider_cost_usd:'0.152',provider_cost_complete:true,notice:'已自动存入报告',error:''}
      return route.fulfill({status:202,json:job})
    }
    if (path==='/api/assistant/images/jobs') return route.fulfill({json:job?[job]:[]})
    if (path.includes('/files/')) return route.fulfill({contentType:'image/png',body:fixture})
    if (path==='/api/assistant/reports') return route.fulfill({json:{data:[]}})
    return route.fulfill({json:{id:7,user_id:7,username:'image-test',role:'user',is_active:true,data:[],items:[]}})
  })
  await page.route('**/dsh/**',route=>route.fulfill({contentType:'text/html',body:'<html><body><p>测试助手会话</p><script>window.__DSH_BOOT__={};addEventListener("message",e=>{if(e.data.type==="connect")parent.postMessage({...e.data,type:"ready",sessionId:"test-session"},location.origin);if(e.data.type==="image-job")parent.postMessage({...e.data,type:"image-job-ack",ok:true},location.origin)})</script></body></html>'}))
  await page.goto(base+'/data-assistant')
  await page.getByRole('button',{name:'图片生成与编辑',exact:true}).click()
  await page.locator('textarea').fill('把选区中的红色方块改成绿色')
  await page.locator('input[type=file]').setInputFiles([{name:'source.png',mimeType:'image/png',buffer:fixture},{name:'reference.png',mimeType:'image/png',buffer:fixture}])
  await page.locator('select').nth(3).selectOption('4')
  await page.getByLabel('鼠标涂抹选区，只修改选中的区域').check()
  const canvas=page.locator('canvas[aria-label]')
  await canvas.scrollIntoViewIfNeeded()
  const box=await canvas.boundingBox()
  await page.mouse.move(box.x+box.width*.65,box.y+box.height*.5)
  await page.mouse.down()
  await page.mouse.move(box.x+box.width*.8,box.y+box.height*.5,{steps:10})
  await page.mouse.up()
  await page.screenshot({path:'/tmp/globemind-image-editor.png',fullPage:true})
  await page.getByRole('button',{name:'生成图片',exact:true}).click()
  await page.getByRole('link',{name:'下载图片',exact:true}).first().waitFor()
  assert.equal(requests.length,1)
  assert.equal(requests[0].count,4)
  assert.equal(requests[0].references.length,2)
  assert.ok(requests[0].mask)
  const mask=uploads.find(row=>row.mask)
  assert.ok(mask)
  const {data,info}=await sharp(mask.data).raw().toBuffer({resolveWithObject:true})
  assert.equal(data[(512*info.width+100)*info.channels+3],255)
  assert.equal(data[(512*info.width+740)*info.channels+3],0)
  assert.equal(await page.getByRole('link',{name:'下载图片',exact:true}).count(),4)
  const download=page.waitForEvent('download')
  await page.getByRole('link',{name:'下载图片',exact:true}).first().click()
  assert.ok((await download).suggestedFilename().endsWith('.png'))
  await page.getByRole('button',{name:'关闭图片编辑',exact:true}).click()
  await page.goto(base+'/data-service/report-center')
  await page.getByRole('link',{name:'下载图片',exact:true}).first().waitFor()
  assert.equal(await page.getByRole('link',{name:'下载图片',exact:true}).count(),4)
  await page.getByRole('button',{name:'继续编辑',exact:true}).first().click()
  await page.getByRole('dialog').waitFor()
  await page.setViewportSize({width:390,height:844})
  await page.screenshot({path:'/tmp/globemind-image-editor-mobile.png',fullPage:true})
  assert.equal(errors.length,0,errors.join('\n'))
  console.log(JSON.stringify({passed:true,checks:['mouse selection alpha','two references','batch4','preview','download','report archive','continue edit','mobile dialog','no page errors']}))
} finally { await browser.close() }
