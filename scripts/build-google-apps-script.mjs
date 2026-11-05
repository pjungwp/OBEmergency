import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
let html=read("index.html"),css=read("styles.css"),data=read("data.js"),pathways=read("pathways.js"),edudecks=read("edu-decks.js"),flow=read("flowchart.js"),local=read("local-session-store.js"),workspace=read("google-apps-script/workspace-session-store.js"),app=read("app.js");
data=data.replace(/^export /gm,"");pathways=pathways.replace(/^export /gm,"");edudecks=edudecks.replace(/^export /gm,"");flow=flow.replace(/^export \{[^}]*\};?\n?/gm,"").replace(/^export /gm,"");local=local.replace(/^export /gm,"");workspace=workspace.replace(/^export /gm,"");
// Engine modules (ES modules in the PWA) become plain script blocks here.
const ENGINE=["back-guard.js","cockpit-config.js","task-engine.js","decisions.js","clock.js","alerts.js","medications.js","history.js","dystocia.js","cockpit.js"];
const exportsOf={};
const engine=ENGINE.map(f=>{const src=read(f);exportsOf[f]=[...src.matchAll(/^export (?:const|function|class) ([A-Za-z_$][\w$]*)/gm)].map(m=>m[1]);return src.replace(/^import .*;\n/gm,"").replace(/^export /gm,"");}).join("\n");
// import * as X from "./f.js"  →  const X={...};   import {a as b} → const b=a;
const aliases=[];
const lean=name=>{const stem=name.replace(/\.(png|jpe?g)$/i,"");if(stem!==name&&fs.existsSync(path.join(root,"img",stem+".webp")))name=stem+".webp";return name==="aurora-1600.webp"?"aurora-900.webp":name;};
const mimeFor=name=>({png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",svg:"image/svg+xml"}[path.extname(name).slice(1).toLowerCase()]||"application/octet-stream");
app.replace(/^import \* as (\w+) from "\.\/([^"]+)";$/gm,(m,name,file)=>{aliases.push(`const ${name}={${(exportsOf[file]||[]).join(",")}};`);return m;});
app.replace(/^import \{([^}]*)\} from "[^"]+";$/gm,(m,list)=>{list.split(",").forEach(x=>{const r=x.trim().match(/^(\w+) as (\w+)$/);if(r)aliases.push(`const ${r[2]}=${r[1]};`);});return m;});
app=app.replace(/^import .*;\n/gm,"").replace("createLocalSessionStore({key:STORAGE_KEY})","createWorkspaceSessionStore({key:STORAGE_KEY})");
app=app.replace(/if\("serviceWorker" in navigator\).*?;\n/,"");
const iconFiles=["icon-pph.webp","icon-pph.png","icon-htn.webp","icon-htn.png","icon-eclampsia.webp","icon-eclampsia.png","icon-arrest.webp","icon-arrest.png","icon-trauma.webp","icon-trauma.png","icon-shoulder.webp","icon-shoulder.png"];
const iconData=Object.fromEntries(iconFiles.filter(n=>!n.endsWith(".webp")).map(name=>[name,`data:${mimeFor(lean(name))};base64,${fs.readFileSync(path.join(root,"img",lean(name))).toString("base64")}`]));
app=app.replace('srcset="img/${n}.webp"><img src="img/${n}.png"','srcset="${GAS_ICON_DATA[`${n}.webp`]}"><img src="${GAS_ICON_DATA[`${n}.png`]}"');
app=`const GAS_ICON_DATA=${JSON.stringify(iconData)};\n${app}`;
html=html.replace(/\s*<link rel="manifest"[^>]*>/,"").replace(/\s*<link rel="icon"[^>]*>/,"").replace(/\s*<link rel="apple-touch-icon"[^>]*>/,"");
html=html.replace(/\s*<link rel="stylesheet" href="styles.css">/,()=>`\n  <style>${css}</style>`);
html=html.replace(/\s*<script type="module" src="app.js"><\/script>/,()=>`\n  <script>\n${data}\n${pathways}\n${edudecks}\n${flow}\n${local}\n${workspace}\n${engine}\n${aliases.join("\n")}\n${app}\n  </script>`);
// Inline images are single-variant: drop responsive <source>/srcset/preload
// duplicates so each image is embedded once (keeps the file paste-sized).
html=html.replace(/<link rel="preload" as="image"[^>]*>\s*/g,"").replace(/<source type="image\/webp"[^>]*>\s*/g,"").replace(/\s(?:srcset|sizes)="[^"]*"/g,"");
// HtmlService has no static-file directory. Inline referenced app images so
// the Workspace build does not leave broken relative img/ URLs.
html=html.replace(/img\/([A-Za-z0-9._-]+\.(?:png|jpe?g|webp|svg))/gi,(url,name)=>{
  name=lean(name);
  const asset=path.join(root,"img",name);
  if(!fs.existsSync(asset))throw new Error(`Missing Apps Script image asset: ${name}`);
  return `data:${mimeFor(name)};base64,${fs.readFileSync(asset).toString("base64")}`;
});
// The Apps Script build uses online Workspace services and keeps details on
// each device. Keep the About panel accurate for this hosting target.
html=html.replaceAll("Stored only in this browser","Clinical details stay on this device; shared coordination events use your Google Workspace");
html=html.replaceAll("Core content available offline after first successful load","Requires an active Google Workspace connection");
html=html.replaceAll("Planned Workspace transition","Workspace coordination");
html=html.replaceAll("The state engine uses event-style actions so a later Google Workspace adapter can synchronize session codes, task ownership, medication events and timelines across devices.","Shared sessions synchronize task status and timing only. Medication details and the local timeline remain on this device.");
fs.writeFileSync(path.join(root,"google-apps-script/Index.html"),html);
console.log("Built google-apps-script/Index.html from the shared clinical UI.");
