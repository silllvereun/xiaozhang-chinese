const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.argv[2]||'.'),port=Number(process.env.PORT||4173);
http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');let name;try{name=decodeURIComponent(url.pathname);}catch{res.writeHead(400).end();return;}
 let file=path.resolve(root,'.'+name);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory()){if(!name.endsWith('/')){res.writeHead(301,{Location:name+'/'+url.search}).end();return;}file=path.join(file,'index.html');}
 if(!fs.existsSync(file)){res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'}).end('<h1>페이지를 찾을 수 없습니다</h1>');return;}
 const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.xml':'application/xml','.txt':'text/plain'};res.writeHead(200,{'Content-Type':(mime[path.extname(file)]||'application/octet-stream')+'; charset=utf-8'});fs.createReadStream(file).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:'+port));
