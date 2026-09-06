(function(root){
  'use strict';
  function normalizeAnswer(value){
    return String(value ?? '').normalize('NFKC').trim().replace(/[,，.。?？!！]/gu,'').replace(/(?<=\p{Script=Han})\s+(?=\p{Script=Han})/gu,'');
  }
  function align(correct, answer){
    const a=Array.from(correct), b=Array.from(answer);
    const d=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
    for(let i=0;i<=a.length;i++) d[i][0]=i;
    for(let j=0;j<=b.length;j++) d[0][j]=j;
    for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    let i=a.length,j=b.length; const diff=[];
    while(i||j){
      if(i&&j&&d[i][j]===d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)) {diff.push({kind:a[i-1]===b[j-1]?'equal':'replace',correct:a[--i],answer:b[--j]});}
      else if(i&&d[i][j]===d[i-1][j]+1) diff.push({kind:'delete',correct:a[--i],answer:''});
      else diff.push({kind:'insert',correct:'',answer:b[--j]});
    }
    return {distance:d[a.length][b.length],diff:diff.reverse(),length:Math.max(a.length,b.length)};
  }
  function grade(correct,answer,accepted=[]){
    const normalized=normalizeAnswer(answer);
    const candidates=[correct,...accepted].map(normalizeAnswer);
    const target=candidates.includes(normalized)?normalized:candidates[0];
    const result=align(target,normalized);
    return {...result,normalized,isCorrect:!!normalized&&candidates.includes(normalized),accuracy:normalized?Math.round(Math.max(0,1-result.distance/(result.length||1))*100):0};
  }
  function updateReview(previous,attempt){
    if(!previous&&attempt.is_correct&&!attempt.skipped) return null;
    const r={wrong_count:0,correct_count:0,consecutive_correct:0,...previous,content_type:attempt.content_type,content_id:attempt.content_id,last_attempt_at:attempt.created_at};
    if(attempt.is_correct&&!attempt.skipped){r.correct_count++;r.consecutive_correct++;r.status=r.consecutive_correct>=3?'mastered':'scheduled';r.next_review_at=new Date(Date.parse(attempt.created_at)+86400000).toISOString();}
    else {r.wrong_count++;r.consecutive_correct=0;r.status='wrong';r.next_review_at=attempt.created_at;}
    return r;
  }
  const api={normalizeAnswer,align,grade,updateReview};
  if(typeof module!=='undefined') module.exports=api; else root.AcademyScore=api;
})(globalThis);
