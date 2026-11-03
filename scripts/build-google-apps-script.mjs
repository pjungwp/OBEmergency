import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
let html=read("index.html"),css=read("styles.css"),data=read("data.js"),pathways=read("pathways.js"),edudecks=read("edu-decks.js"),flow=read("flowchart.js"),local=read("local-session-store.js"),workspace=read("google-apps-script/workspace-session-store.js"),app=read("app.js");
data=data.replace(/^export /gm,"");pathways=pathways.replace(/^export /gm,"");edudecks=edudecks.replace(/^export /gm,"");flow=flow.replace(/^export \{[^}]*\};?\n?/gm,"").replace(/^export /gm,"");local=local.replace(/^export /gm,"");workspace=workspace.replace(/^export /gm,"");
app=app.replace(/^import .*;\n/gm,"").replace("createLocalSessionStore({key:STORAGE_KEY})","createWorkspaceSessionStore({key:STORAGE_KEY})");
app=app.replace(/if\("serviceWorker" in navigator\).*?;\n/,"");
html=html.replace(/\s*<link rel="manifest"[^>]*>/,"").replace(/\s*<link rel="icon"[^>]*>/,"").replace(/\s*<link rel="apple-touch-icon"[^>]*>/,"");
html=html.replace(/\s*<link rel="stylesheet" href="styles.css">/,()=>`\n  <style>${css}</style>`);
html=html.replace(/\s*<script type="module" src="app.js"><\/script>/,()=>`\n  <script>\n${data}\n${pathways}\n${edudecks}\n${flow}\n${local}\n${workspace}\n${app}\n  </script>`);
fs.writeFileSync(path.join(root,"google-apps-script/Index.html"),html);
console.log("Built google-apps-script/Index.html from the shared clinical UI.");
