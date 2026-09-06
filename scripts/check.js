const fs=require('node:fs'),vm=require('node:vm');
for(const f of ['academy.js','scoring.js','sentences.js','branding.js'])new vm.Script(fs.readFileSync(f,'utf8'),{filename:f});
const html=fs.readFileSync('index.html','utf8');
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
for(const f of ['index.html','academy.js','scoring.js']){
 const source=fs.readFileSync(f,'utf8');
 if(/(?:sk-[A-Za-z0-9]{20,}|-----BEGIN (?:RSA )?PRIVATE KEY-----)/.test(source))throw Error('Potential secret in '+f);
 for(const token of source.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[]){const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));if(claims.role!=='anon')throw Error('Non-public JWT in '+f);}
}
console.log('JavaScript syntax and public-key checks passed.');
for(const f of ['index.html','academy.js','README.md'])if(/\?{3,}/.test(fs.readFileSync(f,'utf8')))throw Error('Possible text encoding corruption in '+f);
