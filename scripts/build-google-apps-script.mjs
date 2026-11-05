// Builds the Google Apps Script web app from the same source the Netlify PWA runs.
// Output: dist/gas/  (Code.gs, appsscript.json, Index.html, SimMaster.html) — never edit it by hand.
//
// What changes on Apps Script (and only here):
//  • ES modules are bundled into one inline script per page (mini bundler below; new modules are picked up automatically)
//  • CSS is inlined; images are embedded as data URIs (Apps Script cannot serve static files,
//    and hospital networks may block the Netlify host)
//  • device-only session store → Workspace (google.script.run) session store
//  • no service worker / manifest (not supported inside Apps Script)
//  • links between pages and ?practice=1 go through the web app URL (?page=sim)
//  • the in-app back-button guard is off (Apps Script runs inside a sandboxed frame)
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const out=path.join(root,"dist/gas");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const pkg=JSON.parse(read("package.json"));

// ---------- mini ES-module bundler ----------
export function bundle(entry,overrides={}){
  const defs=new Map();
  const visit=f=>{
    if(defs.has(f))return;defs.set(f,null);
    let src=overrides[f]??read(f);const names=[];
    const dep=(spec,from)=>path.posix.normalize(path.posix.join(path.posix.dirname(from),spec));
    src=src.replace(/^import\s+\*\s+as\s+(\w+)\s+from\s+"(\.[^"]+)";?[ \t]*$/gm,(m,n,p)=>{const d=dep(p,f);visit(d);return `const ${n}=__m(${JSON.stringify(d)});`;});
    src=src.replace(/^import\s+\{([^}]*)\}\s+from\s+"(\.[^"]+)";?[ \t]*$/gm,(m,list,p)=>{const d=dep(p,f);visit(d);
      const parts=list.split(",").map(x=>x.trim()).filter(Boolean).map(x=>{const r=x.match(/^(\w+)\s+as\s+(\w+)$/);return r?`${r[1]}:${r[2]}`:x;});
      return `const {${parts.join(",")}}=__m(${JSON.stringify(d)});`;});
    src=src.replace(/^export\s+\{([^}]*)\};?[ \t]*$/gm,(m,list)=>{names.push(...list.split(",").map(x=>x.trim()).filter(Boolean));return "";});
    src=src.replace(/^export\s+(async\s+function\*?|function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm,(m,kw,n)=>{names.push(n);return `${kw} ${n}`;});
    if(/^\s*(import|export)\s/m.test(src))throw new Error(`${f}: import/export form the Apps Script bundler does not handle`);
    defs.set(f,`${JSON.stringify(f)}:function(){\n${src}\nreturn {${[...new Set(names)].join(",")}};}`);
  };
  visit(entry);
  return `(function(){"use strict";const __d={${[...defs.values()].join(",\n")}};const __c={};function __m(p){if(!(p in __c)){__c[p]=null;__c[p]=__d[p]();}return __c[p];}__m(${JSON.stringify(entry)});})();`;
}

// ---------- assets (data URIs) ----------
const mime={webp:"image/webp",png:"image/png",jpg:"image/jpeg",svg:"image/svg+xml"};
const dataURI=f=>`data:${mime[path.extname(f).slice(1)]};base64,${fs.readFileSync(path.join(root,f)).toString("base64")}`;
// Each image is embedded once (data); every name a page may use points at it (alias).
function assetMap(){
  const data={},alias={};
  for(const f of fs.readdirSync(path.join(root,"img")))if(f.endsWith(".webp")&&!/-1600|^splash\.webp$/.test(f)){const k=`img/${f}`,b=k.replace(/\.webp$/,"");data[k]=dataURI(k);alias[k]=alias[b+".png"]=alias[b+".jpg"]=k;}
  alias["img/splash.jpg"]=alias["img/splash.webp"]="img/splash-640.webp";
  for(const k of ["icons/favicon-48.png","icons/apple-touch-icon.png"]){data[k]=dataURI(k);alias[k]=k;}
  return {data,alias,get:k=>data[alias[k]]};
}

