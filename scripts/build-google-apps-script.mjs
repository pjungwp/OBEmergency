import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const inlineAsset=(file,mime)=>`data:${mime};base64,${fs.readFileSync(path.join(root,file)).toString("base64")}`;
let html=read("index.html"),css=read("styles.css"),data=read("data.js"),local=read("local-session-store.js"),workspace=read("google-apps-script/workspace-session-store.js"),app=read("app.js");
data=data.replace(/^export /gm,"");local=local.replace(/^export /gm,"");workspace=workspace.replace(/^export /gm,"");
app=app.replace(/^import .*;\n/gm,"").replace("createLocalSessionStore({key:STORAGE_KEY})","createWorkspaceSessionStore({key:STORAGE_KEY})");
app=app.replace(/\/\/ SERVICE_WORKER_START[\s\S]*?\/\/ SERVICE_WORKER_END\n/,"");
const assets={
  "icons/ping-avatar.png":inlineAsset("icons/ping-avatar.png","image/png"),
  "flowcharts/pph.jpg":inlineAsset("flowcharts/pph.jpg","image/jpeg"),
  "flowcharts/htn.jpg":inlineAsset("flowcharts/htn.jpg","image/jpeg"),
  "flowcharts/eclampsia.jpg":inlineAsset("flowcharts/eclampsia.jpg","image/jpeg")
  ,"flowcharts/cardiac.jpg":inlineAsset("flowcharts/cardiac.jpg","image/jpeg")
};
for(const [asset,uri] of Object.entries(assets)){html=html.replaceAll(asset,uri);app=app.replaceAll(asset,uri);}
html=html.replace(/\s*<link rel="manifest"[^>]*>/,"").replace(/\s*<link rel="icon"[^>]*>/,"").replace(/\s*<link rel="apple-touch-icon"[^>]*>/,"");
html=html.replace(/\s*<link rel="stylesheet" href="styles.css">/,`\n  <style>${css}</style>`);
html=html.replace(/\s*<script type="module" src="app.js"><\/script>/,`\n  <script>\n${data}\n${local}\n${workspace}\n${app}\n  </script>`);
fs.writeFileSync(path.join(root,"google-apps-script/Index.html"),html);
console.log("Built google-apps-script/Index.html from the shared clinical UI.");
