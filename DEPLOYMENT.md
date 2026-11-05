# Deployment: Netlify + Google Apps Script from one source

GitHub is the source of truth. Nobody edits the Google files by hand: `npm run build:gas` generates
`dist/gas/` (Index.html = Assist, SimMaster.html = facilitator, Code.gs, appsscript.json) from the
same code Netlify serves. `.github/workflows/pipeline.yml` does the rest.

| You push to | Netlify | Apps Script |
| --- | --- | --- |
| `preview` | preview site (automatic) | **staging** deployment (automatic, after tests) |
| `main` | live site (automatic) | **production** deployment — waits for your approval in GitHub |

Tests run on every push; nothing deploys to Google if they fail. Each run keeps the built package
as a downloadable artifact (30 days) for rollback.

## What differs on Apps Script (handled by the build — no extra work)

- Session store: device-only → Workspace (`google.script.run`) shared store
- No service worker / offline install (Apps Script cannot host one)
- Images embedded in the page (Apps Script serves no static files; hospital networks may block Netlify)
- Page links go through the web-app URL: Sim Master = `…/exec?page=sim`, practice mode = `…/exec?practice=1`
- Phone back button: handled by the browser (Apps Script runs inside a sandboxed frame)
- Sim Master's separate monitor window is hidden; use "On this device"

## One-time setup (about 15 minutes)

1. **Check the account.** If you use a Holy Name Workspace account, confirm IT allows the Apps
   Script API for your account (script.google.com/home/usersettings → Google Apps Script API: On).
   A personal Google account has no such restriction.
2. **Create the Apps Script project** at script.google.com → New project → name it
   "OB Emergency Assist". Project Settings → copy the **Script ID**.
3. **Log in once on your computer**
   ```bash
   npm install -g @google/clasp@3
   clasp login
   ```
   This creates `~/.clasprc.json` in your home folder. Never commit it.
4. **First push and deployments** (from the repo folder)
   ```bash
   npm run build:gas
   echo '{"scriptId":"PASTE_SCRIPT_ID","rootDir":"dist/gas"}' > .clasp.json
   clasp push --force
   clasp create-deployment --description "staging"      # note the deployment ID it prints
   clasp create-deployment --description "production"   # note this one too
   ```
   Both are web apps that only you can open (`appsscript.json` → `webapp.access: MYSELF`). Open the
   staging URL once in your browser and approve the permissions. To let colleagues in later, change
   `access` to `DOMAIN` in `google-apps-script/appsscript.json` and push.
5. **Give GitHub the keys** (repo → Settings → Secrets and variables → Actions):
   - Secret `CLASPRC_JSON`: the full contents of `~/.clasprc.json`
   - Variable `GAS_SCRIPT_ID`: the Script ID
   - Variable `GAS_STAGING_DEPLOYMENT_ID`: the staging deployment ID
   - Variable `GAS_DEPLOYMENT_ID`: the production deployment ID
6. **Require approval for production**: Settings → Environments → `production` → Required
   reviewers → add yourself.

After that: push to preview → staging updates; push to main → approve in GitHub → production
updates at the same URL.

## Manual / emergency

- Run the workflow by hand: Actions → "Test, build and deploy" → Run workflow → staging or production.
- Roll back: Apps Script → Deploy → Manage deployments → edit production → pick an earlier version.
- If the Google login expires (deploy step fails with an auth error), repeat step 3 and update `CLASPRC_JSON`.
