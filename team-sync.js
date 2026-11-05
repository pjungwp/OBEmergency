// Team sync: share one live session across phones through Firebase Realtime Database.
//
// Local-first: every tap is applied on this phone immediately (the local store stays the
// source of truth while offline); when team sharing is on, a coordination snapshot is
// pushed to Firebase and changes from other phones stream back in.
//
// Only the coordination snapshot leaves the device — the same shareable subset the
// Workspace adapter uses: task status, timers (without medication ids), clock and decisions.
// The private event log, dose counts and medication ids stay on each phone.
//
// Concurrency: the database rules accept a snapshot only when its revision is exactly
// one more than the stored revision. If two phones tap at once, the second write is
// refused; that phone loads the latest shared state and asks the user to re-check.
//
// Uses Firebase REST + server-sent events (no SDK), with anonymous sign-in.
import {createLocalSessionStore} from "./local-session-store.js";

const TEAM_KEY = "ob-emergency-assist.team.v1";
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));

export function randomString(n, alphabet = CODE_ALPHABET){
  const bytes = new Uint8Array(n); globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
}
export function normalizeCode(raw){ return String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/[01ILO]/g, c => ({"0":"","O":"","1":"","I":"","L":""}[c])).slice(0, 6); }
export function formatCode(code){ return code ? `${code.slice(0,3)}-${code.slice(3)}` : ""; }

// What other phones may see (mirrors the Workspace adapter's coordination snapshot).
export function coordinationSnapshot(session){
  const clean = clone(session);
  delete clean._actionEvents; delete clean.events; delete clean.doseCounts; delete clean._teamReset;
  clean.timers = (clean.timers || []).map(({medId, ...timer}) => timer);
  return clean;
}

export function teamSyncConfigured(config){ return !!(config && config.apiKey && config.databaseURL); }

