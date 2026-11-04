// Test-only static host: deliberately mount under the GitHub Pages subdirectory.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');let generation=0;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
http.createServer(async(req,res)=>{
  if(req.url==='/__test-version'&&req.method==='POST'){generation++;res.end('ok');return;}
  const url=new URL(req.url,'http://localhost');
  if(!url.pathname.startsWith('/paper-days/')){res.writeHead(404);res.end();return;}
  const name=decodeURIComponent(url.pathname.slice('/paper-days/'.length))||'index.html';
  const file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try {let data=await readFile(file);if(name==='sw.js')data=Buffer.concat([data,Buffer.from(`\n// test-build ${generation}\n`)]);res.setHeader('content-type',types[path.extname(file)]||'application/octet-stream');res.setHeader('cache-control','no-store');res.end(data);}
  catch{res.writeHead(404);res.end();}
}).listen(5180,'127.0.0.1',()=>console.log('Production subpath host ready'));
