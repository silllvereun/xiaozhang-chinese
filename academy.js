'use strict';
const Score=AcademyScore;
const routes={vocabulary:'manage',learn:'learn',typing:'typing',test:'quiz',review:'notes'};
const aliases={manage:'vocabulary',quiz:'test',sentence:'typing',notes:'review'};
const prefs=readLocal('academy.preferences',{});
const study={category:prefs.category||'',starred:!!prefs.starred,wrong:!!prefs.wrong,count:prefs.count||10,hint:prefs.hint||1,type:'word',session:null,learn:null,reviewTab:'wrong',reviewType:'',reviewSort:'recent',audioError:false};
function readLocal(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function writeLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{alert('기기 저장 공간이 부족하거나 저장이 차단되어 기록을 보관하지 못했습니다. 계정 설정에서 백업해주세요.');return false;}}
function storageKey(){return 'academy.history.'+(currentUser?.id||'guest');}
function historyData(){return readLocal(storageKey(),{attempts:[],reviews:{}});}
function contentKey(item){return item.content_type+':'+item.id;}
function allContent(){
  return [...(globalThis.ACADEMY_SENTENCES||[]),...WORDS.map(w=>({...w,content_type:'word',accepted:[]})),...SENTENCES.filter(s=>s.translation).map(s=>({id:s.id,hanzi:s.content,pinyin:s.pinyin||sentencePinyin(s.content),meaning:s.translation,categories:WORDS.filter(w=>SENTENCE_WORDS.some(sw=>sw.sentenceId===s.id&&sw.wordId===w.id)).flatMap(w=>w.categories),content_type:'sentence',accepted:s.accepted_answers||[]}))];
}
function selectedContent(type){
  const reviews=historyData().reviews;
  return allContent().filter(w=>(!type||w.content_type===type)&&(!study.category||w.categories.includes(study.category))&&(!study.starred||starred(w))&&(!study.wrong||reviews[contentKey(w)]?.status==='wrong'));
}
function starred(w){return w.content_type==='word'?isStarred(w.id):!!readLocal('academy.stars.'+(currentUser?.id||'guest'),{})[w.id];}
async function star(w){if(w.content_type==='word')await toggleStar(w.id);else{const key='academy.stars.'+(currentUser?.id||'guest'),data=readLocal(key,{});data[w.id]=!data[w.id];writeLocal(key,data);}render();}
function savePrefs(){writeLocal('academy.preferences',{category:study.category,starred:study.starred,wrong:study.wrong,count:study.count,hint:study.hint});}
function saveAttempt(item,answer,result,elapsed,skipped,mode){
  const a={id:crypto.randomUUID(),user_id:currentUser?.id||null,content_type:item.content_type,content_id:item.id,mode,hint_level:mode==='test'?null:study.hint,user_answer:answer,normalized_answer:result.normalized,is_correct:!skipped&&result.isCorrect,accuracy:skipped?0:result.accuracy,elapsed_ms:elapsed,skipped,created_at:new Date().toISOString()};
  const data=historyData();data.attempts.push(a);const key=contentKey(item),review=Score.updateReview(data.reviews[key],a);if(review)data.reviews[key]=review;writeLocal(storageKey(),data);
  void syncAcademy();
  return a;
}
function activeTest(){return (study.session?.mode==='test'&&!study.session.done)||(state.mode==='quiz'&&state.screen==='quiz');}
function leaveAllowed(){return !activeTest()||confirm('진행 중인 시험을 종료할까요? 제출한 답안 기록은 유지됩니다.');}
function routeName(){let raw=location.hash.replace(/^#\/?/,'').split('?')[0];if(!raw)raw=location.pathname.replace(/\/$/,'').split('/').pop();return aliases[raw]|| (routes[raw]?raw:(!raw||raw==='index.html'||raw==='xiaozhang-chinese'?'learn':null));}
let previousHash=location.hash;
function navigate(name){if(!leaveAllowed())return;wordComposing=false;wordInputStarted=null;study.session=null;study.learn=null;state.screen='setup';if(name==='test'){state.selectedGroups=new Set(study.category?[study.category]:GROUP_ORDER);state.starredOnly=study.starred;state.reviewMode=study.wrong;state.quizSize=study.count==='all'?'all':Number(study.count);}state.mode=routes[name]||'missing';history.pushState(null,'','#/'+name);previousHash=location.hash;render();}
window.addEventListener('popstate',()=>{if(!leaveAllowed()){history.pushState(null,'',previousHash||'#/test');return;}study.session=null;study.learn=null;state.screen='setup';state.mode=routes[routeName()]||'missing';previousHash=location.hash;render();});
window.addEventListener('beforeunload',e=>{if(activeTest()){e.preventDefault();e.returnValue='';}});
renderTopNav=function(){return `<nav class="topnav" aria-label="주 메뉴">${Object.entries(routes).map(([url,mode],i)=>`<button class="tab ${state.mode===mode?'active':''}" data-route="${url}" ${state.mode===mode?'aria-current="page"':''}>${['단어장','학습','타자','시험','복습'][i]}</button>`).join('')}</nav>`;};
function empty(){return '<div class="card empty"><p>아직 등록된 학습 항목이 없습니다</p><button class="btn" data-route="vocabulary">단어장으로 이동</button></div>';}
function typeTabs(){return `<div class="btn-row" role="group" aria-label="시험 유형"><button class="btn ${study.type==='word'?'btn-primary':''}" data-type="word">단어 시험</button><button class="btn ${study.type==='sentence'?'btn-primary':''}" data-type="sentence">문장 시험</button></div>`;}
function scopeForm(mode){
  const items=selectedContent(mode==='test'?'sentence':null);
  return `<section class="card"><h2>${mode==='learn'?'학습':mode==='test'?'문장 시험':'문장 타자연습'}</h2><p class="muted">${mode==='test'?'학습한 기준문장 암기 시험입니다. 한국어 뜻을 보고 중국어를 입력하세요.':'범위를 선택하고, 한 글자씩 익혀보세요. 단어와 저장된 문장을 함께 연습합니다.'}</p><div class="study-grid"><label>학습 범위<select id="scope-category"><option value="">전체 범위</option>${[...new Set([...GROUP_ORDER,...allContent().flatMap(w=>w.categories)])].map(g=>`<option ${study.category===g?'selected':''}>${h(g)}</option>`).join('')}</select></label><label>문제 수<select id="scope-count">${[5,10,15,20,'all'].map(n=>`<option value="${n}" ${String(study.count)===String(n)?'selected':''}>${n==='all'?'전체':n}</option>`).join('')}</select></label><label class="check"><input id="scope-starred" type="checkbox" ${study.starred?'checked':''}> 즐겨찾기만 학습</label><label class="check"><input id="scope-wrong" type="checkbox" ${study.wrong?'checked':''}> 오답만 학습</label>${mode==='typing'?hintSelector():''}</div><p>선택된 항목 ${items.length}개</p><button class="btn btn-primary" id="study-start" ${items.length?'':'disabled'}>${mode==='learn'?'학습 시작':mode==='test'?'시험 시작':'타자 연습 시작'}</button>${items.length?'':empty()}</section>`;
}
function hintSelector(){return `<label>힌트 단계<select id="hint-level">${['중국어 + 병음 + 뜻','병음 + 뜻','한국어 뜻','음성만'].map((s,i)=>`<option value="${i+1}" ${study.hint===i+1?'selected':''}>${i+1}단계 · ${s}</option>`).join('')}</select></label>`;}
function chineseBlock(w,level=1){return `<div class="study-card">${level===1?`<div class="zh" lang="zh-CN">${h(w.hanzi)}</div>`:''}${level<=2?`<p lang="zh-Latn">${h(w.pinyin||'병음 미등록')}</p>`:''}${level<=3?`<p>${h(w.meaning)}</p>`:'<p>발음을 듣고 중국어를 입력하세요.</p>'}</div>`;}
function learning(){const l=study.learn,w=l.items[l.index];return `<section class="card"><h2>학습 카드</h2><p>${l.index+1} / ${l.items.length}</p>${chineseBlock(w)}<div class="btn-row"><button class="btn" id="audio">발음 듣기</button><button class="btn" id="study-star">${starred(w)?'즐겨찾기 해제':'즐겨찾기'}</button><button class="btn" id="learn-prev" ${l.index?'':'disabled'}>이전</button><button class="btn" id="learn-next" ${l.index===l.items.length-1?'disabled':''}>다음</button><button class="btn btn-primary" id="learn-type">타자로 연습</button><button class="btn" data-route="test">선택 범위로 시험</button></div>${audioNotice()}</section>`;}
function audioNotice(){return study.audioError?'<p role="status">이 기기에서는 중국어 음성을 재생할 수 없습니다.</p><button class="btn" id="audio-fallback">3단계로 전환</button>':'';}
async function playAudio(w){
  try{if(!window.speechSynthesis)throw Error('unsupported');const voices=await loadVoices(),voice=voices.find(v=>/^zh/i.test(v.lang));if(!voice)throw Error('no voice');speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(w.hanzi);u.voice=voice;u.lang=voice.lang;u.onerror=()=>{study.audioError=true;render();};speechSynthesis.speak(u);}
  catch{study.audioError=true;render();}
}
function startSession(items,mode){study.audioError=false;study.session={items,index:0,mode,results:[],answer:'',started:null,composing:false,compositionEnded:0,result:null,done:false};study.learn=null;render();}
function sessionView(){const s=study.session;if(s.done)return summaryView(s);const w=s.items[s.index];return `<section class="card"><h2>${s.mode==='test'?'문장 시험':s.mode==='review'?'오답 다시 연습':'타자연습'}</h2><p>${s.index+1} / ${s.items.length}</p><progress max="${s.items.length}" value="${s.index}" aria-label="진행률"></progress>${s.mode==='test'?'':hintSelector()}${chineseBlock(w,s.mode==='test'?3:study.hint)}${s.mode==='test'?'':'<button class="btn" id="audio">발음 듣기</button>'}${audioNotice()}<label for="ime-answer">중국어 답안</label><textarea id="ime-answer" lang="zh-CN" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="1000" ${s.result?'disabled':''}>${h(s.answer)}</textarea><p class="muted">첫 입력부터 시간을 측정합니다. 한자 후보 선택을 마친 뒤 정답을 확인하세요.</p>${s.result?feedback(s.result,w):'<div class="btn-row"><button class="btn btn-primary" id="study-submit">정답 확인</button><button class="btn" id="study-skip">모르겠어요</button></div>'}</section>`;}
function feedback(r,w){return `<div class="feedback ${r.is_correct?'':'wrong'}" role="status"><h3>${r.is_correct?'✓ 정답입니다':'× 다시 확인해보세요'}${r.skipped?' · 건너뜀':''}</h3><p>정답 문장 <span lang="zh-CN">${h(w.hanzi)}</span></p><p>내가 입력한 문장 <span lang="zh-CN">${h(r.user_answer)||'(빈 답안)'}</span></p><div class="answer-diff" lang="zh-CN" aria-label="글자별 차이">${r.diff.map(d=>`<span class="diff-${d.kind}" title="${{equal:'일치',delete:'누락',insert:'추가',replace:'교체'}[d.kind]}">${h(d.correct||d.answer)}${d.kind==='replace'?`→${h(d.answer)}`:''}</span>`).join('')}</div><p>정확도 ${r.accuracy}% · 입력 시간 ${(r.elapsed_ms/1000).toFixed(1)}초</p>${r.is_correct?'':'<p>복습에 자동 등록했습니다.</p>'}<button class="btn btn-primary" id="study-next">다음 문장</button></div>`;}
function submitStudy(skipped=false){const s=study.session;if(!s||s.result||s.composing||performance.now()-s.compositionEnded<80)return;const w=s.items[s.index],result=Score.grade(w.hanzi,s.answer,w.accepted);const a=saveAttempt(w,s.answer,result,s.started===null?0:Math.round(performance.now()-s.started),skipped,s.mode);s.result={...a,diff:result.diff,item:w};s.results.push(s.result);render();}
function summaryView(s){const correct=s.results.filter(r=>r.is_correct).length,skipped=s.results.filter(r=>r.skipped).length,wrong=s.results.filter(r=>!r.is_correct);return `<section class="card"><h2>${s.mode==='test'?'시험':'연습'} 결과</h2><div class="summary"><p>총점<strong>${Math.round(correct/s.results.length*100)}점</strong></p><p>정답 ${correct} / 오답 ${s.results.length-correct-skipped} / 건너뜀 ${skipped}</p><p>평균 정확도 ${Math.round(s.results.reduce((n,r)=>n+r.accuracy,0)/s.results.length)}%</p><p>평균 입력 시간 ${(s.results.reduce((n,r)=>n+r.elapsed_ms,0)/s.results.length/1000).toFixed(1)}초</p></div>${wrong.map(r=>`<p><span lang="zh-CN">${h(r.item.hanzi)}</span> · ${h(r.item.meaning)}</p>`).join('')}<div class="btn-row">${wrong.length?'<button class="btn btn-primary" id="retry-wrong">오답만 다시 풀기</button>':''}<button class="btn" data-route="review">복습으로 이동</button><button class="btn" id="study-reset">범위 다시 선택</button></div></section>`;}
function reviewView(){const data=historyData(),content=allContent();let list=Object.entries(data.reviews).map(([key,r])=>({...r,item:content.find(w=>contentKey(w)===key)})).filter(r=>r.item&&r.status===study.reviewTab&&(!study.reviewType||r.content_type===study.reviewType)&&(!study.category||r.item.categories.includes(study.category)));list.sort((a,b)=>study.reviewSort==='wrong'?b.wrong_count-a.wrong_count:study.reviewSort==='scheduled'?String(a.next_review_at).localeCompare(String(b.next_review_at)):b.last_attempt_at.localeCompare(a.last_attempt_at));return `<h2>복습</h2><p class="muted">${currentUser?'이 기기에 저장된 계정별 기록입니다.':'비회원 기록은 이 기기에 저장됩니다.'} 연속 3회 정답이면 학습 완료로 이동합니다.</p><div class="btn-row">${[['wrong','오답'],['scheduled','복습 예정'],['mastered','학습 완료']].map(([v,t])=>`<button class="btn ${study.reviewTab===v?'btn-primary':''}" data-review-tab="${v}">${t}</button>`).join('')}</div><div class="study-grid"><label>항목 유형<select id="review-type">${[['','전체'],['word','단어'],['sentence','문장']].map(([v,t])=>`<option value="${v}" ${study.reviewType===v?'selected':''}>${t}</option>`).join('')}</select></label><label>카테고리<select id="scope-category"><option value="">전체</option>${GROUP_ORDER.map(g=>`<option ${study.category===g?'selected':''}>${h(g)}</option>`).join('')}</select></label><label>정렬<select id="review-sort">${[['recent','최근 오답순'],['wrong','오답 많은 순'],['scheduled','복습 예정순']].map(([v,t])=>`<option value="${v}" ${study.reviewSort===v?'selected':''}>${t}</option>`).join('')}</select></label></div><div class="review-list">${list.length?list.map(r=>`<article class="card">${chineseBlock(r.item)}<p>${r.content_type==='word'?'단어':'문장'} · 오답 ${r.wrong_count} · 정답 ${r.correct_count} · 연속 정답 ${r.consecutive_correct}</p><p>마지막 학습 ${new Date(r.last_attempt_at).toLocaleString('ko-KR')}</p><div class="btn-row"><button class="btn" data-review="${h(contentKey(r.item))}">다시 타자</button><button class="btn" data-audio="${h(contentKey(r.item))}">발음</button><button class="btn" data-star="${h(contentKey(r.item))}">${starred(r.item)?'즐겨찾기 해제':'즐겨찾기'}</button></div></article>`).join(''):'<p class="empty">해당 복습 항목이 없습니다.</p>'}</div>`;}
const legacyRenderManage=renderManage,legacyBindManage=bindManage,legacyGetManageList=getManageList;
getManageList=function(){let list=legacyGetManageList();if(state.manage.sortBy==='meaning')list.sort((a,b)=>a.meaning.localeCompare(b.meaning,'ko'));if(state.manage.sortBy==='starred')list.sort((a,b)=>Number(isStarred(b.id))-Number(isStarred(a.id)));return list;};
renderManage=function(){const q=state.manage.query.trim().toLowerCase();let sentences=allContent().filter(w=>w.content_type==='sentence'&&(!q||[w.hanzi,w.pinyin,w.meaning].some(x=>x.toLowerCase().includes(q)))&&(!state.manage.filterCategories.size||w.categories.some(c=>state.manage.filterCategories.has(c))));if(state.manage.sortBy==='meaning')sentences.sort((a,b)=>a.meaning.localeCompare(b.meaning,'ko'));if(state.manage.sortBy==='starred')sentences.sort((a,b)=>Number(starred(b))-Number(starred(a)));return legacyRenderManage().replace('<h3>단어장 관리</h3>','<h2>공개 단어장</h2><p>함께 만든 중국어 단어와 문장을 자유롭게 학습해보세요.</p>').replace(/<div class="backup-row">[\s\S]*?<\/div>/,'').replace('<option value="hanzi"',`<option value="meaning" ${state.manage.sortBy==='meaning'?'selected':''}>가나다순</option><option value="starred" ${state.manage.sortBy==='starred'?'selected':''}>즐겨찾기</option><option value="hanzi"`).replace(/<button class="fab"[^>]*>[\s\S]*?<\/button>/,currentUser?'$&':'')+`<section class="card"><h2>문장</h2>${sentences.length?sentences.map(w=>`<article class="word-item"><div class="word-main">${renderBadges(w.categories)}<div class="zh" lang="zh-CN">${h(w.hanzi)}</div><p>${h(w.pinyin)}</p><p>${h(w.meaning)}</p></div><div class="btn-row"><button class="btn" data-audio="${h(contentKey(w))}">발음</button><button class="btn" data-star="${h(contentKey(w))}">${starred(w)?'즐겨찾기 해제':'즐겨찾기'}</button><button class="btn" data-learn-content="${h(contentKey(w))}">학습하기</button></div></article>`).join(''):'<p>검색 결과가 없습니다.</p>'}</section>`;};
renderManageItem=function(w){return `<article class="word-item"><div class="word-main">${renderBadges(w.categories)}<div class="zh" lang="zh-CN">${h(w.hanzi)}</div><p>${h(w.pinyin)}</p><p>${h(w.meaning)}</p></div><div class="btn-row"><button class="btn star-toggle" data-id="${h(w.id)}">${isStarred(w.id)?'즐겨찾기 해제':'즐겨찾기'}</button><button class="btn speak-word" data-hanzi="${h(w.hanzi)}">발음</button><button class="btn" data-learn="${h(w.id)}">학습하기</button>${canEdit(w)?`<button class="btn edit-word" data-id="${h(w.id)}">수정</button><button class="btn delete-word" data-id="${h(w.id)}">삭제</button>`:''}</div></article>`;};
const legacyCarousel=renderManageCarousel;
renderManageCarousel=function(list){let html=legacyCarousel(list);const w=list[Math.min(state.manage.carouselIndex,list.length-1)];if(!canEdit(w))html=html.replace(/<button class="icon-btn (?:edit-word|delete-word)"[^>]*>[\s\S]*?<\/button>/g,'');return html;};
function canEdit(w){return !!currentUser&&(w?.created_by===currentUser.id||currentUser.app_metadata?.role==='admin');}
bindManage=function(){legacyBindManage();const search=document.getElementById('searchInput');if(search)search.addEventListener('input',()=>{const pos=search.selectionStart;state.manage.query=search.value;render();const next=document.getElementById('searchInput');next.focus();next.setSelectionRange(pos,pos);});};
function accountSettings(){return `<details class="account-settings"><summary>계정 설정 · 백업</summary><p>${h(currentUser?syncStatus:'비회원 기록은 이 기기에 저장됩니다.')}</p><div class="btn-row"><button class="btn" id="academy-export">학습 기록 백업</button><button class="btn" id="exportBtn">기존 단어장 백업</button>${currentUser?'<button class="btn" id="importBtn">단어장 가져오기</button><button class="btn" id="academy-sync">기록 동기화 재시도</button><button class="btn" id="guest-import">비회원 기록 가져오기</button><button class="btn" id="legacy-import">이전 기기 문장 가져오기</button>':''}</div></details>`;}
render=function(){
  if(study.session?.composing||wordComposing)return;
  let body='';
  if(study.session)body=sessionView();
  else if(state.mode==='learn')body=study.learn?learning():scopeForm('learn');
  else if(state.mode==='typing')body=scopeForm('typing');
  else if(state.mode==='manage')body=renderManage();
  else if(state.mode==='notes')body=reviewView();
  else if(state.mode==='quiz')body=state.screen==='quiz'?renderQuiz():state.screen==='result'?renderResult():typeTabs()+(study.type==='sentence'?scopeForm('test'):renderSetup());
  else body='<section class="card"><h2>페이지를 찾을 수 없습니다</h2><button class="btn" data-route="learn">학습으로 이동</button></section>';
  const brand=globalThis.ACADEMY_BRAND;
  const brandContent=brand?.logoUrl?`<img class="brand-logo" src="${h(brand.logoUrl)}" alt="${h(brand.logoAlt)}"><h1 class="sr-only">샤오장학당</h1>`:'<h1>샤오장학당</h1><small>小张学堂 · XiaoZhang Academy</small>';
  app.innerHTML=`<header class="top-bar" aria-label="계정">${renderAuthBar()}</header>${renderTopNav()}${body}${accountSettings()}<footer class="site-footer"><button class="brand" data-route="learn" aria-label="샤오장학당 · 학습으로 이동">${brandContent}</button><p class="footer-tagline">함께 만들고, 입력하면서 익히는 중국어 학습 공간</p></footer>${state.sheet?renderEntitySheet():''}`;
  bindAuthBar();if(!study.session){if(state.mode==='manage')bindManage();if(state.mode==='quiz'&&study.type==='word'){if(state.screen==='setup')bindSetup();if(state.screen==='quiz')bindQuiz();if(state.screen==='result')bindResult();}}
  bindAcademy();bindTapHanzi();if(state.sheet)bindEntitySheet();
  if(currentUser?.app_metadata?.role!=='admin')app.querySelectorAll('#editCharBtn').forEach(el=>el.remove());
  app.querySelectorAll('.icon-btn').forEach(el=>{const text=el.textContent.trim();const names={'🔊':'발음 듣기','★':'즐겨찾기 해제','☆':'즐겨찾기','✕':'닫기','✏️':'수정','🗑️':'삭제'};if(names[text]){el.setAttribute('aria-label',names[text]);el.title=names[text];el.textContent=names[text];}});
  app.querySelectorAll('.chip,.chip-sm').forEach(el=>{el.tabIndex=0;el.setAttribute('role','checkbox');el.setAttribute('aria-checked',el.classList.contains('on'));el.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();el.click();}};});
};
function bindAcademy(){
  const on=(id,fn,event='click')=>{const el=document.getElementById(id);if(el)el.addEventListener(event,fn);};
  app.querySelectorAll('[data-route]').forEach(el=>el.onclick=()=>navigate(el.dataset.route));
  app.querySelectorAll('[data-type]').forEach(el=>el.onclick=()=>{study.type=el.dataset.type;render();});
  for(const field of ['category','count','starred','wrong'])on('scope-'+field,e=>{study[field]=e.target.type==='checkbox'?e.target.checked:e.target.value;savePrefs();render();},'change');
  on('hint-level',e=>{study.hint=Number(e.target.value);study.audioError=false;savePrefs();render();},'change');
  on('study-start',()=>{const mode=state.mode==='quiz'?'test':state.mode,items=selectedContent(mode==='test'?'sentence':null).slice(0,study.count==='all'?undefined:Number(study.count));if(!items.length)return;if(mode==='learn'){study.learn={items,index:0};render();}else startSession(items,mode);});
  const item=study.session?.items[study.session.index]||study.learn?.items[study.learn.index];
  on('audio',()=>playAudio(item));on('audio-fallback',()=>{study.hint=3;study.audioError=false;savePrefs();render();});on('study-star',()=>star(item));
  on('learn-prev',()=>{study.learn.index--;render();});on('learn-next',()=>{study.learn.index++;render();});on('learn-type',()=>{state.mode='typing';history.pushState(null,'','#/typing');previousHash=location.hash;startSession([item,...study.learn.items.filter(w=>contentKey(w)!==contentKey(item))],'typing');});
  app.querySelectorAll('[data-learn-content]').forEach(el=>el.onclick=()=>{const w=allContent().find(w=>contentKey(w)===el.dataset.learnContent);navigate('learn');study.learn={items:[w],index:0};render();});
  app.querySelectorAll('[data-learn]').forEach(el=>el.onclick=()=>{navigate('learn');study.learn={items:[allContent().find(w=>w.id===el.dataset.learn&&w.content_type==='word')],index:0};render();});
  const input=document.getElementById('ime-answer');if(input&&!study.session.result){const s=study.session;input.addEventListener('compositionstart',()=>{s.composing=true;});input.addEventListener('compositionend',()=>{s.composing=false;s.compositionEnded=performance.now();s.answer=input.value;if(s.started===null&&input.value)s.started=performance.now();});input.addEventListener('input',()=>{if(s.started===null&&input.value)s.started=performance.now();if(!s.composing)s.answer=input.value;});input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){if(e.isComposing||e.keyCode===229||s.composing)return;e.preventDefault();submitStudy();}});}
  on('word-retry-wrong',()=>{const wrong=state.quizResults.filter(r=>r.outcome!=='correct').map(r=>r.word);if(!wrong.length)return;state.quizWords=wrong;state.quizIndex=0;state.quizResults=[];state.input='';state.answered=false;state.screen='quiz';wordSessionAttempts=[];wordInputStarted=null;render();});
  on('study-submit',()=>submitStudy());on('study-skip',()=>submitStudy(true));on('study-next',()=>{const s=study.session;if(++s.index>=s.items.length)s.done=true;else{Object.assign(s,{answer:'',started:null,result:null,composing:false,compositionEnded:0});study.audioError=false;}render();});
  on('retry-wrong',()=>{const s=study.session;startSession(s.results.filter(r=>!r.is_correct).map(r=>r.item),s.mode);});on('study-reset',()=>{study.session=null;render();});
  app.querySelectorAll('[data-review-tab]').forEach(el=>el.onclick=()=>{study.reviewTab=el.dataset.reviewTab;render();});on('review-type',e=>{study.reviewType=e.target.value;render();},'change');on('review-sort',e=>{study.reviewSort=e.target.value;render();},'change');
  for(const action of ['review','audio','star'])app.querySelectorAll(`[data-${action}]`).forEach(el=>el.onclick=()=>{const w=allContent().find(w=>contentKey(w)===el.dataset[action]);if(action==='review')startSession([w],'review');else if(action==='audio')playAudio(w);else star(w);});
  on('academy-sync',async()=>{await syncAcademy();render();});on('guest-import',()=>{importGuestHistory();render();});
  on('legacy-import',async()=>{if(!currentUser)return;for(const sentence of readLocal('sentences',[]))if(!SENTENCES.some(s=>s.id===sentence.id))SENTENCES.push(sentence);for(const link of readLocal('sentenceWords',[]))if(!SENTENCE_WORDS.some(s=>s.sentenceId===link.sentenceId&&s.wordId===link.wordId))SENTENCE_WORDS.push(link);await persistSentencesLocal();await syncSentencesAfterLogin();render();});
  on('academy-export',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(historyData(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='xiaozhang-study-history.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  if(state.mode!=='manage'){on('exportBtn',exportWordsBackup);on('importBtn',()=>{navigate('vocabulary');state.manage.showImport=true;render();});}
}
// Keep the existing pinyin/Hanzi word grading and accumulated counters.
let wordSessionAttempts=[];
const oldRenderResult=renderResult;renderResult=function(){const rows=wordSessionAttempts;return oldRenderResult()+(rows.length?`<section class="card"><p>평균 정확도 ${Math.round(rows.reduce((n,r)=>n+r.accuracy,0)/rows.length)}% · 평균 입력 시간 ${(rows.reduce((n,r)=>n+r.elapsed_ms,0)/rows.length/1000).toFixed(1)}초</p><button class="btn" id="word-retry-wrong">오답만 다시 풀기</button><button class="btn" data-route="review">복습으로 이동</button></section>`:'');};
const originalRecordAnswer=recordAnswer;
recordAnswer=function(word,outcome){originalRecordAnswer(word,outcome);const result=Score.grade(word.hanzi,state.input);result.isCorrect=outcome==='correct';if(result.isCorrect)result.accuracy=100;wordSessionAttempts.push(saveAttempt({...word,content_type:'word'},state.input,result,wordInputStarted===null?0:Math.round(performance.now()-wordInputStarted),outcome==='passed','test'));};
let wordComposing=false,wordInputStarted=null,wordCompositionEnded=0;
const originalBindQuiz=bindQuiz,originalSubmitAnswer=submitAnswer,originalPassQuestion=passQuestion;
bindQuiz=function(){originalBindQuiz();const input=document.getElementById('answerInput');if(input){input.addEventListener('compositionstart',()=>{wordComposing=true;});input.addEventListener('compositionend',()=>{wordComposing=false;wordCompositionEnded=performance.now();state.input=input.value;});input.addEventListener('input',()=>{if(wordInputStarted===null&&input.value)wordInputStarted=performance.now();});input.addEventListener('keydown',e=>{if(e.isComposing||e.keyCode===229||wordComposing||e.key==='Tab'){e.stopImmediatePropagation();}},true);}};
submitAnswer=function(){if(wordComposing||performance.now()-wordCompositionEnded<80||state.answered)return;originalSubmitAnswer();};
passQuestion=function(){if(wordComposing||performance.now()-wordCompositionEnded<80||state.answered)return;originalPassQuestion();wordInputStarted=null;};
const originalAdvanceQuiz=advanceQuiz;advanceQuiz=function(){wordInputStarted=null;wordComposing=false;originalAdvanceQuiz();};
const originalStartQuiz=startQuiz;startQuiz=function(){wordSessionAttempts=[];wordInputStarted=null;study.starred=state.starredOnly;study.wrong=state.reviewMode;study.count=state.quizSize;study.category=state.selectedGroups.size===1?[...state.selectedGroups][0]:'';savePrefs();originalStartQuiz();};
pool=function(){const reviews=historyData().reviews;return WORDS.filter(w=>w.categories.some(c=>state.selectedGroups.has(c))&&(!state.starredOnly||isStarred(w.id))&&(!state.reviewMode||reviews['word:'+w.id]?.status==='wrong'));};
async function initializeAcademy(){
  app.innerHTML='<p role="status">학습 데이터를 불러오는 중입니다…</p>';
  try{await loadWordList();await loadPublicSentences();await loadStats();await loadCharacters();await loadSentences();await initAuth();await syncAcademy();
    const data=historyData();for(const [id,s] of Object.entries(wordStats)){if((s.wrong||s.passed)&&!data.reviews['word:'+id])data.reviews['word:'+id]={content_type:'word',content_id:id,wrong_count:s.wrong||s.passed,correct_count:s.correct||0,consecutive_correct:0,status:'wrong',last_attempt_at:s.lastSeen||new Date().toISOString()};}writeLocal(storageKey(),data);
    state.mode=routes[routeName()]||'missing';render();
  }catch(error){console.error(error);app.innerHTML='<div class="card"><h2>데이터를 불러오지 못했습니다</h2><p>네트워크 연결을 확인하고 다시 시도해주세요.</p><button class="btn" onclick="location.reload()">다시 시도</button></div>';}
}
async function loadPublicSentences(){
 const {data,error}=await supabaseClient.from('academy_sentences').select('*').eq('is_public',true).eq('status','active').order('id').limit(1000);
 if(error)return;
 if(data?.length)globalThis.ACADEMY_SENTENCES=data.map(r=>({id:r.id,hanzi:r.chinese_text,pinyin:r.pinyin,meaning:r.korean_text,categories:r.categories,accepted:r.accepted_answers||[],content_type:'sentence',is_public:true}));
}
let syncStatus='비회원 기록은 이 기기에 저장됩니다.';
let syncing=false;
async function syncAcademy(){
  if(!currentUser||syncing)return;
  syncing=true;
  const userId=currentUser.id,key=storageKey();
  try{
    const data=readLocal(key,{attempts:[],reviews:{}});
    for(const a of data.attempts.filter(a=>!a.synced)){
      const {error}=await supabaseClient.rpc('academy_record_attempt',{payload:a});
      if(error)throw error;
      const latest=readLocal(key,{attempts:[],reviews:{}}),saved=latest.attempts.find(x=>x.id===a.id);if(saved)saved.synced=true;writeLocal(key,latest);
    }
    const [{data:reviews,error:reviewError},{data:attempts,error:attemptError}]=await Promise.all([
      supabaseClient.from('academy_review_items').select('*').eq('user_id',userId).limit(1000),
      supabaseClient.from('academy_study_attempts').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(1000)
    ]);
    if(reviewError||attemptError)throw reviewError||attemptError;
    const latest=readLocal(key,{attempts:[],reviews:{}});
    const pendingKeys=new Set(latest.attempts.filter(a=>!a.synced).map(a=>a.content_type+':'+a.content_id));
    for(const r of reviews||[])if(!pendingKeys.has(r.content_type+':'+r.content_id))latest.reviews[r.content_type+':'+r.content_id]=r;
    for(const a of attempts||[])if(!latest.attempts.some(x=>x.id===a.id))latest.attempts.push({...a,synced:true});
    writeLocal(key,latest);syncStatus='학습 기록을 계정에 동기화했습니다.';
  }catch(error){syncStatus='기기에 저장했습니다. 서버 동기화가 대기 중입니다.';console.warn('Academy sync pending:',error.message);}
  finally{syncing=false;}
}
function importGuestHistory(){
  if(!currentUser)return;
  const guest=readLocal('academy.history.guest',{attempts:[],reviews:{}}),data=historyData();
  for(const a of guest.attempts){if(data.attempts.some(x=>x.id===a.id))continue;const copy={...a,user_id:currentUser.id,synced:false};data.attempts.push(copy);const key=a.content_type+':'+a.content_id,r=Score.updateReview(data.reviews[key],copy);if(r)data.reviews[key]=r;}
  writeLocal(storageKey(),data);void syncAcademy();
  for(const [id,old] of Object.entries(readLocal('wordStats',{}))){const now=wordStats[id]||{};wordStats[id]={...old,...now,starred:!!(old.starred||now.starred),wrong:Math.max(old.wrong||0,now.wrong||0),correct:Math.max(old.correct||0,now.correct||0),seen:Math.max(old.seen||0,now.seen||0),passed:Math.max(old.passed||0,now.passed||0)};}void persistStats();
}
initializeAcademy();