export function createTeamSessionStore({
  config, key, storage = globalThis.localStorage,
  fetchImpl = (...a) => globalThis.fetch(...a),
  EventSourceImpl = globalThis.EventSource,
  now = () => Date.now()
} = {}){
  const local = createLocalSessionStore({key, storage});
  const enabled = teamSyncConfigured(config);
  const db = enabled ? config.databaseURL.replace(/\/$/, "") : "";
  const authBase = config?.authURL || "https://identitytoolkit.googleapis.com/v1";
  const tokenBase = config?.tokenURL || "https://securetoken.googleapis.com/v1";
  const statusListeners = new Set();
  let team = readTeam();          // {code, room, sessionId} while sharing
  let auth = readAuth();          // {idToken, refreshToken, expiresAt}
  let stream = null, retryTimer = null, retryMs = 1000;
  let state = team ? "connecting" : "off", lastSync = null;

  function readTeam(){ try { return JSON.parse(storage.getItem(TEAM_KEY) || "null"); } catch { return null; } }
  function writeTeam(t){ try { t ? storage.setItem(TEAM_KEY, JSON.stringify(t)) : storage.removeItem(TEAM_KEY); } catch {} }
  function readAuth(){ try { return JSON.parse(storage.getItem(TEAM_KEY + ".auth") || "null"); } catch { return null; } }
  function writeAuth(a){ try { storage.setItem(TEAM_KEY + ".auth", JSON.stringify(a)); } catch {} }
  function setState(s){ if(s === "live") lastSync = now(); state = s; const st = status(); statusListeners.forEach(fn => { try { fn(st); } catch {} }); }
  function status(){ return {enabled, state, code: team?.code || null, lastSync}; }

  async function token(){
    if(auth && auth.expiresAt - 60000 > now()) return auth.idToken;
    if(auth?.refreshToken){
      const r = await fetchImpl(`${tokenBase}/token?key=${encodeURIComponent(config.apiKey)}`, {
        method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(auth.refreshToken)}`
      });
      if(r.ok){ const j = await r.json(); auth = {idToken: j.id_token, refreshToken: j.refresh_token, expiresAt: now() + Number(j.expires_in || 3600) * 1000}; writeAuth(auth); return auth.idToken; }
    }
    const r = await fetchImpl(`${authBase}/accounts:signUp?key=${encodeURIComponent(config.apiKey)}`, {
      method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({returnSecureToken: true})
    });
    if(!r.ok) throw new Error("Team sign-in failed");
    const j = await r.json();
    auth = {idToken: j.idToken, refreshToken: j.refreshToken, expiresAt: now() + Number(j.expiresIn || 3600) * 1000}; writeAuth(auth);
    return auth.idToken;
  }
  const url = async path => `${db}/${path}.json?auth=${encodeURIComponent(await token())}`;
  async function get(path){ const r = await fetchImpl(await url(path)); if(!r.ok) throw Object.assign(new Error("read failed"), {status: r.status}); return r.json(); }
  async function put(path, value){ const r = await fetchImpl(await url(path), {method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify(value)}); return r.ok ? {ok: true} : {ok: false, status: r.status}; }

  // Keep this phone's private parts; take shared parts from the remote snapshot.
  function mergeRemote(remote, {force = false, conflict = false} = {}){
    if(!remote) return null;
    const {_teamReset, ...mine} = local.loadSession() || {};
    if(!force && mine.id === remote.id && Number(remote.revision || 0) <= Number(mine.revision || 0)) return null;
    const merged = {...mine, ...clone(remote),
      events: mine.id === remote.id ? (mine.events || []) : (remote.events || []),
      doseCounts: mine.id === remote.id ? (mine.doseCounts || {}) : {},
      _actionEvents: mine.id === remote.id ? (mine._actionEvents || []) : []};
    if(!Array.isArray(merged.events)) merged.events = [];
    delete merged._teamReset;
    if(conflict) merged._teamReset = true;
    return local.replaceAuthoritative(merged);
  }

  function stopStream(){ clearTimeout(retryTimer); retryTimer = null; if(stream){ try { stream.close(); } catch {} stream = null; } }
  async function startStream(){
    stopStream();
    if(!team || !EventSourceImpl) return;
    setState(state === "live" ? "live" : "connecting");
    let es;
    try { es = new EventSourceImpl(await url(`sessions/${team.room}/snap`)); }
    catch { scheduleRetry(); return; }
    stream = es;
    const onData = ev => {
      retryMs = 1000; setState("live");
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if(!msg || msg.path !== "/" || !msg.data) return; // snapshots are always written whole
      mergeRemote(msg.data);
    };
    es.addEventListener("put", onData);
    es.addEventListener("patch", onData);
    es.addEventListener("keep-alive", () => setState("live"));
    es.addEventListener("auth_revoked", () => { auth = null; startStream(); });
    es.addEventListener("cancel", () => { setState("offline"); scheduleRetry(); });
    es.onerror = () => { if(es.readyState === 2){ setState("offline"); scheduleRetry(); } else if(state === "live") setState("offline"); };
  }
  function scheduleRetry(){ clearTimeout(retryTimer); if(!team) return; retryTimer = setTimeout(startStream, retryMs); retryMs = Math.min(retryMs * 2, 30000); }

  let pushChain = Promise.resolve();
  function push(session){
    if(!team || session?.id !== team.sessionId) return pushChain;
    const snap = coordinationSnapshot(session);
    pushChain = pushChain.then(async () => {
      try {
        const r = await put(`sessions/${team.room}/snap`, snap);
        if(r.ok){ setState("live"); return; }
        // Refused: another phone saved first. Load the shared state on this phone.
        const remote = await get(`sessions/${team.room}/snap`);
        if(remote) mergeRemote(remote, {force: true, conflict: true});
      } catch { setState("offline"); }
    });
    return pushChain;
  }

  if(enabled && team) startStream();

  return {
    teamEnabled: enabled,
    createSession(seed){ const s = local.createSession(seed); if(team && team.sessionId !== s.id) this.leaveTeam(); return s; },
    loadSession(){ return local.loadSession(); },
    recordAction(input){ const result = local.recordAction(input); if(result.applied) push(result.session); return result; },
    subscribe(listener){ return local.subscribe(listener); },
    replaceAuthoritative(next){ return local.replaceAuthoritative(next); },
    clear(){ this.leaveTeam(); local.clear(); },

    // ---- team ----
    teamStatus: status,
    onTeamStatus(fn){ statusListeners.add(fn); return () => statusListeners.delete(fn); },
    async shareSession(){
      if(!enabled) throw new Error("Team sync is not configured");
      const session = local.loadSession();
      if(!session) throw new Error("No active session");
      if(team && team.sessionId === session.id) return status();
      for(let attempt = 0; attempt < 5; attempt++){
        const code = randomString(6), room = randomString(22, "abcdefghijkmnpqrstuvwxyz23456789");
        const claimed = await put(`codes/${code}`, {room, createdAt: now()});
        if(!claimed.ok) continue; // code already taken
        const wrote = await put(`sessions/${room}/snap`, coordinationSnapshot(session));
        if(!wrote.ok) throw new Error("Could not share the session");
        team = {code, room, sessionId: session.id}; writeTeam(team);
        setState("live"); startStream();
        return status();
      }
      throw new Error("Could not create a team code");
    },
    async joinTeam(rawCode){
      if(!enabled) throw new Error("Team sync is not configured");
      const code = normalizeCode(rawCode);
      if(code.length !== 6) throw new Error("Enter the 6-character team code");
      const entry = await get(`codes/${code}`).catch(() => null);
      if(!entry?.room) throw new Error("No team session with that code");
      const remote = await get(`sessions/${entry.room}/snap`);
      if(!remote?.id) throw new Error("That team session has no data yet");
      stopStream();
      const mine = local.loadSession();
      if(mine && mine.id !== remote.id) local.clear();
      const merged = mergeRemote(remote, {force: true}) || local.loadSession();
      team = {code, room: entry.room, sessionId: remote.id}; writeTeam(team);
      startStream();
      return merged;
    },
    leaveTeam(){ stopStream(); team = null; writeTeam(null); setState("off"); }
  };
}
