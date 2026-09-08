import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './community-render.mjs';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
http.createServer((req,res)=>{try{const url=new URL(req.url,'http://localhost');let rel=decodeURIComponent(url.pathname);if(/^\/(?:docs|automation|scripts|tests|content_sources|\.)/.test(rel)){res.writeHead(404);res.end();return;}let p=path.resolve(ROOT,'.'+rel);if(!p.startsWith(ROOT+path.sep)&&p!==ROOT)throw Error();if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');if(!fs.existsSync(p)){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(p).pipe(res);}catch{res.writeHead(400);res.end();}}).listen(4195,'127.0.0.1',()=>console.log('Community preview: http://127.0.0.1:4195/community/'));
