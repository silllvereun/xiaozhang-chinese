const fs=require('node:fs'),path=require('node:path');
require('./check');
const out=path.resolve('dist');fs.mkdirSync(out,{recursive:true});
const assets=['index.html','academy.js','scoring.js','sentences.js','branding.js','academy.css','favicon.svg','robots.txt','sitemap.xml'];
for(const file of assets)fs.copyFileSync(file,path.join(out,file));
if(fs.existsSync('assets'))fs.cpSync('assets',path.join(out,'assets'),{recursive:true});
const html=fs.readFileSync('index.html','utf8');
for(const route of ['vocabulary','learn','typing','test','review','manage','quiz','sentence','notes']){
  fs.mkdirSync(path.join(out,route),{recursive:true});
  fs.writeFileSync(path.join(out,route,'index.html'),html.replace('<head>','<head>\n<base href="../">'));
}
fs.writeFileSync(path.join(out,'404.html'),'<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>페이지를 찾을 수 없습니다 · 샤오장학당</title><h1>페이지를 찾을 수 없습니다</h1><a href="'+(process.env.PAGES_BASE_PATH||'/')+'">학습으로 돌아가기</a></html>');
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log('Static build created in dist; route entry points included.');