// Runs before the app: platform flags, image/link rewriting. Plain script, no modules.
const shim=A=>`<script>
window.__GAS=true;window.__APP_VERSION=${JSON.stringify(pkg.version)};
window.__GAS_QS=<?!= JSON.stringify(qs) ?>;window.__GAS_BASE=<?!= JSON.stringify(base) ?>;
(function(){var D=${JSON.stringify(A.data)},L=${JSON.stringify(A.alias)};
  window.__ASSET=function(k){return D[L[k]]||"";};
  function fix(u){if(!u||u.indexOf("data:")===0)return u;var k=u.replace(/^\\.\\//,"").split("?")[0];return D[L[k]]||u;}
  function img(el){if(el.tagName==="SOURCE"){el.remove();return;}el.removeAttribute("srcset");var s=el.getAttribute("src");var f=fix(s);if(f!==s)el.setAttribute("src",f);}
  function link(a){var h=a.getAttribute("href");if(!h||/^(https?:|#|mailto:|tel:|data:|blob:)/.test(h))return;var b=window.__GAS_BASE;
    var u=/^sim-master\\.html/.test(h)?b+"?page=sim":/^index\\.html\\?practice=1/.test(h)?b+"?practice=1":/^(\\.\\/|index\\.html)$/.test(h)?b:/^sim-monitor\\.html/.test(h)?null:"";
    if(u===null){a.hidden=true;return;}if(u){a.setAttribute("href",u);a.setAttribute("target","_top");}}
  function walk(n){if(n.nodeType!==1)return;if(n.matches("img,source"))img(n);if(n.matches("a[href]"))link(n);n.querySelectorAll("img,source,a[href]").forEach(function(x){x.tagName==="A"?link(x):img(x);});}
  new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(walk);});}).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener("DOMContentLoaded",function(){walk(document.documentElement);});
})();
</script>`;

const cssWithAssets=(css,A)=>css.replace(/url\((["']?)(img\/[\w.-]+)\1\)/g,(m,q,f)=>`url(${A.get(f)||f})`);
function page(htmlFile,cssFile,entry,overrides,A){
  let html=read(htmlFile);
  html=html.replace(/\s*<link rel="(manifest|icon|apple-touch-icon|preload)"[^>]*>/g,"");
  html=html.replace(/<style>([\s\S]*?)<\/style>/g,(m,c)=>`<style>${cssWithAssets(c,A)}</style>`);
  html=html.replace(/<meta charset="utf-8">/,m=>`${m}\n  ${shim(A)}`);
  html=html.replace(new RegExp(`\\s*<link rel="stylesheet" href="${cssFile}">`),()=>`\n  <style>${cssWithAssets(read(cssFile),A)}</style>`);
  html=html.replace(new RegExp(`\\s*<script type="module" src="${entry}"></script>`),()=>`\n  <script>\n${bundle(entry,overrides)}\n  </script>`);
  if(/<script type="module"/.test(html))throw new Error(`${htmlFile}: module script left unbundled`);
  if(/<\?(?![!=])/.test(html.replace(/<\?!= [^?]*\?>/g,"")))throw new Error(`${htmlFile}: stray "<?" would break the Apps Script template`);
  return html;
}

export function build(){
  const A=assetMap();
  let app=read("app.js");
  app=app.replace('import {createLocalSessionStore} from "./local-session-store.js";','import {createWorkspaceSessionStore} from "./google-apps-script/workspace-session-store.js";')
    .replace("createLocalSessionStore({key:STORAGE_KEY})","createWorkspaceSessionStore({key:STORAGE_KEY})")
    .replace(/if\("serviceWorker" in navigator\).*?;\n/,"")
    .replace("new URLSearchParams(location.search)","new URLSearchParams(window.__GAS_QS||location.search)");
  if(!app.includes("createWorkspaceSessionStore({key"))throw new Error("app.js: session store hook not found");
  fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,"Index.html"),page("index.html","styles.css","app.js",{"app.js":app},A));
  fs.writeFileSync(path.join(out,"SimMaster.html"),page("sim-master.html","sim-master.css","sim-master.js",{},A));
  for(const f of ["Code.gs","appsscript.json"])fs.copyFileSync(path.join(root,"google-apps-script",f),path.join(out,f));
  return out;
}

if(import.meta.url===`file://${process.argv[1]}`){build();console.log(`Built ${path.relative(root,out)}/ (Index.html, SimMaster.html, Code.gs, appsscript.json) · v${pkg.version}`);}
