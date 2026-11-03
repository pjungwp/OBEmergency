const DEFAULT_KEY = "ob-emergency-assist.session.v1";
const SCHEMA_VERSION = "1.0";

function clone(value){ return value == null ? value : JSON.parse(JSON.stringify(value)); }

export function createLocalSessionStore({key=DEFAULT_KEY,storage=globalThis.localStorage}={}){
  const listeners = new Set();
  const read = () => {
    try {
      const saved = JSON.parse(storage.getItem(key) || "null");
      if(!saved) return null;
      if(!Number.isInteger(saved.revision)) saved.revision = 0;
      if(!saved.schemaVersion) saved.schemaVersion = SCHEMA_VERSION;
      if(!Array.isArray(saved._actionEvents)) saved._actionEvents = [];
      return saved;
    }
    catch { return null; }
  };
  const write = value => storage.setItem(key, JSON.stringify(value));
  const emit = value => listeners.forEach(fn => fn(clone(value)));

  return {
    createSession(seed){
      const session = {
        ...clone(seed), schemaVersion:SCHEMA_VERSION, revision:0,
        _actionEvents:[{
          eventId:`created-${seed.id}`, sessionId:seed.id, taskId:null,
          type:"SESSION_CREATED", status:"active", actor:"local-device",
          occurredAt:new Date().toISOString(), schemaVersion:SCHEMA_VERSION,
          revision:0, simulationTimeMs:seed.mode === "simulation" ? 0 : null
        }]
      };
      write(session); emit(session); return clone(session);
    },
    loadSession(){ return clone(read()); },
    recordAction({event,nextState,expectedRevision}){
      const current = read();
      if(!current) return {applied:false,missing:true,session:null};
      const prior = current._actionEvents || [];
      if(prior.some(x => x.eventId === event.eventId)) return {applied:false,duplicate:true,session:clone(current)};
      if(expectedRevision !== current.revision || event.revision !== current.revision + 1) return {applied:false,conflict:true,session:clone(current)};
      const normalized = {
        eventId:event.eventId, sessionId:current.id, taskId:event.taskId ?? null,
        type:event.type, status:event.status ?? null, actor:event.actor || "local-device",
        occurredAt:event.occurredAt || new Date().toISOString(), schemaVersion:SCHEMA_VERSION,
        revision:event.revision, simulationTimeMs:event.simulationTimeMs ?? null,
        payload:clone(event.payload || {})
      };
      const saved = {...clone(nextState),schemaVersion:SCHEMA_VERSION,revision:normalized.revision,_actionEvents:[...prior,normalized]};
      write(saved); emit(saved); return {applied:true,session:clone(saved),event:clone(normalized)};
    },
    subscribe(listener){ listeners.add(listener); return () => listeners.delete(listener); },
    replaceAuthoritative(nextState){ write(clone(nextState)); emit(nextState); return clone(nextState); },
    clear(){ storage.removeItem(key); emit(null); }
  };
}
