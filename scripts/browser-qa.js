// Optional browser QA: launch isolated headless Chromium with --remote-debugging-port=9223.
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const tabs=await fetch('http://127.0.0.1:9223/json').then(r=>r.json());
 const tab=tabs.find(t=>t.type==='page'&&(t.url==='about:blank'||t.url.startsWith('http://127.0.0.1:4173')));
 assert.ok(tab,'A blank or localhost test tab is required');
 const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(resolve=>ws.onopen=resolve);
 let id=0;const pending=new Map(),errors=[];
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+': '+m.params.exceptionDetails.exception?.description);};
 function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});}
 async function run(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
 async function wait(expression){for(let i=0;i<60;i++){if(await run(expression))return;await new Promise(r=>setTimeout(r,250));}throw Error('Timeout: '+expression);}
 try{
 await send('Runtime.enable');await send('Page.enable');
 await send('Page.navigate',{url:'http://127.0.0.1:4173/learn/'});
 await wait("!!document.getElementById('study-start')");
 console.log('Loaded live data:',await run('({words:WORDS.length,sentences:allContent().filter(w=>w.content_type===\'sentence\').length})'));
 await run("navigate('typing');study.category='HSK1';study.count=5;render();document.getElementById('study-start').click()");
 await run("document.getElementById('ime-answer').dispatchEvent(new CompositionEvent('compositionstart'));document.getElementById('ime-answer').value='wo';document.getElementById('ime-answer').dispatchEvent(new InputEvent('input',{data:'wo',isComposing:true}));document.getElementById('ime-answer').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true}));document.getElementById('study-submit').click()");
 assert.equal(await run('study.session.results.length'),0,'No submit during composition');
 await run("document.getElementById('ime-answer').value=study.session.items[0].hanzi;document.getElementById('ime-answer').dispatchEvent(new CompositionEvent('compositionend'))");
 await new Promise(r=>setTimeout(r,100));await run("document.getElementById('study-submit').click()");
 assert.equal(await run('study.session.result.is_correct'),true);
 await run("navigate('typing');startSession([allContent()[0]],'typing');study.session.answer='错误';submitStudy()");
 assert.equal(await run("historyData().reviews[contentKey(allContent()[0])].wrong_count>=1"),true);
 await run("document.getElementById('study-next').click()");assert.equal(await run('study.session.done'),true);
 await run("document.getElementById('retry-wrong').click()");assert.equal(await run('study.session.items.length'),1);
 for(const level of [1,2,3,4]){
  await run(`study.hint=${level};render()`);
  assert.equal(await run("!!document.querySelector('.study-card .zh')"),level===1);
  assert.equal(await run("!!document.querySelector('.study-card [lang=\"zh-Latn\"]')"),level<=2);
 }
 await run("navigate('review')");assert.ok(await run("document.body.innerText.includes('다시 타자')"));
 await send('Emulation.setDeviceMetricsOverride',{width:320,height:780,deviceScaleFactor:1,mobile:true});
 for(const route of ['vocabulary','learn','typing','test','review']){
  await run(`navigate('${route}')`);
  assert.ok(await run('document.documentElement.scrollWidth<=window.innerWidth'),route+' fits 320px');
 }
 fs.mkdirSync('test-results',{recursive:true});
 await run("navigate('typing')");const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('test-results/typing-mobile.png',Buffer.from(shot.data,'base64'));
 for(const route of ['vocabulary','learn','typing','test','review']){
  await send('Page.navigate',{url:'http://127.0.0.1:4173/'+route+'/'});await wait("!!document.querySelector('[data-route]')");
  assert.equal(await run('state.mode'),{vocabulary:'manage',learn:'learn',typing:'typing',test:'quiz',review:'notes'}[route]);
 }
 assert.deepEqual(errors,[]);console.log('Browser QA passed: live initialization, IME, scoring, review, hints, mobile widths, route entry points.');
 }finally{ws.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
